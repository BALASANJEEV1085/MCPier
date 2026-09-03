from __future__ import annotations

import time

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from src.core.config import settings

router = APIRouter(prefix="/api", tags=["Health"])

_startup_time = time.time()


@router.get("/health")
async def health_check():
    uptime = int(time.time() - _startup_time)
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "title": settings.APP_TITLE,
        "uptime_seconds": uptime,
    }
