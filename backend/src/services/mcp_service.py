"""MCP server connection testing and tool discovery.

Supports three transports:
- http  → POST JSON-RPC 2.0 initialize
- sse   → Connect to SSE endpoint, send initialize, read response
- stdio → Spawn subprocess via stdio_command, send initialize over stdin
"""
from __future__ import annotations

import asyncio
import json
import time
import uuid
from typing import Any, Optional

import httpx

from src.schemas.mcp import McpTestResult, McpToolSchema, McpToolsResult


_JSONRPC_INIT = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {"roots": {"listChanged": False}},
        "clientInfo": {"name": "MCPier", "version": "0.1.0"},
    },
}

_JSONRPC_TOOLS_LIST = {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {},
}


def _clean_token(token: Optional[str]) -> Optional[str]:
    if not token:
        return None
    cleaned = "".join(c for c in str(token).strip().strip("'\"") if 32 <= ord(c) <= 126).strip()
    return cleaned or None


async def _http_jsonrpc(url: str, payload: dict, auth_token: Optional[str], timeout: float = 8.0) -> tuple[float, dict]:
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    token = _clean_token(auth_token)
    if token:
        headers["Authorization"] = f"Bearer {token}"

    start = time.perf_counter()
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
    latency = (time.perf_counter() - start) * 1000
    return latency, data


async def _sse_jsonrpc(url: str, payload: dict, auth_token: Optional[str], timeout: float = 10.0) -> tuple[float, dict]:
    """Send JSON-RPC over SSE endpoint (POST messages endpoint, read from SSE stream)."""
    headers = {"Content-Type": "application/json"}
    token = _clean_token(auth_token)
    if token:
        headers["Authorization"] = f"Bearer {token}"

    start = time.perf_counter()
    async with httpx.AsyncClient(timeout=timeout) as client:
        # Many SSE MCP servers accept POST to /messages and respond via SSE on /sse
        # Try POST directly first (some servers return JSON immediately)
        try:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            latency = (time.perf_counter() - start) * 1000
            return latency, data
        except Exception:
            # Fall back: treat as streaming SSE
            async with client.stream("GET", url, headers={**headers, "Accept": "text/event-stream"}) as stream:
                async for line in stream.aiter_lines():
                    if line.startswith("data:"):
                        data_str = line[5:].strip()
                        if data_str and data_str != "[DONE]":
                            data = json.loads(data_str)
                            latency = (time.perf_counter() - start) * 1000
                            return latency, data
    raise RuntimeError("No response received from SSE endpoint")


async def _stdio_jsonrpc(command: str, payload: dict, timeout: float = 10.0) -> tuple[float, dict]:
    """Spawn subprocess, write JSON-RPC on stdin, read response from stdout."""
    import shlex

    args = shlex.split(command)
    start = time.perf_counter()

    proc = await asyncio.create_subprocess_exec(
        *args,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    msg = json.dumps(payload) + "\n"
    try:
        stdout, _ = await asyncio.wait_for(proc.communicate(msg.encode()), timeout=timeout)
        latency = (time.perf_counter() - start) * 1000
        # stdout may contain multiple JSON lines; find the initialize response
        for line in stdout.decode().splitlines():
            line = line.strip()
            if line:
                try:
                    data = json.loads(line)
                    if "result" in data or "error" in data:
                        return latency, data
                except json.JSONDecodeError:
                    continue
        raise RuntimeError(f"No valid JSON-RPC response found in stdout: {stdout[:200]}")
    finally:
        try:
            proc.kill()
        except Exception:
            pass


async def test_connection(
    server_url: str,
    transport: str,
    auth_token: Optional[str],
    stdio_command: Optional[str],
) -> McpTestResult:
    try:
        if transport == "stdio":
            if not stdio_command:
                return McpTestResult(success=False, error="stdio_command is required for stdio transport")
            latency, data = await _stdio_jsonrpc(stdio_command, _JSONRPC_INIT)
        elif transport == "sse":
            latency, data = await _sse_jsonrpc(server_url, _JSONRPC_INIT, auth_token)
        else:
            # Default: http
            latency, data = await _http_jsonrpc(server_url, _JSONRPC_INIT, auth_token)

        if "error" in data:
            return McpTestResult(success=False, latency_ms=round(latency, 1), error=data["error"].get("message", "JSON-RPC error"))

        result = data.get("result", {})
        server_info = result.get("serverInfo", {})
        return McpTestResult(
            success=True,
            latency_ms=round(latency, 1),
            server_name=server_info.get("name"),
            server_version=server_info.get("version"),
            protocol_version=result.get("protocolVersion"),
        )
    except asyncio.TimeoutError:
        return McpTestResult(success=False, error="Connection timed out")
    except httpx.ConnectError as e:
        return McpTestResult(success=False, error=f"Could not connect: {e}")
    except httpx.HTTPStatusError as e:
        return McpTestResult(success=False, error=f"HTTP {e.response.status_code}: {e.response.text[:200]}")
    except Exception as e:
        return McpTestResult(success=False, error=str(e)[:400])


async def list_tools(
    server_url: str,
    transport: str,
    auth_token: Optional[str],
    stdio_command: Optional[str],
) -> McpToolsResult:
    try:
        if transport == "stdio":
            if not stdio_command:
                return McpToolsResult(success=False, error="stdio_command required")
            # Send initialize first, then tools/list
            await _stdio_jsonrpc(stdio_command, _JSONRPC_INIT)
            _, data = await _stdio_jsonrpc(stdio_command, _JSONRPC_TOOLS_LIST)
        elif transport == "sse":
            _, data = await _sse_jsonrpc(server_url, _JSONRPC_TOOLS_LIST, auth_token)
        else:
            _, data = await _http_jsonrpc(server_url, _JSONRPC_TOOLS_LIST, auth_token)

        if "error" in data:
            return McpToolsResult(success=False, error=data["error"].get("message", "tools/list error"))

        raw_tools = data.get("result", {}).get("tools", [])
        tools = [
            McpToolSchema(
                name=t.get("name", ""),
                description=t.get("description", ""),
                input_schema=t.get("inputSchema"),
            )
            for t in raw_tools
        ]
        return McpToolsResult(success=True, tools=tools)
    except Exception as e:
        return McpToolsResult(success=False, error=str(e)[:400])
