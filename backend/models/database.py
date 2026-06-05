"""SQLAlchemy ORM models for politico-transparente."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

try:
    from pgvector.sqlalchemy import Vector
    PGVECTOR_AVAILABLE = True
except ImportError:
    PGVECTOR_AVAILABLE = False


class Base(DeclarativeBase):
    pass


class Politico(Base):
    __tablename__ = "politicos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # Câmara/Senado internal ID
    id_externo: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)
    nome: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    nome_civil: Mapped[Optional[str]] = mapped_column(String(255))
    cpf: Mapped[Optional[str]] = mapped_column(String(14), unique=True, nullable=True)
    partido: Mapped[str] = mapped_column(String(50), nullable=False)
    sigla_uf: Mapped[str] = mapped_column(String(2), nullable=False)
    cargo: Mapped[str] = mapped_column(String(50), nullable=False)  # DEPUTADO_FEDERAL, SENADOR...
    legislatura_atual: Mapped[Optional[int]] = mapped_column(Integer)
    url_foto: Mapped[Optional[str]] = mapped_column(String(500))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    telefone: Mapped[Optional[str]] = mapped_column(String(30))
    redes_sociais: Mapped[Optional[dict]] = mapped_column(JSONB)
    score_transparencia: Mapped[float] = mapped_column(Float, default=50.0)
    total_condenacoes: Mapped[int] = mapped_column(Integer, default=0)
    total_processos: Mapped[int] = mapped_column(Integer, default=0)
    total_gastos_ceap: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    discursos: Mapped[List["Discurso"]] = relationship(back_populates="politico", lazy="select")
    gastos: Mapped[List["Gasto"]] = relationship(back_populates="politico", lazy="select")
    condenacoes: Mapped[List["Condenacao"]] = relationship(back_populates="politico", lazy="select")
    mandatos: Mapped[List["Mandato"]] = relationship(back_populates="politico", lazy="select")
    promessas: Mapped[List["Promessa"]] = relationship(back_populates="politico", lazy="select")


class Mandato(Base):
    __tablename__ = "mandatos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    politico_id: Mapped[int] = mapped_column(Integer, ForeignKey("politicos.id"), nullable=False)
    cargo: Mapped[str] = mapped_column(String(50), nullable=False)
    partido: Mapped[str] = mapped_column(String(50), nullable=False)
    sigla_uf: Mapped[str] = mapped_column(String(2), nullable=False)
    ano_inicio: Mapped[int] = mapped_column(Integer, nullable=False)
    ano_fim: Mapped[Optional[int]] = mapped_column(Integer)

    politico: Mapped["Politico"] = relationship(back_populates="mandatos")


class Discurso(Base):
    __tablename__ = "discursos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    politico_id: Mapped[int] = mapped_column(Integer, ForeignKey("politicos.id"), nullable=False, index=True)
    id_externo: Mapped[Optional[str]] = mapped_column(String(100))
    data_hora_inicio: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    data_hora_fim: Mapped[Optional[datetime]] = mapped_column(DateTime)
    sumario: Mapped[str] = mapped_column(Text, nullable=False)
    transcricao: Mapped[Optional[str]] = mapped_column(Text)
    keywords: Mapped[Optional[list]] = mapped_column(ARRAY(String))
    fase_evento: Mapped[Optional[str]] = mapped_column(String(100))
    tipo_discurso: Mapped[Optional[str]] = mapped_column(String(50))
    url_texto: Mapped[Optional[str]] = mapped_column(String(500))
    # pgvector embedding for semantic search
    embedding: Mapped[Optional[list]] = mapped_column(
        Vector(384) if PGVECTOR_AVAILABLE else JSONB,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    politico: Mapped["Politico"] = relationship(back_populates="discursos")


class Promessa(Base):
    __tablename__ = "promessas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    politico_id: Mapped[int] = mapped_column(Integer, ForeignKey("politicos.id"), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    fonte: Mapped[str] = mapped_column(String(50), nullable=False)
    data_promessa: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    tema: Mapped[Optional[str]] = mapped_column(String(100))
    cumprida: Mapped[Optional[bool]] = mapped_column(Boolean)
    embedding: Mapped[Optional[list]] = mapped_column(
        Vector(384) if PGVECTOR_AVAILABLE else JSONB,
        nullable=True,
    )

    politico: Mapped["Politico"] = relationship(back_populates="promessas")


class Gasto(Base):
    __tablename__ = "gastos"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    politico_id: Mapped[int] = mapped_column(Integer, ForeignKey("politicos.id"), nullable=False, index=True)
    ano: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    mes: Mapped[int] = mapped_column(Integer, nullable=False)
    tipo_despesa: Mapped[str] = mapped_column(String(200), nullable=False)
    cnpj_cpf_fornecedor: Mapped[Optional[str]] = mapped_column(String(20))
    nome_fornecedor: Mapped[Optional[str]] = mapped_column(String(255))
    num_documento: Mapped[Optional[str]] = mapped_column(String(100))
    valor_documento: Mapped[float] = mapped_column(Float, default=0.0)
    valor_liquido: Mapped[float] = mapped_column(Float, default=0.0)
    url_documento: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    politico: Mapped["Politico"] = relationship(back_populates="gastos")


class Condenacao(Base):
    __tablename__ = "condenacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    politico_id: Mapped[int] = mapped_column(Integer, ForeignKey("politicos.id"), nullable=False, index=True)
    orgao: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    data_decisao: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    data_transito_julgado: Mapped[Optional[datetime]] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    pena: Mapped[Optional[str]] = mapped_column(Text)
    processo: Mapped[Optional[str]] = mapped_column(String(100))
    url_decisao: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    politico: Mapped["Politico"] = relationship(back_populates="condenacoes")
