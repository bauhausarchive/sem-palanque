"""
Crawler for the Câmara dos Deputados Open Data API.

Official docs: https://dadosabertos.camara.leg.br/swagger/api.html
Base URL: https://dadosabertos.camara.leg.br/api/v2
"""

from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timedelta
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

CAMARA_BASE_URL = "https://dadosabertos.camara.leg.br/api/v2"
DEFAULT_TIMEOUT = 30.0
DEFAULT_PAGE_SIZE = 100


class CamaraAPIClient:
    """Async HTTP client for the Câmara dos Deputados API v2."""

    def __init__(
        self,
        base_url: str = CAMARA_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=timeout,
            headers={
                "Accept": "application/json",
                "User-Agent": "FichaLimpaPlus/1.0 (transparencia politica; contact@fichalimpaplus.com.br)",
            },
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make a GET request; raise on HTTP errors; return parsed JSON."""
        resp = await self._client.get(path, params=params)
        resp.raise_for_status()
        return resp.json()

    # ── Deputados ────────────────────────────────────────────────────────────

    async def list_deputados(
        self,
        legislatura: Optional[int] = None,
        sigla_uf: Optional[str] = None,
        sigla_partido: Optional[str] = None,
        pagina: int = 1,
        itens: int = DEFAULT_PAGE_SIZE,
    ) -> Dict[str, Any]:
        """
        GET /deputados — List federal deputies.

        Returns the full API response including `dados` (list) and `links` (pagination).
        """
        params: Dict[str, Any] = {
            "pagina": pagina,
            "itens": itens,
            "ordem": "ASC",
            "ordenarPor": "nome",
        }
        if legislatura:
            params["idLegislatura"] = legislatura
        if sigla_uf:
            params["siglaUf"] = sigla_uf
        if sigla_partido:
            params["siglaPartido"] = sigla_partido

        return await self._get("/deputados", params=params)

    async def iter_all_deputados(
        self,
        legislatura: Optional[int] = None,
        sigla_uf: Optional[str] = None,
        sigla_partido: Optional[str] = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        """Iterate over all deputies across all pages."""
        pagina = 1
        while True:
            data = await self.list_deputados(
                legislatura=legislatura,
                sigla_uf=sigla_uf,
                sigla_partido=sigla_partido,
                pagina=pagina,
            )
            items = data.get("dados", [])
            if not items:
                break
            for item in items:
                yield item

            # Check if there's a next page
            links = data.get("links", [])
            has_next = any(link.get("rel") == "next" for link in links)
            if not has_next:
                break
            pagina += 1

    async def get_deputado(self, deputado_id: int) -> Dict[str, Any]:
        """
        GET /deputados/{id} — Detailed info for a single deputy.
        """
        data = await self._get(f"/deputados/{deputado_id}")
        return data.get("dados", {})

    # ── Discursos ────────────────────────────────────────────────────────────

    async def get_discursos(
        self,
        deputado_id: int,
        data_inicio: Optional[str] = None,
        data_fim: Optional[str] = None,
        pagina: int = 1,
        itens: int = DEFAULT_PAGE_SIZE,
    ) -> Dict[str, Any]:
        """
        GET /deputados/{id}/discursos — Parliamentary speeches.

        Args:
            data_inicio: ISO date string YYYY-MM-DD (inclusive).
            data_fim: ISO date string YYYY-MM-DD (inclusive).
        """
        params: Dict[str, Any] = {
            "pagina": pagina,
            "itens": itens,
            "ordenarPor": "dataHoraInicio",
            "ordem": "DESC",
        }
        if data_inicio:
            params["dataInicio"] = data_inicio
        if data_fim:
            params["dataFim"] = data_fim

        return await self._get(f"/deputados/{deputado_id}/discursos", params=params)

    async def iter_discursos(
        self,
        deputado_id: int,
        data_inicio: Optional[str] = None,
        data_fim: Optional[str] = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        """Iterate over all speech records for a deputy."""
        pagina = 1
        while True:
            data = await self.get_discursos(
                deputado_id,
                data_inicio=data_inicio,
                data_fim=data_fim,
                pagina=pagina,
            )
            items = data.get("dados", [])
            if not items:
                break
            for item in items:
                yield item
            links = data.get("links", [])
            if not any(link.get("rel") == "next" for link in links):
                break
            pagina += 1

    # ── Despesas (CEAP) ──────────────────────────────────────────────────────

    async def get_despesas(
        self,
        deputado_id: int,
        ano: Optional[int] = None,
        mes: Optional[int] = None,
        pagina: int = 1,
        itens: int = DEFAULT_PAGE_SIZE,
    ) -> Dict[str, Any]:
        """
        GET /deputados/{id}/despesas — CEAP (Cota para Exercício da Atividade Parlamentar) expenses.
        """
        params: Dict[str, Any] = {
            "pagina": pagina,
            "itens": itens,
            "ordenarPor": "ano",
            "ordem": "DESC",
        }
        if ano:
            params["ano"] = ano
        if mes:
            params["mes"] = mes

        return await self._get(f"/deputados/{deputado_id}/despesas", params=params)

    async def iter_despesas(
        self,
        deputado_id: int,
        ano: Optional[int] = None,
        mes: Optional[int] = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        """Iterate over all expense records for a deputy."""
        pagina = 1
        while True:
            data = await self.get_despesas(
                deputado_id,
                ano=ano,
                mes=mes,
                pagina=pagina,
            )
            items = data.get("dados", [])
            if not items:
                break
            for item in items:
                yield item
            links = data.get("links", [])
            if not any(link.get("rel") == "next" for link in links):
                break
            pagina += 1

    # ── Votações ─────────────────────────────────────────────────────────────

    async def get_votacoes(
        self,
        deputado_id: int,
        pagina: int = 1,
        itens: int = DEFAULT_PAGE_SIZE,
    ) -> Dict[str, Any]:
        """
        GET /deputados/{id}/votacoes — Voting record.
        """
        params = {"pagina": pagina, "itens": itens, "ordem": "DESC", "ordenarPor": "dataHoraVoto"}
        return await self._get(f"/deputados/{deputado_id}/votacoes", params=params)

    # ── Legislaturas ─────────────────────────────────────────────────────────

    async def get_legislatura_atual(self) -> int:
        """Return the ID of the current (most recent) legislature."""
        data = await self._get("/legislaturas", params={"ordem": "DESC", "ordenarPor": "id", "itens": 1})
        items = data.get("dados", [])
        if not items:
            raise RuntimeError("Could not determine current legislature from Câmara API")
        return items[0]["id"]


# ── Data normalisation helpers ───────────────────────────────────────────────

def normalize_deputado(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Map raw Câmara API deputy data to our internal schema."""
    return {
        "id_externo": str(raw.get("id", "")),
        "nome": raw.get("nome", ""),
        "partido": raw.get("siglaPartido", ""),
        "sigla_uf": raw.get("siglaUf", ""),
        "cargo": "DEPUTADO_FEDERAL",
        "url_foto": raw.get("urlFoto"),
        "email": raw.get("email"),
    }


def normalize_discurso(raw: Dict[str, Any], deputado_id: int) -> Dict[str, Any]:
    """Map raw Câmara API speech data to our internal schema."""
    return {
        "id_externo": raw.get("id", ""),
        "politico_id_externo": str(deputado_id),
        "data_hora_inicio": raw.get("dataHoraInicio"),
        "data_hora_fim": raw.get("dataHoraFim"),
        "sumario": raw.get("sumario", ""),
        "transcricao": raw.get("transcricaoOrdemDoTexto"),
        "keywords": raw.get("keywords", "").split(";") if raw.get("keywords") else [],
        "fase_evento": raw.get("faseEvento", {}).get("titulo") if isinstance(raw.get("faseEvento"), dict) else raw.get("faseEvento"),
        "tipo_discurso": raw.get("tipoDiscurso"),
        "url_texto": raw.get("urlTexto"),
    }


def normalize_despesa(raw: Dict[str, Any], deputado_id: int) -> Dict[str, Any]:
    """Map raw CEAP expense data to our internal schema."""
    return {
        "politico_id_externo": str(deputado_id),
        "ano": raw.get("ano", 0),
        "mes": raw.get("mes", 0),
        "tipo_despesa": raw.get("tipoDespesa", ""),
        "cnpj_cpf_fornecedor": raw.get("cnpjCpfFornecedor"),
        "nome_fornecedor": raw.get("nomeFornecedor"),
        "num_documento": raw.get("numDocumento"),
        "valor_documento": float(raw.get("valorDocumento", 0) or 0),
        "valor_liquido": float(raw.get("valorLiquido", 0) or 0),
        "url_documento": raw.get("urlDocumento"),
    }


# ── Standalone ingestion helper ──────────────────────────────────────────────

async def ingest_deputados(
    db_session,
    legislatura: Optional[int] = None,
    max_deputados: Optional[int] = None,
) -> int:
    """
    Fetch all deputies from the Câmara API and upsert into the database.
    Returns number of records processed.
    """
    from sqlalchemy import select
    from models.database import Politico

    client = CamaraAPIClient()
    count = 0
    try:
        async for raw in client.iter_all_deputados(legislatura=legislatura):
            normalized = normalize_deputado(raw)
            # Check existing
            result = await db_session.execute(
                select(Politico).where(Politico.id_externo == normalized["id_externo"])
            )
            existing = result.scalar_one_or_none()
            if existing:
                for k, v in normalized.items():
                    if v is not None:
                        setattr(existing, k, v)
            else:
                politico = Politico(**normalized)
                db_session.add(politico)
            count += 1
            if max_deputados and count >= max_deputados:
                break
        await db_session.commit()
    finally:
        await client.close()

    logger.info(f"Ingested {count} deputies from Câmara API.")
    return count
