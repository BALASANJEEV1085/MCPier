"""AI model connectivity testing — calls the OpenAI-compatible /v1/models endpoint."""
from __future__ import annotations

import time
from typing import Optional

import httpx

from src.schemas.model import ModelTestResult


async def test_model_connection(
    endpoint_url: str,
    api_key: Optional[str],
    timeout: float = 10.0,
) -> ModelTestResult:
    """
    Verify the AI model endpoint is reachable and the API key is valid
    by calling GET {endpoint_url}/models (OpenAI-compatible API).
    """
    # Normalize the URL — strip trailing slash, ensure /models appended
    base = endpoint_url.rstrip("/")
    models_url = f"{base}/models"

    headers = {"Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        start = time.perf_counter()
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(models_url, headers=headers)
        latency = (time.perf_counter() - start) * 1000

        if resp.status_code == 401:
            return ModelTestResult(success=False, latency_ms=round(latency, 1), error="Invalid API key (HTTP 401 Unauthorized)")
        if resp.status_code == 403:
            return ModelTestResult(success=False, latency_ms=round(latency, 1), error="Forbidden — check API key permissions (HTTP 403)")
        if resp.status_code == 404:
            # Some providers (Anthropic) don't expose /v1/models — treat 404 as "reachable"
            return ModelTestResult(
                success=True,
                latency_ms=round(latency, 1),
                available_models=[],
                error=None,
            )

        resp.raise_for_status()
        data = resp.json()

        # OpenAI-style: { data: [{ id: "..." }, ...] }
        available_models: list[str] = []
        if isinstance(data, dict):
            available_models = [m.get("id", "") for m in data.get("data", [])]
        elif isinstance(data, list):
            available_models = [m.get("id", str(m)) for m in data]

        return ModelTestResult(
            success=True,
            latency_ms=round(latency, 1),
            available_models=available_models[:20],
        )
    except httpx.ConnectError as e:
        return ModelTestResult(success=False, error=f"Could not connect to endpoint: {e}")
    except httpx.TimeoutException:
        return ModelTestResult(success=False, error=f"Endpoint timed out after {timeout}s")
    except httpx.HTTPStatusError as e:
        return ModelTestResult(success=False, error=f"HTTP {e.response.status_code}: {e.response.text[:200]}")
    except Exception as e:
        return ModelTestResult(success=False, error=str(e)[:400])
