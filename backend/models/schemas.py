"""Pydantic v2 schemas for request/response validation."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Mandato ──────────────────────────────────────────────────────────────────

class MandatoSchema(BaseModel):
    cargo: str
    partido: str
    sigla_uf: str
    ano_inicio: int
    ano_fim: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# ── Politico ─────────────────────────────────────────────────────────────────

class PoliticoBase(BaseModel):
    nome: str
    nome_civil: Optional[str] = None
    partido: str
    sigla_uf: str
    cargo: str
    url_foto: Optional[str] = None


class PoliticoSearchResult(PoliticoBase):
    id: int
    total_condenacoes: int = 0
    score_transparencia: float = 50.0

    model_config = ConfigDict(from_attributes=True)


class PoliticoDetail(PoliticoBase):
    id: int
    cpf: Optional[str] = None
    legislatura_atual: Optional[int] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    redes_sociais: Optional[Dict[str, Any]] = None
    score_transparencia: float
    total_condenacoes: int
    total_processos: int
    total_gastos_ceap: float
    mandatos: List[MandatoSchema] = []

    model_config = ConfigDict(from_attributes=True)


# ── Discurso ─────────────────────────────────────────────────────────────────

class DiscursoSchema(BaseModel):
    id: int
    politico_id: int
    data_hora_inicio: datetime
    data_hora_fim: Optional[datetime] = None
    sumario: str
    transcricao: Optional[str] = None
    keywords: Optional[List[str]] = None
    fase_evento: Optional[str] = None
    tipo_discurso: Optional[str] = None
    url_texto: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ── Promessa ─────────────────────────────────────────────────────────────────

class PromessaSchema(BaseModel):
    id: int
    politico_id: int
    descricao: str
    fonte: str
    data_promessa: datetime
    tema: Optional[str] = None
    cumprida: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


# ── Comparação NLP ────────────────────────────────────────────────────────────

class ComparacaoRequest(BaseModel):
    politico_id: int
    promessas: List[str] = Field(..., min_length=1, max_length=20)
    discursos_ids: Optional[List[int]] = None
    limit_discursos: int = Field(default=50, le=200)


class DiscursoRelacionado(BaseModel):
    discurso: DiscursoSchema
    similaridade: float
    tipo: str  # confirmacao | contradicao | neutro
    trecho_destacado: Optional[str] = None


class ComparacaoResult(BaseModel):
    promessa: PromessaSchema
    discursos_relacionados: List[DiscursoRelacionado]
    score_geral: float
    veredicto: str  # cumprida | contradita | sem_evidencia


# ── Gastos ───────────────────────────────────────────────────────────────────

class GastoSchema(BaseModel):
    id: int
    politico_id: int
    ano: int
    mes: int
    tipo_despesa: str
    cnpj_cpf_fornecedor: Optional[str] = None
    nome_fornecedor: Optional[str] = None
    num_documento: Optional[str] = None
    valor_documento: float
    valor_liquido: float
    url_documento: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class GastoResumido(BaseModel):
    tipo_despesa: str
    total: float
    quantidade: int
    percentual: float


class GastosPorMes(BaseModel):
    ano: int
    mes: int
    total: float


# ── Condenação ────────────────────────────────────────────────────────────────

class CondenacaoSchema(BaseModel):
    id: int
    politico_id: int
    orgao: str
    tipo: str
    descricao: str
    data_decisao: datetime
    data_transito_julgado: Optional[datetime] = None
    status: str
    pena: Optional[str] = None
    processo: Optional[str] = None
    url_decisao: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ── Generic response wrappers ─────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    data: List[Any]
    total: int
    page: int
    per_page: int


class StatsResponse(BaseModel):
    total_politicos: int
    total_condenados: int
    total_processos: int
    total_gastos_ceap: float
    ultima_atualizacao: datetime
