# MCPier Backend

FastAPI backend for **MCPier** — manages MCP server connections, AI model configurations,
streaming agent chat, and task orchestration.

## Stack

- **Python 3.11+** / **uv** package manager
- **FastAPI** + **uvicorn** (ASGI)
- **SQLAlchemy 2.x async** + **asyncpg** → Supabase/PostgreSQL
- **Fernet** (AES-256) for API key encryption at rest
- **OpenAI-compatible SDK** — works with OpenAI, Anthropic, Ollama, OpenRouter, etc.
- **MCP SDK** — real JSON-RPC tool discovery and execution

## Setup

### 1. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL` — Your Supabase transaction pooler URL (port 6543):
  ```
  postgresql+asyncpg://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
  ```
- `SECRET_KEY` — Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- `CORS_ORIGINS` — Your frontend origin (e.g. `http://localhost:3000`)

### 2. Install Dependencies

```bash
uv sync
```

### 3. Run the Server

```bash
uv run uvicorn src.main:app --host 0.0.0.0 --port 8300 --reload
```

The server starts on **http://localhost:8300**.

- Swagger UI: http://localhost:8300/docs
- ReDoc: http://localhost:8300/redoc
- Health: http://localhost:8300/api/health

## API Overview

| Route | Method | Description |
|---|---|---|
| `/api/health` | GET | Health + uptime |
| `/api/mcp-servers` | GET, POST | List / create MCP servers |
| `/api/mcp-servers/{id}` | GET, PATCH, DELETE | Get / update / delete |
| `/api/mcp-servers/{id}/test` | POST | Real JSON-RPC connection test |
| `/api/mcp-servers/{id}/tools` | GET | Live tools/list from server |
| `/api/models` | GET, POST | List / create AI models |
| `/api/models/{id}` | GET, PATCH, DELETE | Get / update / delete |
| `/api/models/{id}/test` | POST | Ping /v1/models with API key |
| `/api/chat/sessions` | GET, POST | List / create chat sessions |
| `/api/chat/sessions/{id}` | GET, PATCH, DELETE | Session detail / update / delete |
| `/api/chat/sessions/{id}/messages` | GET | Get message history |
| `/api/chat/sessions/{id}/messages` | POST | Send message → SSE stream |
| `/api/tasks` | GET, POST | List / create tasks |
| `/api/tasks/{id}` | GET, PATCH, DELETE | Task detail / update / delete |

## MCP Transport Support

| Transport | How it works |
|---|---|
| `http` | POST JSON-RPC 2.0 to the server URL |
| `sse` | SSE stream from the server URL |
| `stdio` | Spawns the `stdio_command` subprocess, sends JSON-RPC over stdin |

## Supabase Notes

- Use port **6543** (Transaction Mode pooler) with `NullPool` + `statement_cache_size=0`
- Tables are auto-created on startup via `Base.metadata.create_all`
- No Alembic migrations needed for development
