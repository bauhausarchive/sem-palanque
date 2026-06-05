"""
CEAP (Cota para o Exercício da Atividade Parlamentar) crawler.

This module fetches CEAP expense data via the Câmara API
(GET /deputados/{id}/despesas) and also from the Portal da Transparência
bulk CSV downloads.

Portal bulk data: https://www.camara.leg.br/cotas/index.html
Each year has a ZIP with a large CSV, e.g.:
https://www.camara.leg.br/cotas/Ano-{year}.zip
"""

from __future__ import annotations

import csv
import io
import logging
import zipfile
from pathlib import Path
from typing import AsyncIterator, Dict, Generator, List, Optional

import httpx

logger = logging.getLogger(__name__)

CEAP_BULK_BASE = "https://www.camara.leg.br/cotas"
DEFAULT_TIMEOUT = 120.0


class CEAPCrawler:
    """
    Fetches CEAP data either via the Câmara API (per-deputy, paginated)
    or via bulk annual ZIP downloads (more efficient for full ingestion).
    """

    def __init__(self, data_dir: str = "/tmp/ceap_data") -> None:
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._client = httpx.AsyncClient(
            timeout=DEFAULT_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": "FichaLimpaPlus/1.0"},
        )

    async def close(self) -> None:
        await self._client.aclose()

    # ── Bulk annual download ─────────────────────────────────────────────────

    async def download_annual_zip(self, ano: int) -> Path:
        """
        Download the annual CEAP bulk ZIP.
        URL: https://www.camara.leg.br/cotas/Ano-{ano}.zip
        """
        filename = f"Ano-{ano}.zip"
        url = f"{CEAP_BULK_BASE}/{filename}"
        dest = self.data_dir / filename

        if dest.exists():
            logger.info(f"CEAP annual file cached: {dest}")
            return dest

        logger.info(f"Downloading CEAP annual data: {url}")
        async with self._client.stream("GET", url) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    f.write(chunk)
        logger.info(f"CEAP download complete: {dest} ({dest.stat().st_size / 1e6:.1f} MB)")
        return dest

    def iter_despesas_from_zip(
        self,
        zip_path: Path,
        nome_parlamentar: Optional[str] = None,
        cpf: Optional[str] = None,
    ) -> Generator[Dict[str, str], None, None]:
        """
        Parse CEAP expenses from an annual ZIP file.
        Optionally filter by parliamentarian name or CPF.
        """
        with zipfile.ZipFile(zip_path, "r") as zf:
            csv_names = [n for n in zf.namelist() if n.endswith(".csv")]
            if not csv_names:
                raise ValueError(f"No CSV in CEAP ZIP: {zip_path}")

            for csv_name in csv_names:
                with zf.open(csv_name) as f:
                    # CEAP CSV: semicolon-delimited, UTF-8 or latin-1
                    for encoding in ("utf-8-sig", "latin-1"):
                        try:
                            f.seek(0)
                            text = io.TextIOWrapper(f, encoding=encoding)
                            reader = csv.DictReader(text, delimiter=";")
                            for row in reader:
                                # Filter
                                if nome_parlamentar:
                                    row_name = row.get("txNomeParlamentar", "").upper()
                                    if nome_parlamentar.upper() not in row_name:
                                        continue
                                if cpf:
                                    row_cpf = row.get("cpf", "").replace(".", "").replace("-", "")
                                    if cpf.replace(".", "").replace("-", "") not in row_cpf:
                                        continue
                                yield self.normalize_despesa(row)
                            break  # encoding worked
                        except UnicodeDecodeError:
                            continue

    @staticmethod
    def normalize_despesa(row: Dict[str, str]) -> Dict[str, str]:
        """
        Map a raw CEAP CSV row to our internal Gasto schema.

        Key CEAP CSV columns:
        - txNomeParlamentar / nomeParlamentar
        - cpf
        - idecadastro (deputy ID)
        - nuCarteiraParlamentar
        - nuLegislatura
        - sgUF
        - sgPartido
        - codLegislatura
        - numMes
        - numAno
        - indTipoDocumento
        - datEmissao
        - txtDescricao (tipo de despesa)
        - txtFornecedor
        - txtCNPJCPF
        - txtNumero
        - indTipoDocumento
        - codDocumento
        - vlrDocumento
        - vlrGlosa
        - vlrLiquido
        - numRessarcimento
        - urlDocumento
        """
        def to_float(s: str) -> float:
            try:
                return float(s.replace(",", ".").strip())
            except (ValueError, AttributeError):
                return 0.0

        return {
            "nome_parlamentar": row.get("txNomeParlamentar") or row.get("nomeParlamentar", ""),
            "cpf": row.get("cpf", ""),
            "id_externo_camara": row.get("idecadastro") or row.get("nuDeputadoId", ""),
            "sigla_uf": row.get("sgUF", ""),
            "partido": row.get("sgPartido", ""),
            "ano": row.get("numAno") or row.get("ano", ""),
            "mes": row.get("numMes") or row.get("mes", ""),
            "tipo_despesa": row.get("txtDescricao") or row.get("tipoDespesa", ""),
            "cnpj_cpf_fornecedor": row.get("txtCNPJCPF") or row.get("cnpjCpfFornecedor", ""),
            "nome_fornecedor": row.get("txtFornecedor") or row.get("fornecedor", ""),
            "num_documento": row.get("txtNumero") or row.get("numDocumento", ""),
            "valor_documento": to_float(row.get("vlrDocumento") or row.get("valorDocumento", "0")),
            "valor_liquido": to_float(row.get("vlrLiquido") or row.get("valorLiquido", "0")),
            "url_documento": row.get("urlDocumento", ""),
        }

    # ── Per-deputy API-based ingestion ───────────────────────────────────────

    async def ingest_despesas_via_api(
        self,
        db_session,
        politico_id: int,
        id_externo_camara: int,
        ano: Optional[int] = None,
    ) -> int:
        """
        Use the Câmara API to fetch and persist expenses for a specific deputy.
        Returns number of records inserted.
        """
        from crawlers.camara_api import CamaraAPIClient
        from models.database import Gasto

        client = CamaraAPIClient()
        count = 0
        try:
            async for raw in client.iter_despesas(id_externo_camara, ano=ano):
                gasto = Gasto(
                    politico_id=politico_id,
                    ano=raw.get("ano", 0),
                    mes=raw.get("mes", 0),
                    tipo_despesa=raw.get("tipoDespesa", ""),
                    cnpj_cpf_fornecedor=raw.get("cnpjCpfFornecedor"),
                    nome_fornecedor=raw.get("nomeFornecedor"),
                    num_documento=raw.get("numDocumento"),
                    valor_documento=float(raw.get("valorDocumento") or 0),
                    valor_liquido=float(raw.get("valorLiquido") or 0),
                    url_documento=raw.get("urlDocumento"),
                )
                db_session.add(gasto)
                count += 1
            await db_session.commit()
        finally:
            await client.close()

        return count
