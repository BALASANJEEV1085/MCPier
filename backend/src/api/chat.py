from __future__ import annotations

import json
import uuid
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.crypto import decrypt
from src.core.db import get_db
from src.models.ai_model import AiModel
from src.models.chat import ChatMessage, ChatSession
from src.models.mcp_server import McpServer
from src.schemas.chat import (
    ChatMessageOut,
    ChatSessionCreate,
    ChatSessionDetailOut,
    ChatSessionOut,
    ChatSessionUpdate,
    ChatToolCallOut,
    SendMessageRequest,
)
from src.services.chat_service import stream_chat

router = APIRouter(prefix="/api/chat", tags=["Chat"])


# ── Helpers ────────────────────────────────────────────────────────────────

def _parse_mcp_ids(json_str: str | None) -> list[str]:
    if not json_str:
        return []
    try:
        return json.loads(json_str)
    except Exception:
        return []


from sqlalchemy.inspection import inspect


def _parse_tool_calls(json_str: str | None) -> list[ChatToolCallOut]:
    if not json_str:
        return []
    try:
        raw = json.loads(json_str)
        return [ChatToolCallOut(**tc) for tc in raw]
    except Exception:
        return []


def _session_to_out(s: ChatSession, include_messages: bool = False) -> ChatSessionOut | ChatSessionDetailOut:
    insp = inspect(s)
    is_loaded = "messages" in insp.dict
    loaded_msgs = insp.dict.get("messages") or [] if is_loaded else []

    base = dict(
        id=s.id,
        title=s.title,
        model_ref=s.model_ref,
        mcp_server_ids=_parse_mcp_ids(s.mcp_ids_json),
        created_at=s.created_at,
        updated_at=s.updated_at,
        message_count=len(loaded_msgs),
    )
    if include_messages:
        msgs = [
            ChatMessageOut(
                id=m.id,
                role=m.role,
                content=m.content,
                tool_calls=_parse_tool_calls(m.tool_calls_json),
                thinking_content=m.thinking_content,
                model_used=m.model_used,
                created_at=m.created_at,
            )
            for m in loaded_msgs
        ]
        return ChatSessionDetailOut(**base, messages=msgs)
    return ChatSessionOut(**base)


# ── Session CRUD ───────────────────────────────────────────────────────────

@router.get("/sessions", response_model=list[ChatSessionOut])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .order_by(ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()
    return [_session_to_out(s) for s in sessions]


@router.post("/sessions", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(payload: ChatSessionCreate, db: AsyncSession = Depends(get_db)):
    session = ChatSession(
        id=str(uuid.uuid4()),
        title=payload.title,
        model_ref=payload.model_ref,
        mcp_ids_json=json.dumps(payload.mcp_server_ids),
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return _session_to_out(session)


@router.get("/sessions/{session_id}", response_model=ChatSessionDetailOut)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return _session_to_out(session, include_messages=True)


@router.patch("/sessions/{session_id}", response_model=ChatSessionOut)
async def update_session(session_id: str, payload: ChatSessionUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatSession).options(selectinload(ChatSession.messages)).where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if payload.title is not None:
        session.title = payload.title
    if payload.model_ref is not None:
        session.model_ref = payload.model_ref
    if payload.mcp_server_ids is not None:
        session.mcp_ids_json = json.dumps(payload.mcp_server_ids)
    await db.flush()
    await db.refresh(session)
    return _session_to_out(session)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    session = await db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    await db.delete(session)


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageOut])
async def get_messages(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()
    return [
        ChatMessageOut(
            id=m.id,
            role=m.role,
            content=m.content,
            tool_calls=_parse_tool_calls(m.tool_calls_json),
            thinking_content=m.thinking_content,
            model_used=m.model_used,
            created_at=m.created_at,
        )
        for m in messages
    ]


# ── Streaming Message Send ────────────────────────────────────────────────

@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    payload: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    # Load session or auto-create if missing
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        session = ChatSession(
            id=session_id,
            title=payload.content[:48] + ("..." if len(payload.content) > 48 else ""),
            model_ref=payload.model_id or "",
            mcp_ids_json=json.dumps(payload.mcp_server_ids or []),
        )
        db.add(session)
        await db.flush()

    # Resolve model
    model_ref = payload.model_id or session.model_ref
    ai_model: AiModel | None = None

    if model_ref:
        # 1. Try by exact primary key ID
        ai_model = await db.get(AiModel, model_ref)
        # 2. Try by exact name
        if not ai_model:
            m_result = await db.execute(select(AiModel).where(AiModel.name == model_ref).limit(1))
            ai_model = m_result.scalar_one_or_none()
        # 3. Try by exact model_id
        if not ai_model:
            m_result = await db.execute(select(AiModel).where(AiModel.model_id == model_ref).limit(1))
            ai_model = m_result.scalar_one_or_none()
        # 4. Try case-insensitive or partial match
        if not ai_model:
            m_result = await db.execute(
                select(AiModel).where(
                    AiModel.name.ilike(f"%{model_ref}%")
                    | AiModel.model_id.ilike(f"%{model_ref}%")
                    | AiModel.provider.ilike(f"%{model_ref}%")
                ).limit(1)
            )
            ai_model = m_result.scalar_one_or_none()

    if not ai_model:
        # Fallback: use most recently added model from database
        m_result = await db.execute(select(AiModel).order_by(AiModel.created_at.desc()).limit(1))
        ai_model = m_result.scalar_one_or_none()

    if not ai_model:
        raise HTTPException(
            status_code=422,
            detail="No AI model configured in database. Please go to Models (/dashboard/models), click 'Connect Model', and enter your API key to chat with real LLMs.",
        )

    # Resolve MCP servers
    mcp_ids = payload.mcp_server_ids or _parse_mcp_ids(session.mcp_ids_json)
    mcp_servers: list[McpServer] = []
    if mcp_ids:
        mcp_result = await db.execute(select(McpServer).where(McpServer.id.in_(mcp_ids)))
        mcp_servers = list(mcp_result.scalars().all())
    else:
        # Auto-attach all registered MCP servers
        mcp_result = await db.execute(select(McpServer))
        mcp_servers = list(mcp_result.scalars().all())

    # Load previous message history for this session asynchronously
    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    existing_msgs = list(msg_result.scalars().all())

    # Update session title if this is the first message
    if not existing_msgs:
        session.title = payload.content[:48] + ("..." if len(payload.content) > 48 else "")
    session.model_ref = ai_model.name

    # Persist user message
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="user",
        content=payload.content,
        model_used=ai_model.name,
    )
    db.add(user_msg)
    await db.flush()

    # Build conversation history for LLM context
    history = [
        {"role": m.role, "content": m.content}
        for m in existing_msgs
        if m.role in ("user", "assistant")
    ]

    api_key = decrypt(ai_model.api_key_enc) if ai_model.api_key_enc else None

    # ── Streaming Response ──────────────────────────────────────────────
    collected_content: list[str] = []
    collected_tool_calls: list[dict] = []

    async def event_generator() -> AsyncIterator[str]:
        assistant_content = ""
        tool_calls: list[dict] = []

        async for event_str in stream_chat(
            user_content=payload.content,
            model_id=ai_model.model_id,
            endpoint_url=ai_model.endpoint_url,
            api_key=api_key,
            history=history,
            mcp_servers=mcp_servers,
        ):
            # Accumulate for DB persistence
            try:
                parsed = json.loads(event_str.replace("data: ", "").strip())
                if parsed.get("type") == "content":
                    assistant_content += parsed.get("chunk", "")
                elif parsed.get("type") == "tool_call":
                    tool_calls.append(parsed)
                elif parsed.get("type") == "tool_result":
                    # Find and update matching tool_call
                    for tc in tool_calls:
                        if tc.get("id") == parsed.get("id"):
                            tc["output"] = parsed.get("output")
                            tc["duration_ms"] = parsed.get("duration_ms")
                            tc["success"] = parsed.get("success")
                elif parsed.get("type") == "done":
                    # Persist assistant message
                    assistant_msg = ChatMessage(
                        id=str(uuid.uuid4()),
                        session_id=session_id,
                        role="assistant",
                        content=assistant_content or parsed.get("content", ""),
                        tool_calls_json=json.dumps(tool_calls) if tool_calls else None,
                        model_used=ai_model.name,
                    )
                    db.add(assistant_msg)
                    # Note: commit happens in get_db context manager after yield
            except Exception:
                pass

            yield event_str

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
