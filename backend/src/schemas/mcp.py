from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, HttpUrl


# ─── MCP Server schemas ─────────────────────────────────────────────────────

class McpServerCreate(BaseModel):
    name: str
    category: str = "General"
    description: str = ""
    server_url: str
    transport: str = "http"  # "http" | "sse" | "stdio"
    stdio_command: Optional[str] = None
    auth_token: Optional[str] = None   # plaintext on input; encrypted in DB
    config_json: Optional[str] = None
    environment: str = "Development"


class McpServerUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    server_url: Optional[str] = None
    transport: Optional[str] = None
    stdio_command: Optional[str] = None
    auth_token: Optional[str] = None
    config_json: Optional[str] = None
    environment: Optional[str] = None
    status: Optional[str] = None


class McpToolSchema(BaseModel):
    name: str
    description: str
    input_schema: Optional[dict[str, Any]] = None


class McpServerOut(BaseModel):
    id: str
    name: str
    category: str
    description: str
    server_url: str
    transport: str
    stdio_command: Optional[str] = None
    has_auth_token: bool
    config_json: Optional[str] = None
    status: str
    environment: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class McpTestResult(BaseModel):
    success: bool
    latency_ms: Optional[float] = None
    server_name: Optional[str] = None
    server_version: Optional[str] = None
    protocol_version: Optional[str] = None
    error: Optional[str] = None


class McpToolsResult(BaseModel):
    success: bool
    tools: list[McpToolSchema] = []
    error: Optional[str] = None
