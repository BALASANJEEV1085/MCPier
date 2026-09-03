from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    # "pending" | "running" | "completed" | "failed"
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_ref: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    # JSON list of MCP server IDs used in this task
    mcp_ids_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSON list of step objects { id, label, status, detail }
    steps_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    runtime: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )
