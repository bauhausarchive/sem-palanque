"""Routes: /politicos/{id}/gastos"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import Gasto, Politico
from models.schemas import GastoResumido, GastoSchema, GastosPorMes, PaginatedResponse

router = APIRouter(tags=["Gastos"])


async def get_db() -> AsyncSession:
    from main import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        yield session


@router.get("/politicos/{politico_id}/gastos", response_model=PaginatedResponse)
async def get_gastos(
    politico_id: int,
    ano: Optional[int] = Query(None),
    mes: Optional[int] = Query(None, ge=1, le=12),
    tipo_despesa: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Return paginated CEAP expenses for a politician."""
    pol = await db.execute(select(Politico).where(Politico.id == politico_id))
    if not pol.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Político não encontrado")

    stmt = select(Gasto).where(Gasto.politico_id == politico_id)
    if ano:
        stmt = stmt.where(Gasto.ano == ano)
    if mes:
        stmt = stmt.where(Gasto.mes == mes)
    if tipo_despesa:
        stmt = stmt.where(Gasto.tipo_despesa.ilike(f"%{tipo_despesa}%"))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Gasto.ano.desc(), Gasto.mes.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    gastos = result.scalars().all()

    return PaginatedResponse(
        data=[GastoSchema.model_validate(g) for g in gastos],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/politicos/{politico_id}/gastos/resumo", response_model=List[GastoResumido])
async def get_gastos_resumo(
    politico_id: int,
    ano: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Return expenses grouped by type (tipoDespesa) with totals and percentages.
    """
    stmt = (
        select(
            Gasto.tipo_despesa,
            func.sum(Gasto.valor_liquido).label("total"),
            func.count(Gasto.id).label("quantidade"),
        )
        .where(Gasto.politico_id == politico_id)
        .group_by(Gasto.tipo_despesa)
        .order_by(func.sum(Gasto.valor_liquido).desc())
    )
    if ano:
        stmt = stmt.where(Gasto.ano == ano)

    result = await db.execute(stmt)
    rows = result.all()

    grand_total = sum(r.total for r in rows) or 1.0

    return [
        GastoResumido(
            tipo_despesa=r.tipo_despesa,
            total=float(r.total),
            quantidade=int(r.quantidade),
            percentual=round(float(r.total) / grand_total * 100, 2),
        )
        for r in rows
    ]


@router.get("/politicos/{politico_id}/gastos/por-mes", response_model=List[GastosPorMes])
async def get_gastos_por_mes(
    politico_id: int,
    anos: Optional[str] = Query(None, description="Comma-separated list of years, e.g. 2022,2023"),
    db: AsyncSession = Depends(get_db),
):
    """Return total expenses grouped by year/month."""
    stmt = (
        select(
            Gasto.ano,
            Gasto.mes,
            func.sum(Gasto.valor_liquido).label("total"),
        )
        .where(Gasto.politico_id == politico_id)
        .group_by(Gasto.ano, Gasto.mes)
        .order_by(Gasto.ano, Gasto.mes)
    )

    if anos:
        try:
            year_list = [int(a.strip()) for a in anos.split(",")]
            stmt = stmt.where(Gasto.ano.in_(year_list))
        except ValueError:
            raise HTTPException(status_code=422, detail="'anos' deve ser lista de anos separados por vírgula")

    result = await db.execute(stmt)
    return [
        GastosPorMes(ano=r.ano, mes=r.mes, total=float(r.total))
        for r in result.all()
    ]
