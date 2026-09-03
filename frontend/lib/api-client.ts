/**
 * MCPier Backend API Client
 * Typed wrappers for all backend REST endpoints.
 * Set NEXT_PUBLIC_API_URL=http://localhost:8300 in .env.local
 */

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost'
    const protocol = window.location.protocol || 'http:'
    return `${protocol}//${host}:8300`
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8300'
}

// ─── Generic fetch helpers ────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase()
  const resp = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!resp.ok) {
    let detail = resp.statusText
    try { const err = await resp.json(); detail = err.detail ?? JSON.stringify(err) } catch {}
    throw new Error(`API ${resp.status}: ${detail}`)
  }
  if (resp.status === 204) return undefined as T
  return resp.json()
}

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
}

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
}

async function apiDelete(path: string): Promise<void> {
  return apiFetch<void>(path, { method: 'DELETE' })
}

// ─── Types (matching backend Pydantic schemas) ────────────────────────────

export interface McpServerOut {
  id: string
  name: string
  category: string
  description: string
  server_url: string
  transport: 'http' | 'sse' | 'stdio'
  stdio_command?: string | null
  has_auth_token: boolean
  config_json?: string | null
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  environment: string
  created_at: string
  updated_at: string
}

export interface McpServerCreate {
  name: string
  category?: string
  description?: string
  server_url: string
  transport?: 'http' | 'sse' | 'stdio'
  stdio_command?: string
  auth_token?: string
  config_json?: string
  environment?: string
}

export interface McpTestResult {
  success: boolean
  latency_ms?: number | null
  server_name?: string | null
  server_version?: string | null
  protocol_version?: string | null
  error?: string | null
}

export interface McpToolSchema {
  name: string
  description: string
  input_schema?: Record<string, unknown> | null
}

export interface McpToolsResult {
  success: boolean
  tools: McpToolSchema[]
  error?: string | null
}

export interface ModelOut {
  id: string
  name: string
  model_id: string
  provider: string
  endpoint_url: string
  api_key_masked?: string | null
  context_length: string
  capabilities: string[]
  status: 'connected' | 'disconnected' | 'error'
  created_at: string
  updated_at: string
}

export interface ModelCreate {
  name: string
  model_id: string
  provider: string
  endpoint_url: string
  api_key?: string
  context_length?: string
  capabilities?: string[]
}

export interface ModelTestResult {
  success: boolean
  latency_ms?: number | null
  available_models: string[]
  error?: string | null
}

export interface ChatToolCallOut {
  id: string
  tool_name: string
  server_name: string
  arguments: unknown
  output?: string | null
  status: string
  duration_ms?: number | null
}

export interface ChatMessageOut {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tool_calls: ChatToolCallOut[]
  thinking_content?: string | null
  model_used?: string | null
  created_at: string
}

export interface ChatSessionOut {
  id: string
  title: string
  model_ref: string
  mcp_server_ids: string[]
  created_at: string
  updated_at: string
  message_count: number
}

export interface ChatSessionDetailOut extends ChatSessionOut {
  messages: ChatMessageOut[]
}

export interface TaskStepOut {
  id: string
  label: string
  status: string
  detail?: string | null
}

export interface TaskOut {
  id: string
  name: string
  status: string
  prompt?: string | null
  model_ref: string
  mcp_server_ids: string[]
  steps: TaskStepOut[]
  runtime?: string | null
  created_at: string
  updated_at: string
}

// ─── SSE Event types (from streaming chat) ───────────────────────────────

export type ChatSseEvent =
  | { type: 'thinking'; content: string }
  | { type: 'tool_call'; id: string; tool_name: string; server_name: string; arguments: unknown }
  | { type: 'tool_result'; id: string; tool_name: string; server_name: string; output: string; duration_ms: number; success: boolean }
  | { type: 'content'; chunk: string }
  | { type: 'done'; message_id: string; content: string; model: string }
  | { type: 'error'; message: string }

// ─── Health ───────────────────────────────────────────────────────────────

export const healthApi = {
  get: () =>
    apiFetch<{ status: string; version: string; title: string; uptime_seconds: number }>('/api/health'),

  isReachable: async (): Promise<boolean> => {
    try {
      await apiFetch('/api/health')
      return true
    } catch {
      return false
    }
  },
}

// ─── MCP Servers ──────────────────────────────────────────────────────────

export const mcpApi = {
  list: () => apiFetch<McpServerOut[]>('/api/mcp-servers'),
  create: (data: McpServerCreate) => apiPost<McpServerOut>('/api/mcp-servers', data),
  get: (id: string) => apiFetch<McpServerOut>(`/api/mcp-servers/${id}`),
  update: (id: string, data: Partial<McpServerCreate> & { status?: string }) =>
    apiPatch<McpServerOut>(`/api/mcp-servers/${id}`, data),
  delete: (id: string) => apiDelete(`/api/mcp-servers/${id}`),
  test: (id: string) => apiPost<McpTestResult>(`/api/mcp-servers/${id}/test`),
  tools: (id: string) => apiFetch<McpToolsResult>(`/api/mcp-servers/${id}/tools`),
}

// ─── AI Models ────────────────────────────────────────────────────────────

export const modelsApi = {
  list: () => apiFetch<ModelOut[]>('/api/models'),
  create: (data: ModelCreate) => apiPost<ModelOut>('/api/models', data),
  get: (id: string) => apiFetch<ModelOut>(`/api/models/${id}`),
  update: (id: string, data: Partial<ModelCreate> & { status?: string }) =>
    apiPatch<ModelOut>(`/api/models/${id}`, data),
  delete: (id: string) => apiDelete(`/api/models/${id}`),
  test: (id: string) => apiPost<ModelTestResult>(`/api/models/${id}/test`),
}

// ─── Chat ─────────────────────────────────────────────────────────────────

export const chatApi = {
  listSessions: () => apiFetch<ChatSessionOut[]>('/api/chat/sessions'),

  createSession: (data: { title?: string; model_ref?: string; mcp_server_ids?: string[] }) =>
    apiPost<ChatSessionOut>('/api/chat/sessions', data),

  getSession: (id: string) => apiFetch<ChatSessionDetailOut>(`/api/chat/sessions/${id}`),

  updateSession: (id: string, data: { title?: string; model_ref?: string; mcp_server_ids?: string[] }) =>
    apiPatch<ChatSessionOut>(`/api/chat/sessions/${id}`, data),

  deleteSession: (id: string) => apiDelete(`/api/chat/sessions/${id}`),

  getMessages: (sessionId: string) =>
    apiFetch<ChatMessageOut[]>(`/api/chat/sessions/${sessionId}/messages`),

  /**
   * Stream a chat message. Returns an async generator of parsed SSE events.
   */
  streamMessage: async function* (
    sessionId: string,
    content: string,
    opts?: { model_id?: string; mcp_server_ids?: string[] },
  ): AsyncGenerator<ChatSseEvent> {
    const base = getApiBase()
    const resp = await fetch(`${base}/api/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, ...opts }),
    })
    if (!resp.ok || !resp.body) {
      const txt = await resp.text()
      throw new Error(`Stream error ${resp.status}: ${txt}`)
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data:')) {
          const data = trimmed.slice(5).trim()
          if (data && data !== '[DONE]') {
            try {
              yield JSON.parse(data) as ChatSseEvent
            } catch {}
          }
        }
      }
    }
  },
}

// ─── Tasks ────────────────────────────────────────────────────────────────

export const tasksApi = {
  list: () => apiFetch<TaskOut[]>('/api/tasks'),
  create: (data: {
    name: string
    prompt?: string
    model_ref?: string
    mcp_server_ids?: string[]
    steps?: TaskStepOut[]
  }) => apiPost<TaskOut>('/api/tasks', data),
  get: (id: string) => apiFetch<TaskOut>(`/api/tasks/${id}`),
  update: (
    id: string,
    data: { name?: string; status?: string; steps?: TaskStepOut[]; runtime?: string },
  ) => apiPatch<TaskOut>(`/api/tasks/${id}`, data),
  delete: (id: string) => apiDelete(`/api/tasks/${id}`),
}
