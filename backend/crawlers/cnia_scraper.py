"""
CNIA (Cadastro Nacional de Condenações Cíveis por Ato de Improbidade Administrativa) scraper.

Source: https://portaldatransparencia.gov.br/download-de-dados/cnia
The CGU provides bulk CSV downloads of the CNIA database updated monthly.

Data page: https://portaldatransparencia.gov.br/download-de-dados/cnia
Direct download: https://portaldatransparencia.gov.br/download-de-dados/cnia/{AAAAMM}_CNIA.zip
"""

from __future__ import annotations

import csv
import io
import logging
import re
import zipfile
from datetime import date, datetime
from pathlib import Path
from typing import Dict, Generator, List, Optional

import httpx

logger = logging.getLogger(__name__)

CNIA_BASE_URL = "https://portaldatransparencia.gov.br/download-de-dados/cnia"
DEFAULT_TIMEOUT = 90.0


class CNIAScraper:
    """
    Downloads and parses the CNIA bulk CSV from Portal da Transparência.
    """

    def __init__(self, data_dir: str = "/tmp/cnia_data") -> None:
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._client = httpx.AsyncClient(
            timeout=DEFAULT_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": "FichaLimpaPlus/1.0"},
        )

    async def close(self) -> None:
        await self._client.aclose()

    def _latest_yearmonth(self) -> str:
        """Return the most recent YYYYMM string (current month)."""
        today = date.today()
        return today.strftime("%Y%m")

    async def download_latest(self) -> Path:
        """
        Download the latest CNIA ZIP file.
        Tries the current month and falls back to the previous month if not available.
        """
        today = date.today()
        for delta in range(0, 3):  # try up to 3 months back
            if delta == 0:
                ym = today.strftime("%Y%m")
            else:
                # subtract months
                year = today.year
                month = today.month - delta
                while month <= 0:
                    month += 12
                    year -= 1
                ym = f"{year}{month:02d}"

            url = f"{CNIA_BASE_URL}/{ym}_CNIA.zip"
            dest = self.data_dir / f"{ym}_CNIA.zip"

            if dest.exists():
                logger.info(f"CNIA file cached: {dest}")
                return dest

            logger.info(f"Trying CNIA download: {url}")
            try:
                async with self._client.stream("GET", url) as resp:
                    if resp.status_code == 404:
                        logger.warning(f"CNIA file not found for {ym}, trying previous month...")
                        continue
                    resp.raise_for_status()
                    with open(dest, "wb") as f:
                        async for chunk in resp.aiter_bytes(chunk_size=65536):
                            f.write(chunk)
                logger.info(f"CNIA download complete: {dest}")
                return dest
            except httpx.HTTPStatusError:
                continue

        raise RuntimeError("Could not download any CNIA ZIP file from the last 3 months.")

    def iter_condenacoes(self, zip_path: Path) -> Generator[Dict[str, str], None, None]:
        """
        Parse CNIA CSV from the ZIP and yield normalised dicts.
        """
        with zipfile.ZipFile(zip_path, "r") as zf:
            csv_names = [n for n in zf.namelist() if n.endswith(".csv")]
            if not csv_names:
                raise ValueError(f"No CSV found in CNIA ZIP: {zip_path}")
            csv_name = csv_names[0]
            with zf.open(csv_name) as f:
                text = io.TextIOWrapper(f, encoding="latin-1")
                reader = csv.DictReader(text, delimiter=";")
                for row in reader:
                    yield self.normalize_condenacao(row)

    @staticmethod
    def normalize_condenacao(row: Dict[str, str]) -> Dict[str, str]:
        """
        Map a raw CNIA CSV row to our internal Condenacao schema.

        Known CNIA columns (may vary by year):
        - NOME_PESSOA
        - CPF_CNPJ (may be masked)
        - DATA_TRANSITO_JULGADO
        - TIPO_SANCAO
        - DESCRICAO_FATOS
        - ORGAO_JULGADOR
        - UF_ORGAO_JULGADOR
        - NUMERO_PROCESSO
        - ABRANGENCIA
        """
        def parse_date(s: str) -> Optional[str]:
            s = s.strip()
            for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
                try:
                    return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
                except ValueError:
                    continue
            return None

        return {
            "nome": row.get("NOME_PESSOA", "").strip().title(),
            "cpf_parcial": row.get("CPF_CNPJ", "").strip(),
            "orgao": row.get("ORGAO_JULGADOR", "").strip() or "TJ/Federal",
            "uf_orgao": row.get("UF_ORGAO_JULGADOR", "").strip(),
            "tipo": "improbidade",
            "descricao": (
                row.get("DESCRICAO_FATOS", "")
                or row.get("TIPO_SANCAO", "")
            ).strip(),
            "tipo_sancao": row.get("TIPO_SANCAO", "").strip(),
            "data_transito_julgado": parse_date(row.get("DATA_TRANSITO_JULGADO", "")),
            "processo": row.get("NUMERO_PROCESSO", "").strip(),
            "status": "transitada_julgado",
            "abrangencia": row.get("ABRANGENCIA", "").strip(),
        }

    async def search_by_cpf(self, cpf: str, zip_path: Optional[Path] = None) -> List[Dict[str, str]]:
        """
        Search CNIA records by CPF. Downloads latest if no zip_path given.
        CPF matching is done on the unmasked digits.
        """
        if zip_path is None:
            zip_path = await self.download_latest()

        cpf_digits = re.sub(r"\D", "", cpf)
        results = []
        for row in self.iter_condenacoes(zip_path):
            row_cpf = re.sub(r"\D", "", row.get("cpf_parcial", ""))
            # CNIA often masks middle digits — match on suffix/prefix
            if cpf_digits and (cpf_digits in row_cpf or row_cpf in cpf_digits):
                results.append(row)
        return results

    async def search_by_name(self, name: str, zip_path: Optional[Path] = None) -> List[Dict[str, str]]:
        """
        Search CNIA records by name (case-insensitive partial match).
        """
        if zip_path is None:
            zip_path = await self.download_latest()

        name_upper = name.strip().upper()
        results = []
        for row in self.iter_condenacoes(zip_path):
            row_name = row.get("nome", "").upper()
            if name_upper in row_name:
                results.append(row)
        return results
