from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.crypto import decrypt, encrypt, mask
from src.core.db import get_db
from src.models.mcp_server import McpServer
from src.schemas.mcp import (
    McpServerCreate,
    McpServerOut,
    McpServerUpdate,
    McpTestResult,
    McpToolsResult,
)
from src.services.mcp_service import list_tools, test_connection

router = APIRouter(prefix="/api/mcp-servers", tags=["MCP Servers"])


def _to_out(server: McpServer) -> McpServerOut:
    return McpServerOut(
        id=server.id,
        name=server.name,
        category=server.category,
        description=server.description,
        server_url=server.server_url,
        transport=server.transport,
        stdio_command=server.stdio_command,
        has_auth_token=bool(server.auth_token_enc),
        config_json=server.config_json,
        status=server.status,
        environment=server.environment,
        created_at=server.created_at,
        updated_at=server.updated_at,
    )


@router.get("", response_model=list[McpServerOut])
async def list_servers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(McpServer).order_by(McpServer.created_at.desc()))
    return [_to_out(s) for s in result.scalars().all()]


@router.post("", response_model=McpServerOut, status_code=status.HTTP_201_CREATED)
async def create_server(payload: McpServerCreate, db: AsyncSession = Depends(get_db)):
    # Auto-test connection on creation
    test_res = await test_connection(
        server_url=payload.server_url,
        transport=payload.transport,
        auth_token=payload.auth_token,
        stdio_command=payload.stdio_command,
    )

    server = McpServer(
        name=payload.name,
        category=payload.category,
        description=payload.description,
        server_url=payload.server_url,
        transport=payload.transport,
        stdio_command=payload.stdio_command,
        auth_token_enc=encrypt(payload.auth_token) if payload.auth_token else None,
        config_json=payload.config_json,
        environment=payload.environment,
        status="connected" if test_res.success else "disconnected",
    )
    db.add(server)
    await db.flush()
    await db.refresh(server)
    return _to_out(server)


@router.get("/{server_id}", response_model=McpServerOut)
async def get_server(server_id: str, db: AsyncSession = Depends(get_db)):
    server = await db.get(McpServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")
    return _to_out(server)


@router.patch("/{server_id}", response_model=McpServerOut)
async def update_server(server_id: str, payload: McpServerUpdate, db: AsyncSession = Depends(get_db)):
    server = await db.get(McpServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")

    if payload.name is not None:
        server.name = payload.name
    if payload.category is not None:
        server.category = payload.category
    if payload.description is not None:
        server.description = payload.description
    if payload.server_url is not None:
        server.server_url = payload.server_url
    if payload.transport is not None:
        server.transport = payload.transport
    if payload.stdio_command is not None:
        server.stdio_command = payload.stdio_command
    if payload.auth_token is not None:
        server.auth_token_enc = encrypt(payload.auth_token)
    if payload.config_json is not None:
        server.config_json = payload.config_json
    if payload.environment is not None:
        server.environment = payload.environment
    if payload.status is not None:
        server.status = payload.status

    await db.flush()
    await db.refresh(server)
    return _to_out(server)


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_server(server_id: str, db: AsyncSession = Depends(get_db)):
    server = await db.get(McpServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")
    await db.delete(server)


@router.post("/{server_id}/test", response_model=McpTestResult)
async def test_server_connection(server_id: str, db: AsyncSession = Depends(get_db)):
    server = await db.get(McpServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")

    auth_token = decrypt(server.auth_token_enc) if server.auth_token_enc else None
    result = await test_connection(
        server_url=server.server_url,
        transport=server.transport,
        auth_token=auth_token,
        stdio_command=server.stdio_command,
    )

    # Update status in DB
    server.status = "connected" if result.success else "error"
    await db.flush()

    return result


@router.get("/{server_id}/tools", response_model=McpToolsResult)
async def get_server_tools(server_id: str, db: AsyncSession = Depends(get_db)):
    server = await db.get(McpServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")

    auth_token = decrypt(server.auth_token_enc) if server.auth_token_enc else None
    return await list_tools(
        server_url=server.server_url,
        transport=server.transport,
        auth_token=auth_token,
        stdio_command=server.stdio_command,
    )
