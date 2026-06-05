"""Routes: /politicos"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import Condenacao, Mandato, Politico
from models.schemas import PaginatedResponse, PoliticoDetail, PoliticoSearchResult, StatsResponse

router = APIRouter(prefix="/politicos", tags=["Politicos"])


# ── Dependency: DB session ────────────────────────────────────────────────────

async def get_db() -> AsyncSession:
    """Dependency that provides an AsyncSession. Imported from main.py in production."""
    from main import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        yield session


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedResponse)
async def search_politicos(
    q: Optional[str] = Query(None, description="Nome, partido ou estado"),
    partido: Optional[str] = Query(None),
    sigla_uf: Optional[str] = Query(None),
    cargo: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Search politicians by name, party, or state.
    Returns paginated list.
    """
    stmt = select(Politico)

    if q:
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Politico.nome.ilike(term),
                Politico.nome_civil.ilike(term),
                Politico.partido.ilike(term),
                Politico.sigla_uf.ilike(term),
            )
        )
    if partido:
        stmt = stmt.where(Politico.partido.ilike(f"%{partido}%"))
    if sigla_uf:
        stmt = stmt.where(Politico.sigla_uf.ilike(sigla_uf))
    if cargo:
        stmt = stmt.where(Politico.cargo == cargo.upper())

    # Count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Paginate
    stmt = stmt.order_by(Politico.nome).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    politicos = result.scalars().all()

    return PaginatedResponse(
        data=[PoliticoSearchResult.model_validate(p) for p in politicos],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/destaque", response_model=List[PoliticoSearchResult])
async def get_destaques(
    limit: int = Query(6, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
):
    """
    Return featured politicians — those with most condenações or lowest transparency score.
    """
    stmt = (
        select(Politico)
        .order_by(Politico.total_condenacoes.desc(), Politico.score_transparencia.asc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [PoliticoSearchResult.model_validate(p) for p in result.scalars().all()]


@router.get("/{politico_id}", response_model=PoliticoDetail)
async def get_politico(
    politico_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Return full details for a politician including mandatos."""
    result = await db.execute(select(Politico).where(Politico.id == politico_id))
    politico = result.scalar_one_or_none()
    if not politico:
        raise HTTPException(status_code=404, detail="Político não encontrado")

    # Eager-load mandatos
    mandatos_result = await db.execute(
        select(Mandato).where(Mandato.politico_id == politico_id).order_by(Mandato.ano_inicio.desc())
    )
    politico.mandatos = mandatos_result.scalars().all()

    return PoliticoDetail.model_validate(politico)
