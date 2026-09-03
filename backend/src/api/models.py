from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.crypto import decrypt, encrypt, mask
from src.core.db import get_db
from src.models.ai_model import AiModel
from src.schemas.model import ModelCreate, ModelOut, ModelTestResult, ModelUpdate
from src.services.model_service import test_model_connection

router = APIRouter(prefix="/api/models", tags=["AI Models"])


def _to_out(m: AiModel) -> ModelOut:
    plain_key = decrypt(m.api_key_enc) if m.api_key_enc else None
    capabilities: list[str] = []
    if m.capabilities_json:
        try:
            capabilities = json.loads(m.capabilities_json)
        except Exception:
            pass
    return ModelOut(
        id=m.id,
        name=m.name,
        model_id=m.model_id,
        provider=m.provider,
        endpoint_url=m.endpoint_url,
        api_key_masked=mask(plain_key) if plain_key else None,
        context_length=m.context_length,
        capabilities=capabilities,
        status=m.status,
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


@router.get("", response_model=list[ModelOut])
async def list_models(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AiModel).order_by(AiModel.created_at.desc()))
    return [_to_out(m) for m in result.scalars().all()]


@router.post("", response_model=ModelOut, status_code=status.HTTP_201_CREATED)
async def create_model(payload: ModelCreate, db: AsyncSession = Depends(get_db)):
    model = AiModel(
        name=payload.name,
        model_id=payload.model_id,
        provider=payload.provider,
        endpoint_url=payload.endpoint_url,
        api_key_enc=encrypt(payload.api_key) if payload.api_key else None,
        context_length=payload.context_length,
        capabilities_json=json.dumps(payload.capabilities),
        status="disconnected",
    )
    db.add(model)
    await db.flush()
    await db.refresh(model)
    return _to_out(model)


@router.get("/{model_id}", response_model=ModelOut)
async def get_model(model_id: str, db: AsyncSession = Depends(get_db)):
    m = await db.get(AiModel, model_id)
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    return _to_out(m)


@router.patch("/{model_id}", response_model=ModelOut)
async def update_model(model_id: str, payload: ModelUpdate, db: AsyncSession = Depends(get_db)):
    m = await db.get(AiModel, model_id)
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")

    if payload.name is not None:
        m.name = payload.name
    if payload.model_id is not None:
        m.model_id = payload.model_id
    if payload.provider is not None:
        m.provider = payload.provider
    if payload.endpoint_url is not None:
        m.endpoint_url = payload.endpoint_url
    if payload.api_key is not None:
        m.api_key_enc = encrypt(payload.api_key)
    if payload.context_length is not None:
        m.context_length = payload.context_length
    if payload.capabilities is not None:
        m.capabilities_json = json.dumps(payload.capabilities)
    if payload.status is not None:
        m.status = payload.status

    await db.flush()
    await db.refresh(m)
    return _to_out(m)


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(model_id: str, db: AsyncSession = Depends(get_db)):
    m = await db.get(AiModel, model_id)
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    await db.delete(m)


@router.post("/{model_id}/test", response_model=ModelTestResult)
async def test_model(model_id: str, db: AsyncSession = Depends(get_db)):
    m = await db.get(AiModel, model_id)
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")

    api_key = decrypt(m.api_key_enc) if m.api_key_enc else None
    result = await test_model_connection(
        endpoint_url=m.endpoint_url,
        api_key=api_key,
    )

    # Update status in DB
    m.status = "connected" if result.success else "error"
    await db.flush()

    return result
