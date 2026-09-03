from __future__ import annotations

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool, StaticPool

from src.core.config import settings

_log = logging.getLogger("mcpier")

SQLITE_FALLBACK_URL = "sqlite+aiosqlite:///./mcpier.db"


def _build_engine(url: str):
    if url.startswith("sqlite"):
        return create_async_engine(
            url,
            connect_args={"check_same_thread": False},
            echo=False,
        )
    # Supabase / PostgreSQL (use NullPool for transaction-mode pooler on port 6543)
    return create_async_engine(
        url,
        poolclass=NullPool,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        },
        echo=False,
    )


engine = _build_engine(settings.DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
db_mode = "postgres" if not settings.DATABASE_URL.startswith("sqlite") else "sqlite"


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def create_all_tables() -> None:
    """Create all ORM-defined tables. If configured DB fails, auto-fallback to SQLite."""
    global engine, AsyncSessionLocal, db_mode

    # Import all models so they register on Base.metadata
    import src.models.mcp_server  # noqa: F401
    import src.models.ai_model    # noqa: F401
    import src.models.chat        # noqa: F401
    import src.models.task        # noqa: F401

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        _log.info(f"✅ Database tables created successfully ({db_mode} mode)")
    except Exception as exc:
        if db_mode != "sqlite":
            _log.warning(
                f"⚠️  Postgres/Supabase unreachable ({exc}). Falling back to local SQLite ({SQLITE_FALLBACK_URL})..."
            )
            engine = _build_engine(SQLITE_FALLBACK_URL)
            AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
            db_mode = "sqlite"

            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            _log.info("✅ Local SQLite database tables ready (./mcpier.db)")
        else:
            raise
