"""
FichaLimpa+ — FastAPI backend entry point.

Run with:
    uvicorn main:app --reload --port 8000
"""

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from models.database import Base
from models.schemas import StatsResponse
from routers import condenacoes, discursos, gastos, politicos

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ── Database ─────────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/politico_transparente",
)

engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("ENVIRONMENT", "development") == "development",
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup (dev only); teardown on shutdown."""
    logger.info("Starting FichaLimpa+ API...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready.")
    yield
    logger.info("Shutting down...")
    await engine.dispose()


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="FichaLimpa+ API",
    description=(
        "Plataforma de transparência política brasileira. "
        "Dados abertos da Câmara, Senado, TSE, CNJ, CNIA e TCU."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:3001,https://fichalimpaplus.github.io",
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(politicos.router)
app.include_router(discursos.router)
app.include_router(gastos.router)
app.include_router(condenacoes.router)

# ── Extra routes ──────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "FichaLimpa+ API",
        "version": "0.1.0",
        "docs": "/docs",
        "status": "ok",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/stats", response_model=StatsResponse, tags=["Stats"])
async def get_stats():
    """Return aggregate statistics about the monitored politicians."""
    from sqlalchemy import func, select
    from models.database import Condenacao, Gasto, Politico

    async with AsyncSessionLocal() as db:
        total_pol = (await db.execute(select(func.count(Politico.id)))).scalar_one()
        total_cond = (
            await db.execute(
                select(func.count(func.distinct(Condenacao.politico_id)))
            )
        ).scalar_one()
        total_proc = (
            await db.execute(
                select(func.count(Condenacao.id)).where(Condenacao.status == "em_recurso")
            )
        ).scalar_one()
        total_gastos = (
            await db.execute(select(func.sum(Gasto.valor_liquido)))
        ).scalar_one() or 0.0

    return StatsResponse(
        total_politicos=total_pol,
        total_condenados=total_cond,
        total_processos=total_proc,
        total_gastos_ceap=float(total_gastos),
        ultima_atualizacao=datetime.utcnow(),
    )
