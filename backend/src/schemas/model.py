from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ModelCreate(BaseModel):
    name: str                        # Display name: "Claude 3.7 Sonnet"
    model_id: str                    # API identifier: "claude-3-7-sonnet-20250219"
    provider: str                    # "Anthropic", "OpenAI", "Ollama", etc.
    endpoint_url: str                # "https://api.anthropic.com/v1"
    api_key: Optional[str] = None    # Plaintext on input; encrypted in DB
    context_length: str = "128K tokens"
    capabilities: list[str] = ["Code generation", "Tool calling", "Structured output"]


class ModelUpdate(BaseModel):
    name: Optional[str] = None
    model_id: Optional[str] = None
    provider: Optional[str] = None
    endpoint_url: Optional[str] = None
    api_key: Optional[str] = None
    context_length: Optional[str] = None
    capabilities: Optional[list[str]] = None
    status: Optional[str] = None


class ModelOut(BaseModel):
    id: str
    name: str
    model_id: str
    provider: str
    endpoint_url: str
    api_key_masked: Optional[str] = None  # masked value safe to show in UI
    context_length: str
    capabilities: list[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ModelTestResult(BaseModel):
    success: bool
    latency_ms: Optional[float] = None
    available_models: list[str] = []
    error: Optional[str] = None
