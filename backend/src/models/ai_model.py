from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AiModel(Base):
    __tablename__ = "ai_models"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    model_id: Mapped[str] = mapped_column(String(256), nullable=False)
    provider: Mapped[str] = mapped_column(String(128), nullable=False)
    endpoint_url: Mapped[str] = mapped_column(Text, nullable=False)
    # Encrypted API key
    api_key_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    context_length: Mapped[str] = mapped_column(String(64), nullable=False, default="128K tokens")
    # JSON list of capability strings
    capabilities_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # "connected" | "disconnected" | "error"
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="disconnected")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )
