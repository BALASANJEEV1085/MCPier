"""Streaming LLM proxy service with MCP tool execution.

Supports:
  - Google Gemini (OpenAI-compatible endpoint)
  - OpenAI (GPT-4o, o3-mini, etc.)
  - Anthropic (Claude 3.7 / 3.5 Sonnet / Haiku native messages stream)
  - Groq, Ollama, OpenRouter, vLLM (OpenAI-compatible)

Yields SSE-formatted data lines:
  data: {"type": "thinking", "content": "..."}
  data: {"type": "tool_call", "id": "...", "tool_name": "...", "server_name": "...", "arguments": {...}}
  data: {"type": "tool_result", "id": "...", "tool_name": "...", "output": "...", "duration_ms": ...}
  data: {"type": "content", "chunk": "..."}
  data: {"type": "done", "message_id": "...", "content": "...", "model": "..."}
  data: {"type": "error", "message": "..."}
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any, AsyncIterator, Optional

import httpx
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

from src.models.mcp_server import McpServer
from src.services.mcp_service import _http_jsonrpc, _sse_jsonrpc, _stdio_jsonrpc
from src.core.crypto import decrypt


def _emit(obj: dict) -> str:
    return f"data: {json.dumps(obj)}\n\n"


async def _call_mcp_tool(
    server: McpServer,
    tool_name: str,
    arguments: dict[str, Any],
    call_id: str,
) -> AsyncIterator[str]:
    """Invoke a single MCP tool and stream tool_call / tool_result events."""
    auth_token = decrypt(server.auth_token_enc) if server.auth_token_enc else None

    yield _emit({
        "type": "tool_call",
        "id": call_id,
        "tool_name": tool_name,
        "server_name": server.name,
        "arguments": arguments,
    })

    payload = {
        "jsonrpc": "2.0",
        "id": int(time.time()),
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments},
    }

    start = time.perf_counter()
    try:
        if server.transport == "stdio":
            _, data = await _stdio_jsonrpc(server.stdio_command or "", payload)
        elif server.transport == "sse":
            _, data = await _sse_jsonrpc(server.server_url, payload, auth_token)
        else:
            _, data = await _http_jsonrpc(server.server_url, payload, auth_token)

        duration_ms = (time.perf_counter() - start) * 1000
        result = data.get("result", {})
        content_blocks = result.get("content", [])
        output_text = "\n".join(
            block.get("text", str(block)) for block in content_blocks if block.get("type") == "text"
        ) or json.dumps(result)

        yield _emit({
            "type": "tool_result",
            "id": call_id,
            "tool_name": tool_name,
            "server_name": server.name,
            "output": output_text,
            "duration_ms": round(duration_ms, 1),
            "success": True,
        })
    except Exception as e:
        duration_ms = (time.perf_counter() - start) * 1000
        yield _emit({
            "type": "tool_result",
            "id": call_id,
            "tool_name": tool_name,
            "server_name": server.name,
            "output": f"Error: {e}",
            "duration_ms": round(duration_ms, 1),
            "success": False,
        })


async def _stream_anthropic(
    user_content: str,
    model_id: str,
    api_key: Optional[str],
    history: list[dict[str, str]],
) -> AsyncIterator[str]:
    """Native Anthropic streaming via /v1/messages API."""
    message_id = str(uuid.uuid4())
    headers = {
        "x-api-key": api_key or "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    anthropic_msgs = []
    for h in history:
        if h.get("role") in ("user", "assistant"):
            anthropic_msgs.append({"role": h["role"], "content": h.get("content", "")})
    anthropic_msgs.append({"role": "user", "content": user_content})

    body = {
        "model": model_id,
        "max_tokens": 4096,
        "messages": anthropic_msgs,
        "stream": True,
        "system": (
            "You are MCPier Agent — an autonomous AI assistant with access to MCP tool servers. "
            "You can query databases, code repositories, filesystems, and external APIs. "
            "Be concise, precise, and always explain your reasoning."
        ),
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", "https://api.anthropic.com/v1/messages", headers=headers, json=body) as resp:
            if resp.status_code >= 400:
                err_bytes = await resp.aread()
                raise ValueError(f"Anthropic API {resp.status_code}: {err_bytes.decode('utf-8', errors='ignore')}")

            accumulated = ""
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data_str = line[5:].strip()
                if not data_str or data_str == "[DONE]":
                    continue
                try:
                    evt = json.loads(data_str)
                    if evt.get("type") == "content_block_delta":
                        delta_txt = evt.get("delta", {}).get("text", "")
                        if delta_txt:
                            accumulated += delta_txt
                            yield _emit({"type": "content", "chunk": delta_txt})
                except Exception:
                    pass

            yield _emit({
                "type": "done",
                "message_id": message_id,
                "content": accumulated,
                "model": model_id,
            })


def _build_openai_tools(mcp_servers: list[McpServer]) -> list[dict]:
    """Discover and format all available MCP tools as OpenAI function tool definitions."""
    tools = []
    has_github = False
    for s in mcp_servers:
        if "github" in s.name.lower() or "github" in (s.server_url or "").lower() or s.category.lower() == "source control":
            has_github = True

    if has_github:
        try:
            from src.mcp_servers.github_mcp import TOOLS_REGISTRY
        except ImportError:
            try:
                from src.github_mcp import TOOLS_REGISTRY
            except ImportError:
                TOOLS_REGISTRY = []
        for t in TOOLS_REGISTRY:
            tools.append({
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t["inputSchema"],
                }
            })

    return tools


async def _execute_mcp_tool(
    server: Optional[McpServer],
    tool_name: str,
    arguments: dict[str, Any],
    call_id: str,
) -> tuple[list[str], str]:
    """Invoke a single MCP tool and return emitted SSE events and output text."""
    auth_token = decrypt(server.auth_token_enc) if server and server.auth_token_enc else None
    if auth_token:
        auth_token = "".join(c for c in str(auth_token).strip().strip("'\"") if 32 <= ord(c) <= 126).strip()
    server_name = server.name if server else "github-mcp"
    events = []

    events.append(_emit({
        "type": "tool_call",
        "id": call_id,
        "tool_name": tool_name,
        "server_name": server_name,
        "arguments": arguments,
    }))

    start = time.perf_counter()
    output_text = ""
    success = True

    if tool_name.startswith("github_"):
        try:
            try:
                from src.mcp_servers.github_mcp import GitHubMcpServer
            except ImportError:
                from src.github_mcp import GitHubMcpServer
            gh_server = GitHubMcpServer(token=auth_token)
            req = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {"name": tool_name, "arguments": arguments},
            }
            res = await gh_server.handle_request(req)
            if res and "result" in res and "content" in res["result"]:
                blocks = res["result"]["content"]
                output_text = "\n".join(b.get("text", str(b)) for b in blocks if b.get("type") == "text")
            else:
                output_text = json.dumps(res)
        except Exception as e:
            output_text = f"Error: {e}"
            success = False
    elif server:
        payload = {
            "jsonrpc": "2.0",
            "id": int(time.time()),
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": arguments},
        }
        try:
            if server.transport == "stdio":
                _, data = await _stdio_jsonrpc(server.stdio_command or "", payload)
            elif server.transport == "sse":
                _, data = await _sse_jsonrpc(server.server_url, payload, auth_token)
            else:
                _, data = await _http_jsonrpc(server.server_url, payload, auth_token)

            result = data.get("result", {})
            content_blocks = result.get("content", [])
            output_text = "\n".join(
                block.get("text", str(block)) for block in content_blocks if block.get("type") == "text"
            ) or json.dumps(result)
        except Exception as e:
            output_text = f"Error: {e}"
            success = False

    duration_ms = (time.perf_counter() - start) * 1000
    events.append(_emit({
        "type": "tool_result",
        "id": call_id,
        "tool_name": tool_name,
        "server_name": server_name,
        "output": output_text,
        "duration_ms": round(duration_ms, 1),
        "success": success,
    }))

    return events, output_text


def _synthesize_tool_summary(executed_calls: list[dict]) -> str:
    """Create a human-friendly confirmation when tool execution succeeded."""
    lines: list[str] = []
    has_mutation = any(
        ec.get("name", "").startswith(("github_create_", "github_delete_", "github_update_"))
        for ec in executed_calls
    )
    if has_mutation:
        lines.append("### ✅ Action Completed Successfully\n")
    else:
        lines.append("### ℹ️ GitHub Tool Execution Results\n")

    for ec in executed_calls:
        name = ec.get("name", "tool")
        output = ec.get("output", "")
        parsed_out: dict[str, Any] = {}
        if isinstance(output, str):
            try:
                parsed = json.loads(output)
                if isinstance(parsed, dict):
                    parsed_out = parsed
            except Exception:
                pass

        if name == "github_delete_branch":
            branch = parsed_out.get("branch") or ""
            repo = parsed_out.get("repo") or ""
            owner = parsed_out.get("owner") or ""
            repo_full = f"{owner}/{repo}" if owner and repo else (repo or owner)
            if branch and repo_full:
                lines.append(f"- **Branch:** `{branch}`")
                lines.append(f"- **Repository:** `{repo_full}`")
                lines.append(f"\nThe branch `{branch}` has been successfully deleted from `{repo_full}`.")
            elif branch:
                lines.append(f"- **Branch:** `{branch}` deleted successfully.")
            else:
                lines.append(f"- **`github_delete_branch`** executed successfully.")
        elif name == "github_create_branch":
            branch = parsed_out.get("branch") or parsed_out.get("ref", "").replace("refs/heads/", "")
            repo = parsed_out.get("repo") or ""
            owner = parsed_out.get("owner") or ""
            repo_full = f"{owner}/{repo}" if owner and repo else (repo or owner)
            sha = parsed_out.get("sha") or ""
            if branch and repo_full:
                lines.append(f"- **Branch:** `{branch}`")
                lines.append(f"- **Repository:** `{repo_full}`")
                if sha:
                    lines.append(f"- **Commit SHA:** `{sha[:7]}`")
                lines.append(f"\nThe new branch `{branch}` has been successfully created in `{repo_full}`.")
            elif branch:
                lines.append(f"- **Branch:** `{branch}` created successfully.")
            else:
                lines.append(f"- **`github_create_branch`** executed successfully.")
        elif name == "github_create_issue":
            issue_num = parsed_out.get("number")
            issue_url = parsed_out.get("html_url")
            title = parsed_out.get("title")
            if issue_num:
                lines.append(f"- **Issue #{issue_num}:** {title or ''} ([View Issue]({issue_url}))")
            else:
                lines.append(f"- **`github_create_issue`** executed successfully.")
        elif name == "github_create_or_update_file":
            path = parsed_out.get("content", {}).get("path") if isinstance(parsed_out.get("content"), dict) else parsed_out.get("path")
            lines.append(f"- **File:** `{path or 'file'}` committed successfully.")
        elif name == "github_get_user":
            login = parsed_out.get("login") or parsed_out.get("name") or ""
            if login:
                lines.append(f"- Authenticated GitHub user: **`{login}`**")
        else:
            lines.append(f"- Executed tool **`{name}`** successfully.")

        if output and not lines[-1].endswith("."):
            if len(output) < 300:
                lines.append(f"\n```json\n{output}\n```")
    return "\n".join(lines)


async def stream_chat(
    user_content: str,
    model_id: str,
    endpoint_url: str,
    api_key: Optional[str],
    history: list[dict[str, str]],
    mcp_servers: list[McpServer],
) -> AsyncIterator[str]:
    """
    Main streaming chat generator. Yields SSE-formatted data strings.
    Executes autonomous multi-step tool-calling loops with connected MCP servers.
    """
    message_id = str(uuid.uuid4())

    # If no model configured or demo mode requested
    if not model_id or model_id == "demo-model":
        for word in ["This ", "is ", "a ", "mock ", "response. ", "Connect ", "a ", "real ", "model ", "in ", "Settings."]:
            yield _emit({"type": "content", "chunk": word})
            await asyncio.sleep(0.05)
        yield _emit({
            "type": "done",
            "message_id": message_id,
            "content": "This is a mock response. Connect a real model in Settings.",
            "model": "demo-model",
        })
        return

    # Check for empty API key on commercial models
    if not api_key:
        is_local = any(
            local in endpoint_url.lower()
            for local in ["localhost", "127.0.0.1", "ollama", "lmstudio"]
        )
        if not is_local:
            yield _emit({
                "type": "error",
                "message": f"No API key found for model '{model_id}'. Please configure an API key in Settings / Models.",
            })
            return

    yield _emit({"type": "thinking", "content": "Analyzing your request..."})

    try:
        # ── Route to Anthropic native streaming if requested ────────────────
        if "anthropic.com" in endpoint_url.lower():
            async for event in _stream_anthropic(user_content, model_id, api_key, history):
                yield event
            return

        # ── Route to OpenAI-compatible streaming (Gemini, OpenAI, Ollama, Groq) ──
        base_url = endpoint_url.rstrip("/")
        if "generativelanguage.googleapis.com" in base_url and not base_url.endswith("/openai"):
            if not base_url.endswith("/v1beta/openai"):
                base_url = "https://generativelanguage.googleapis.com/v1beta/openai"

        if not base_url.endswith("/"):
            base_url += "/"

        client = AsyncOpenAI(
            api_key=api_key or "no-key",
            base_url=base_url,
        )

        messages: list[dict[str, Any]] = [
            {
                "role": "system",
                "content": (
                    "You are MCPier Agent - an autonomous AI assistant with access to MCP tool servers (including GitHub). "
                    "You can search repositories, inspect code, list issues and PRs, create branches, and query files. "
                    "When the user asks about GitHub repositories, code, issues, branches, or PRs, ALWAYS invoke the appropriate GitHub MCP tool. "
                    "Use the authenticated GitHub user from the PAT token when resolving repository ownership. If the user names a repo without an owner, "
                    "resolve the owner automatically from the authenticated GitHub account and call the GitHub tool with the correct owner/repo pair. "
                    "Be concise, precise, and format your answers in clean Markdown."
                ),
            },
            *history,
            {"role": "user", "content": user_content},
        ]

        # Discover tools from attached MCP servers
        openai_tools = _build_openai_tools(mcp_servers)

        accumulated_content = ""
        all_executed_calls: list[dict] = []
        current_messages: list[dict[str, Any]] = list(messages)
        max_tool_turns = 5

        for turn in range(max_tool_turns):
            tool_calls_by_index: dict[int, dict] = {}
            turn_content = ""

            try:
                stream = await client.chat.completions.create(
                    model=model_id,
                    messages=current_messages,  # type: ignore
                    tools=openai_tools if openai_tools else None,
                    tool_choice="auto" if openai_tools else None,
                    stream=True,
                    max_tokens=4096,
                    temperature=0.3,
                )

                async for chunk in stream:
                    if not chunk.choices:
                        continue

                    delta = chunk.choices[0].delta

                    # Stream text content
                    if delta.content:
                        turn_content += delta.content
                        accumulated_content += delta.content
                        yield _emit({"type": "content", "chunk": delta.content})

                    # Capture tool calls
                    if hasattr(delta, "tool_calls") and delta.tool_calls:
                        for tc_delta in delta.tool_calls:
                            idx = tc_delta.index
                            if idx not in tool_calls_by_index:
                                tool_calls_by_index[idx] = {
                                    "id": tc_delta.id or str(uuid.uuid4()),
                                    "name": "",
                                    "arguments": "",
                                }
                            if tc_delta.function:
                                if tc_delta.function.name:
                                    tool_calls_by_index[idx]["name"] += tc_delta.function.name
                                if tc_delta.function.arguments:
                                    tool_calls_by_index[idx]["arguments"] += tc_delta.function.arguments

            except Exception as stream_exc:
                logger.warning("Stream completion exception on turn %d: %s", turn, stream_exc)
                if all_executed_calls:
                    # Synthesize from already executed tools if LLM stream glitched
                    fallback_summary = _synthesize_tool_summary(all_executed_calls)
                    accumulated_content += ("\n\n" if accumulated_content.strip() else "") + fallback_summary
                    yield _emit({"type": "content", "chunk": fallback_summary})
                    break
                else:
                    raise stream_exc

            # If the model didn't call any tools on this turn, it has delivered its answer
            if not tool_calls_by_index:
                break

            # Execute the tool calls from this turn
            executed_calls_this_turn = []
            for idx in sorted(tool_calls_by_index.keys()):
                tc = tool_calls_by_index[idx]
                tool_name = tc["name"]
                try:
                    args = json.loads(tc["arguments"])
                except Exception:
                    args = {"raw": tc["arguments"]}

                server = mcp_servers[0] if mcp_servers else None
                events, output_text = await _execute_mcp_tool(server, tool_name, args, tc["id"])
                for ev in events:
                    yield ev

                exec_info = {
                    "id": tc["id"],
                    "name": tool_name,
                    "arguments": tc["arguments"],
                    "output": output_text,
                }
                executed_calls_this_turn.append(exec_info)
                all_executed_calls.append(exec_info)

            # Build follow-up context for the next turn
            tool_outputs_text = "\n\n".join(
                f"### Result from tool `{ec['name']}`:\n```json\n{ec['output']}\n```"
                for ec in executed_calls_this_turn
            )

            current_messages.append({
                "role": "assistant",
                "content": turn_content or f"Executed tool `{executed_calls_this_turn[0]['name']}` to inspect or perform GitHub action.",
            })
            current_messages.append({
                "role": "user",
                "content": (
                    f"Result of tool execution:\n\n{tool_outputs_text}\n\n"
                    "Instructions:\n"
                    "1. If an additional tool is required to complete the user's request (e.g. now that the repository owner or branch info is known, call github_delete_branch or other required tool), invoke that tool now.\n"
                    "2. If the requested operation is complete or no more tools are needed, answer the user request directly in clean Markdown without calling more tools.\n"
                    "3. Accurately state what happened based strictly on the tool outputs. Do NOT claim an action (like deleting or creating a branch) was performed unless a tool actually succeeded in performing it."
                ),
            })

        # If tools were executed but no text content was emitted, provide synthesized summary
        if not accumulated_content.strip() and all_executed_calls:
            fallback_summary = _synthesize_tool_summary(all_executed_calls)
            accumulated_content = fallback_summary
            yield _emit({"type": "content", "chunk": fallback_summary})

        yield _emit({
            "type": "done",
            "message_id": message_id,
            "content": accumulated_content,
            "model": model_id,
        })

    except Exception as exc:
        error_msg = str(exc)
        if "401" in error_msg or "unauthorized" in error_msg.lower() or "api_key_invalid" in error_msg.lower():
            error_msg = "Invalid API key. Please check your model's API key in Settings / Models page."
        elif "403" in error_msg or "forbidden" in error_msg.lower():
            error_msg = "Access denied. Your API key may not have the required permissions."
        elif "connect" in error_msg.lower() or "econnrefused" in error_msg.lower():
            error_msg = f"Cannot reach endpoint: {endpoint_url}. Ensure the server/provider is reachable."
        elif "404" in error_msg:
            error_msg = f"Endpoint or Model not found ({model_id}). Please check the Model ID and Endpoint URL."
        elif "timeout" in error_msg.lower():
            error_msg = "Request timed out. The model server may be overloaded."

        yield _emit({"type": "error", "message": error_msg})
