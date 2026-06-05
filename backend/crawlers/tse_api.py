"""
TSE DivulgaCand data loader.

The TSE does not have a REST API for candidate data — it provides bulk CSV/ZIP downloads
from the "Repositório de Dados Eleitorais":
https://dadosabertos.tse.jus.br/dataset/candidatos-2022

This module downloads, parses and normalises those files.
"""

from __future__ import annotations

import csv
import io
import logging
import zipfile
from pathlib import Path
from typing import AsyncIterator, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

TSE_BASE_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele"
DEFAULT_TIMEOUT = 120.0  # downloads can be large


class TSEDataLoader:
    """Downloads and parses TSE bulk data files."""

    # Available election years for candidate data
    AVAILABLE_YEARS = [2022, 2020, 2018, 2016, 2014]

    def __init__(self, data_dir: str = "/tmp/tse_data") -> None:
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._client = httpx.AsyncClient(
            timeout=DEFAULT_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": "FichaLimpaPlus/1.0"},
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def download_candidatos_zip(self, ano: int) -> Path:
        """
        Download the candidates ZIP file for a given election year.
        Returns the local path to the saved file.

        File name pattern: consulta_cand_{ano}.zip
        URL pattern: https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_{ano}.zip
        """
        filename = f"consulta_cand_{ano}.zip"
        url = f"{TSE_BASE_URL}/consulta_cand/{filename}"
        dest = self.data_dir / filename

        if dest.exists():
            logger.info(f"TSE file already cached: {dest}")
            return dest

        logger.info(f"Downloading TSE data: {url}")
        async with self._client.stream("GET", url) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    f.write(chunk)

        logger.info(f"TSE download complete: {dest} ({dest.stat().st_size / 1e6:.1f} MB)")
        return dest

    def iter_candidatos_csv(
        self,
        zip_path: Path,
        sigla_uf: Optional[str] = None,
        cargo_id: Optional[int] = None,
    ) -> AsyncIterator[Dict[str, str]]:
        """
        Parse candidate CSV files from a TSE ZIP archive.
        Filters by UF and cargo if provided.

        Yields dicts with raw TSE column names.
        """
        return self._iter_csv_from_zip(zip_path, sigla_uf=sigla_uf, cargo_id=cargo_id)

    def _iter_csv_from_zip(
        self,
        zip_path: Path,
        sigla_uf: Optional[str] = None,
        cargo_id: Optional[int] = None,
    ):
        """Synchronous generator that reads CSV rows from inside a ZIP."""
        with zipfile.ZipFile(zip_path, "r") as zf:
            for name in zf.namelist():
                # TSE uses files like consulta_cand_2022_BR.csv or consulta_cand_2022_SP.csv
                if not name.endswith(".csv"):
                    continue
                if sigla_uf and f"_{sigla_uf.upper()}.csv" not in name.upper():
                    # Try to load only the relevant UF file; if not found load all
                    if not name.endswith(f"_{sigla_uf.upper()}.csv"):
                        continue
                with zf.open(name) as f:
                    # TSE CSVs are semicolon-delimited, latin-1 encoded
                    text = io.TextIOWrapper(f, encoding="latin-1")
                    reader = csv.DictReader(text, delimiter=";")
                    for row in reader:
                        if cargo_id and row.get("CD_CARGO") != str(cargo_id):
                            continue
                        yield row

    # ── TSE Cargo codes ──────────────────────────────────────────────────────
    # 1  = Presidente
    # 3  = Governador
    # 5  = Senador
    # 6  = Deputado Federal
    # 7  = Deputado Estadual / Distrital
    # 11 = Prefeito
    # 13 = Vereador

    CARGO_DEPUTADO_FEDERAL = 6
    CARGO_SENADOR = 5
    CARGO_GOVERNADOR = 3
    CARGO_PREFEITO = 11

    # ── Normalisation ────────────────────────────────────────────────────────

    @staticmethod
    def normalize_candidato(row: Dict[str, str]) -> Dict[str, str]:
        """Convert raw TSE CSV row to our internal schema."""
        cargo_map = {
            "1": "PRESIDENTE",
            "3": "GOVERNADOR",
            "5": "SENADOR",
            "6": "DEPUTADO_FEDERAL",
            "7": "DEPUTADO_ESTADUAL",
            "11": "PREFEITO",
            "13": "VEREADOR",
        }
        cargo_codigo = row.get("CD_CARGO", "")
        return {
            "nome": row.get("NM_CANDIDATO", "").title(),
            "nome_civil": row.get("NM_CANDIDATO", "").title(),
            "cpf": row.get("NR_CPF_CANDIDATO", "").replace(".", "").replace("-", ""),
            "partido": row.get("SG_PARTIDO", ""),
            "sigla_uf": row.get("SG_UF", ""),
            "cargo": cargo_map.get(cargo_codigo, cargo_codigo),
            "situacao_candidatura": row.get("DS_SITUACAO_CANDIDATURA", ""),
            "situacao_turno": row.get("DS_SIT_TOT_TURNO", ""),
            "ano_eleicao": row.get("ANO_ELEICAO", ""),
            "numero_candidato": row.get("NR_CANDIDATO", ""),
            "email": row.get("NM_EMAIL", "").lower() if row.get("NM_EMAIL") else None,
        }

    # ── Bem declarado (patrimônio) ────────────────────────────────────────────

    async def download_bem_candidato_zip(self, ano: int) -> Path:
        """
        Download the declared assets ZIP for a given year.
        URL: https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_{ano}.zip
        """
        filename = f"bem_candidato_{ano}.zip"
        url = f"{TSE_BASE_URL}/bem_candidato/{filename}"
        dest = self.data_dir / filename

        if dest.exists():
            return dest

        logger.info(f"Downloading TSE bem_candidato: {url}")
        async with self._client.stream("GET", url) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    f.write(chunk)
        return dest

    @staticmethod
    def normalize_bem_declarado(row: Dict[str, str]) -> Dict[str, str]:
        """Parse a declared asset row."""
        return {
            "cpf": row.get("NR_CPF_CANDIDATO", "").replace(".", "").replace("-", ""),
            "tipo_bem": row.get("DS_TIPO_BEM_CANDIDATO", ""),
            "descricao": row.get("DS_BEM_CANDIDATO", ""),
            "valor": row.get("VR_BEM_CANDIDATO", "0").replace(",", "."),
            "ano_eleicao": row.get("ANO_ELEICAO", ""),
        }
