from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TaskStepCreate(BaseModel):
    id: str
    label: str
    status: str = "pending"
    detail: Optional[str] = None


class TaskCreate(BaseModel):
    name: str
    prompt: Optional[str] = None
    model_ref: str = ""
    mcp_server_ids: list[str] = []
    steps: list[TaskStepCreate] = []


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    model_ref: Optional[str] = None
    mcp_server_ids: Optional[list[str]] = None
    steps: Optional[list[TaskStepCreate]] = None
    runtime: Optional[str] = None


class TaskOut(BaseModel):
    id: str
    name: str
    status: str
    prompt: Optional[str] = None
    model_ref: str
    mcp_server_ids: list[str] = []
    steps: list[TaskStepCreate] = []
    runtime: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
