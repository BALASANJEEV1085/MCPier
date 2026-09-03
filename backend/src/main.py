from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.core.db import create_all_tables
from src.api.health import router as health_router
from src.api.mcp import router as mcp_router
from src.api.models import router as models_router
from src.api.chat import router as chat_router
from src.api.tasks import router as tasks_router


import logging
_log = logging.getLogger("mcpier")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables — log a warning if DB not yet configured
    try:
        await create_all_tables()
        _log.info("✅ Database tables ready")
    except Exception as exc:
        _log.warning(
            "⚠️  Could not connect to the database on startup — "
            "check DATABASE_URL in .env. Error: %s", exc
        )
    yield
    # Shutdown: nothing needed (connection pool is NullPool)


app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description=(
        "MCPier Backend API — manages MCP server connections, AI model configurations, "
        "streaming agent chat, and task orchestration."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(mcp_router)
app.include_router(models_router)
app.include_router(chat_router)
app.include_router(tasks_router)


@app.get("/")
async def root():
    return {
        "service": settings.APP_TITLE,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }
