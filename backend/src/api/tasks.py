from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.db import get_db
from src.models.task import Task
from src.schemas.task import TaskCreate, TaskOut, TaskStepCreate, TaskUpdate

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


def _to_out(t: Task) -> TaskOut:
    mcp_ids: list[str] = []
    steps: list[TaskStepCreate] = []
    try:
        mcp_ids = json.loads(t.mcp_ids_json) if t.mcp_ids_json else []
    except Exception:
        pass
    try:
        steps = [TaskStepCreate(**s) for s in (json.loads(t.steps_json) if t.steps_json else [])]
    except Exception:
        pass

    return TaskOut(
        id=t.id,
        name=t.name,
        status=t.status,
        prompt=t.prompt,
        model_ref=t.model_ref,
        mcp_server_ids=mcp_ids,
        steps=steps,
        runtime=t.runtime,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


@router.get("", response_model=list[TaskOut])
async def list_tasks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).order_by(Task.created_at.desc()))
    return [_to_out(t) for t in result.scalars().all()]


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate, db: AsyncSession = Depends(get_db)):
    task = Task(
        name=payload.name,
        prompt=payload.prompt,
        model_ref=payload.model_ref,
        mcp_ids_json=json.dumps(payload.mcp_server_ids),
        steps_json=json.dumps([s.model_dump() for s in payload.steps]),
        status="pending",
    )
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return _to_out(task)


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    t = await db.get(Task, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return _to_out(t)


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(task_id: str, payload: TaskUpdate, db: AsyncSession = Depends(get_db)):
    t = await db.get(Task, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.name is not None:
        t.name = payload.name
    if payload.status is not None:
        t.status = payload.status
    if payload.model_ref is not None:
        t.model_ref = payload.model_ref
    if payload.mcp_server_ids is not None:
        t.mcp_ids_json = json.dumps(payload.mcp_server_ids)
    if payload.steps is not None:
        t.steps_json = json.dumps([s.model_dump() for s in payload.steps])
    if payload.runtime is not None:
        t.runtime = payload.runtime

    await db.flush()
    await db.refresh(t)
    return _to_out(t)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, db: AsyncSession = Depends(get_db)):
    t = await db.get(Task, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(t)
