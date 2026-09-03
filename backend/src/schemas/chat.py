from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class ChatToolCallOut(BaseModel):
    id: str
    tool_name: str
    server_name: str
    arguments: Any
    output: Optional[str] = None
    status: str
    duration_ms: Optional[float] = None


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    tool_calls: list[ChatToolCallOut] = []
    thinking_content: Optional[str] = None
    model_used: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionCreate(BaseModel):
    title: str = "New Agent Chat"
    model_ref: str = ""
    mcp_server_ids: list[str] = []


class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    model_ref: Optional[str] = None
    mcp_server_ids: Optional[list[str]] = None


class ChatSessionOut(BaseModel):
    id: str
    title: str
    model_ref: str
    mcp_server_ids: list[str] = []
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


class ChatSessionDetailOut(ChatSessionOut):
    messages: list[ChatMessageOut] = []


class SendMessageRequest(BaseModel):
    content: str
    model_id: Optional[str] = None           # override session model
    mcp_server_ids: Optional[list[str]] = None  # override session MCPs
    stream: bool = True
