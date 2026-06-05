"""Routes: /politicos/{id}/discursos  and  POST /discursos/comparar"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import Discurso, Politico, Promessa
from models.schemas import (
    ComparacaoRequest,
    ComparacaoResult,
    DiscursoRelacionado,
    DiscursoSchema,
    PaginatedResponse,
    PromessaSchema,
)
from services.nlp_service import NLPService, get_nlp_service

router = APIRouter(tags=["Discursos"])


async def get_db() -> AsyncSession:
    from main import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        yield session


# ── Discursos por político ───────────────────────────────────────────────────

@router.get("/politicos/{politico_id}/discursos", response_model=PaginatedResponse)
async def get_discursos(
    politico_id: int,
    data_inicio: Optional[str] = Query(None, description="YYYY-MM-DD"),
    data_fim: Optional[str] = Query(None, description="YYYY-MM-DD"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Return paginated list of speeches for a politician."""
    # Verify politician exists
    pol_result = await db.execute(select(Politico).where(Politico.id == politico_id))
    if not pol_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Político não encontrado")

    stmt = select(Discurso).where(Discurso.politico_id == politico_id)

    if data_inicio:
        try:
            dt_inicio = datetime.strptime(data_inicio, "%Y-%m-%d")
            stmt = stmt.where(Discurso.data_hora_inicio >= dt_inicio)
        except ValueError:
            raise HTTPException(status_code=422, detail="data_inicio inválida. Use YYYY-MM-DD")

    if data_fim:
        try:
            dt_fim = datetime.strptime(data_fim, "%Y-%m-%d")
            stmt = stmt.where(Discurso.data_hora_inicio <= dt_fim)
        except ValueError:
            raise HTTPException(status_code=422, detail="data_fim inválida. Use YYYY-MM-DD")

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Discurso.data_hora_inicio.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    discursos = result.scalars().all()

    return PaginatedResponse(
        data=[DiscursoSchema.model_validate(d) for d in discursos],
        total=total,
        page=page,
        per_page=per_page,
    )


# ── Promessas por político ───────────────────────────────────────────────────

@router.get("/politicos/{politico_id}/promessas", response_model=List[PromessaSchema])
async def get_promessas(
    politico_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Return all campaign promises for a politician."""
    result = await db.execute(
        select(Promessa)
        .where(Promessa.politico_id == politico_id)
        .order_by(Promessa.data_promessa.desc())
    )
    return [PromessaSchema.model_validate(p) for p in result.scalars().all()]


# ── NLP Comparison ──────────────────────────────────────────────────────────

@router.post("/discursos/comparar", response_model=List[ComparacaoResult])
async def comparar_discursos(
    payload: ComparacaoRequest,
    db: AsyncSession = Depends(get_db),
    nlp: NLPService = Depends(get_nlp_service),
):
    """
    Compare a list of campaign promises against all speeches for a politician.

    Uses sentence-transformers (BERTimbau/multilingual) to compute semantic
    similarity and classify each promise as cumprida, contradita, or sem_evidencia.
    """
    # Verify politician exists
    pol_result = await db.execute(select(Politico).where(Politico.id == payload.politico_id))
    if not pol_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Político não encontrado")

    # Fetch speeches
    stmt = (
        select(Discurso)
        .where(Discurso.politico_id == payload.politico_id)
        .order_by(Discurso.data_hora_inicio.desc())
        .limit(payload.limit_discursos)
    )
    if payload.discursos_ids:
        stmt = select(Discurso).where(
            Discurso.politico_id == payload.politico_id,
            Discurso.id.in_(payload.discursos_ids),
        )

    disc_result = await db.execute(stmt)
    discursos_db = disc_result.scalars().all()

    if not discursos_db:
        # No speeches → return sem_evidencia for all promises
        return [
            ComparacaoResult(
                promessa=_make_mock_promessa(p, payload.politico_id),
                discursos_relacionados=[],
                score_geral=0.0,
                veredicto="sem_evidencia",
            )
            for p in payload.promessas
        ]

    # Build speech dicts for NLP
    speeches_for_nlp = [
        {
            "id": d.id,
            "sumario": d.sumario or "",
            "transcricao": d.transcricao,
            "data_hora_inicio": d.data_hora_inicio.isoformat() if d.data_hora_inicio else "",
            "fase_evento": d.fase_evento,
        }
        for d in discursos_db
    ]

    # Run NLP comparison
    analyses = nlp.compare_promises_to_speeches(
        promises=payload.promessas,
        speeches=speeches_for_nlp,
        top_k=3,
    )

    # Build DB id → Discurso map
    disc_map = {d.id: d for d in discursos_db}

    results: List[ComparacaoResult] = []
    for i, analysis in enumerate(analyses):
        promise_text = payload.promessas[i]
        promessa_obj = _make_mock_promessa(promise_text, payload.politico_id)

        discursos_relacionados: List[DiscursoRelacionado] = []
        for pair in analysis.matched_pairs:
            disc = disc_map.get(pair.speech_id)
            if disc:
                discursos_relacionados.append(
                    DiscursoRelacionado(
                        discurso=DiscursoSchema.model_validate(disc),
                        similaridade=round(pair.similarity, 4),
                        tipo=pair.verdict,
                        trecho_destacado=pair.highlighted_excerpt,
                    )
                )

        results.append(
            ComparacaoResult(
                promessa=promessa_obj,
                discursos_relacionados=discursos_relacionados,
                score_geral=round(analysis.overall_score, 4),
                veredicto=analysis.veredicto,
            )
        )

    return results


def _make_mock_promessa(texto: str, politico_id: int) -> PromessaSchema:
    """Create a transient PromessaSchema for promises passed inline (not stored in DB)."""
    return PromessaSchema(
        id=0,
        politico_id=politico_id,
        descricao=texto,
        fonte="manual",
        data_promessa=datetime.now(),
        tema=None,
        cumprida=None,
    )
