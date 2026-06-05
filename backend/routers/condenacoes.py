"""Routes: /politicos/{id}/condenacoes"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import Condenacao, Politico
from models.schemas import CondenacaoSchema

router = APIRouter(tags=["Condenacoes"])


async def get_db() -> AsyncSession:
    from main import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        yield session


@router.get("/politicos/{politico_id}/condenacoes", response_model=List[CondenacaoSchema])
async def get_condenacoes(
    politico_id: int,
    status: Optional[str] = Query(None, description="transitada_julgado | em_recurso | extinta | cumprida"),
    tipo: Optional[str] = Query(None, description="improbidade | criminal | eleitoral | administrativa"),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all court convictions and sanctions for a politician.
    Sources: CNJ, TCU, TRE, STF, CNIA.
    """
    pol = await db.execute(select(Politico).where(Politico.id == politico_id))
    if not pol.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Político não encontrado")

    stmt = (
        select(Condenacao)
        .where(Condenacao.politico_id == politico_id)
        .order_by(Condenacao.data_decisao.desc())
    )
    if status:
        stmt = stmt.where(Condenacao.status == status)
    if tipo:
        stmt = stmt.where(Condenacao.tipo == tipo)

    result = await db.execute(stmt)
    return [CondenacaoSchema.model_validate(c) for c in result.scalars().all()]
