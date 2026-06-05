"""
Crawler for the Senado Federal Open Data API.

Official docs: https://legis.senado.leg.br/dadosabertos/docs/
Base URL: https://legis.senado.leg.br/dadosabertos
"""

from __future__ import annotations

import logging
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

SENADO_BASE_URL = "https://legis.senado.leg.br/dadosabertos"
DEFAULT_TIMEOUT = 30.0


class SenadoAPIClient:
    """Async HTTP client for the Senado Federal Open Data API."""

    def __init__(
        self,
        base_url: str = SENADO_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=timeout,
            headers={
                "Accept": "application/json",
                "User-Agent": "FichaLimpaPlus/1.0 (transparencia politica)",
            },
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        resp = await self._client.get(path, params=params)
        resp.raise_for_status()
        return resp.json()

    # ── Senadores ────────────────────────────────────────────────────────────

    async def list_senadores_em_exercicio(self) -> List[Dict[str, Any]]:
        """
        GET /senador/lista/atual — Current senators in office.
        Returns list of senators.
        """
        data = await self._get("/senador/lista/atual")
        # Response structure: ListaParlamentarEmExercicio > Parlamentares > Parlamentar
        parlamentares = (
            data
            .get("ListaParlamentarEmExercicio", {})
            .get("Parlamentares", {})
            .get("Parlamentar", [])
        )
        if isinstance(parlamentares, dict):
            parlamentares = [parlamentares]
        return parlamentares

    async def get_senador(self, codigo: int) -> Dict[str, Any]:
        """
        GET /senador/{codigo} — Detailed info for a senator.
        """
        data = await self._get(f"/senador/{codigo}")
        return (
            data
            .get("DetalheParlamentar", {})
            .get("Parlamentar", {})
        )

    # ── Discursos ────────────────────────────────────────────────────────────

    async def get_discursos_senador(
        self,
        codigo: int,
        casa: str = "SF",
        data_inicio: Optional[str] = None,
        data_fim: Optional[str] = None,
        numero_pagina: int = 1,
    ) -> Dict[str, Any]:
        """
        GET /senador/{codigo}/discursos — Speeches by a senator.

        Args:
            casa: 'SF' (Senado Federal) or 'CN' (Congresso Nacional).
            data_inicio: YYYYMMDD format.
            data_fim: YYYYMMDD format.
        """
        params: Dict[str, Any] = {
            "casa": casa,
            "numeroPagina": numero_pagina,
        }
        if data_inicio:
            params["dataInicio"] = data_inicio
        if data_fim:
            params["dataFim"] = data_fim

        return await self._get(f"/senador/{codigo}/discursos", params=params)

    async def iter_discursos_senador(
        self,
        codigo: int,
        data_inicio: Optional[str] = None,
        data_fim: Optional[str] = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        """Iterate over all speech records for a senator."""
        pagina = 1
        while True:
            data = await self.get_discursos_senador(
                codigo,
                data_inicio=data_inicio,
                data_fim=data_fim,
                numero_pagina=pagina,
            )
            # Nested path varies; try common paths
            discursos_container = (
                data
                .get("DiscursosParlamentar", {})
                .get("Parlamentar", {})
                .get("Pronunciamentos", {})
                .get("Pronunciamento", [])
            )
            if isinstance(discursos_container, dict):
                discursos_container = [discursos_container]
            if not discursos_container:
                break
            for item in discursos_container:
                yield item
            # Senado API paginates via totalPaginas
            total_str = (
                data
                .get("DiscursosParlamentar", {})
                .get("Paginacao", {})
                .get("TotalPaginas", "1")
            )
            try:
                total_pages = int(total_str)
            except (TypeError, ValueError):
                total_pages = 1
            if pagina >= total_pages:
                break
            pagina += 1

    # ── Votações ─────────────────────────────────────────────────────────────

    async def get_votacoes_senador(
        self,
        codigo: int,
        ano: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        GET /senador/{codigo}/votacoes — Voting record for a senator.
        """
        params: Dict[str, Any] = {}
        if ano:
            params["ano"] = ano
        return await self._get(f"/senador/{codigo}/votacoes", params=params)

    # ── Matérias (proposições) ────────────────────────────────────────────────

    async def search_materias(
        self,
        palavras_chave: str,
        ano_inicio: Optional[int] = None,
        ano_fim: Optional[int] = None,
        pagina: int = 1,
    ) -> Dict[str, Any]:
        """
        GET /materia/pesquisa/lista — Search legislative matters/bills.
        """
        params: Dict[str, Any] = {
            "palavrasChave": palavras_chave,
            "numeroPagina": pagina,
        }
        if ano_inicio:
            params["anoInicio"] = ano_inicio
        if ano_fim:
            params["anoFim"] = ano_fim
        return await self._get("/materia/pesquisa/lista", params=params)


# ── Data normalisation ───────────────────────────────────────────────────────

def normalize_senador(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Map raw Senado API senator data to our internal schema."""
    identificacao = raw.get("IdentificacaoParlamentar", {})
    mandato = raw.get("Mandato", {})
    partido_block = identificacao.get("SiglaPartidoParlamentarNaData", "") or identificacao.get("SiglaPartidoAtual", "")
    uf = identificacao.get("UfParlamentarNaData", "") or identificacao.get("UfNaturalidade", "")

    return {
        "id_externo": str(identificacao.get("CodigoParlamentar", "")),
        "nome": identificacao.get("NomeParlamentar", ""),
        "nome_civil": identificacao.get("NomeCompletoParlamentar"),
        "cargo": "SENADOR",
        "partido": partido_block,
        "sigla_uf": uf,
        "url_foto": identificacao.get("UrlFotoParlamentar"),
        "email": identificacao.get("EmailParlamentar"),
    }


def normalize_discurso_senador(raw: Dict[str, Any], senador_codigo: int) -> Dict[str, Any]:
    """Map raw Senado API speech to our internal schema."""
    return {
        "id_externo": raw.get("CodigoPronunciamento", ""),
        "politico_id_externo": str(senador_codigo),
        "data_hora_inicio": raw.get("DataPronunciamento"),
        "sumario": raw.get("TextoResumo") or raw.get("IndexacaoAutor") or "",
        "transcricao": raw.get("TextoIntegral"),
        "fase_evento": raw.get("Sessao", {}).get("NomeSessao") if isinstance(raw.get("Sessao"), dict) else None,
        "tipo_discurso": raw.get("TipoUsoDaPalavra"),
        "url_texto": raw.get("UrlTexto"),
        "keywords": (raw.get("Indexacao") or "").split(",") if raw.get("Indexacao") else [],
    }
