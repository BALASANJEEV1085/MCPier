from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class McpServer(Base):
    __tablename__ = "mcp_servers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    category: Mapped[str] = mapped_column(String(128), nullable=False, default="General")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    server_url: Mapped[str] = mapped_column(Text, nullable=False)
    # "http" | "sse" | "stdio"
    transport: Mapped[str] = mapped_column(String(32), nullable=False, default="http")
    # For stdio: command to spawn (e.g. "npx @modelcontextprotocol/server-github")
    stdio_command: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Encrypted bearer token / API key for the MCP server
    auth_token_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Additional config as JSON string (env vars, options, etc.)
    config_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # "connected" | "disconnected" | "error" | "connecting"
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="disconnected")
    environment: Mapped[str] = mapped_column(String(64), nullable=False, default="Development")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )
