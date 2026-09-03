'use client'

/**
 * MCPier Store — React hooks for global state.
 *
 * Strategy:
 *   1. On mount, fetch from backend API.
 *   2. All mutations go to backend API.
 *   3. If the backend is unreachable, gracefully fallback to localStorage
 *      so the UI stays functional offline / before DB is configured.
 */

import { useState, useEffect, useCallback } from 'react'
import type {
  McpServer,
  Task,
  ActivityLogEntry,
  LiveActivityItem,
  Sandbox,
  ModelInfo,
  TopTool,
  ChatSession,
} from '@/lib/mock-data'
import {
  mcpApi,
  modelsApi,
  chatApi,
  tasksApi,
  healthApi,
  type McpServerOut,
  type ModelOut,
  type ChatSessionOut,
  type TaskOut,
} from '@/lib/api-client'

// ─── Backend reachability (cached promise) ────────────────────────────────

let _backendReachable: boolean | null = null
let _reachabilityPromise: Promise<boolean> | null = null

async function isBackendReachable(): Promise<boolean> {
  if (_backendReachable !== null) return _backendReachable
  if (!_reachabilityPromise) {
    _reachabilityPromise = healthApi.isReachable().then((v) => {
      _backendReachable = v
      return v
    })
  }
  return _reachabilityPromise
}

// ─── localStorage fallback helpers ────────────────────────────────────────

const STORAGE_KEYS = {
  TASKS: 'mcpier_tasks',
  MCP_SERVERS: 'mcpier_mcp_servers',
  MODELS: 'mcpier_models',
  SANDBOXES: 'mcpier_sandboxes',
  LOGS: 'mcpier_logs',
  LIVE_ACTIVITY: 'mcpier_live_activity',
  CHATS: 'mcpier_chats',
}

function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const item = window.localStorage.getItem(key)
    return item ? JSON.parse(item) : fallback
  } catch {
    return fallback
  }
}

// Silent store for caching fetched API data (does NOT dispatch event)
function setStoredCache<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error('Failed to store cache', err)
  }
}

// User mutation store (dispatches event for offline tab sync)
function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    window.dispatchEvent(new Event('mcpier_storage_update'))
  } catch (err) {
    console.error('Failed to store data', err)
  }
}

// ─── Type adapters: backend → frontend types ──────────────────────────────

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Just now'
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return 'Recent'
  }
}

function adaptMcpServer(s: McpServerOut): McpServer {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    status: s.status as McpServer['status'],
    toolsCount: s.status === 'connected' ? 14 : 0,
    resourcesCount: 2,
    promptsCount: 1,
    lastActivity: formatRelativeTime(s.updated_at),
    environment: (s.environment as McpServer['environment']) ?? 'Development',
    description: s.description,
    capabilities: ['Tools', 'Resources', 'Prompts'],
    tools: [
      { name: `${s.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_query`, description: `Query resources from ${s.name}`, permission: 'read', status: 'enabled', calls: 0 },
      { name: `${s.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_execute`, description: `Execute actions on ${s.name}`, permission: 'execute', status: 'enabled', calls: 0 },
    ],
  }
}

function adaptModel(m: ModelOut): ModelInfo {
  return {
    id: m.id,
    name: m.name,
    modelId: m.model_id,
    provider: m.provider,
    endpointUrl: m.endpoint_url,
    apiKey: m.api_key_masked ?? undefined,
    status: m.status as ModelInfo['status'],
    tasks: 0,
    usage: 0,
    successRate: 0,
    capabilities: m.capabilities,
    contextLength: m.context_length,
    createdAt: m.created_at,
  }
}

function adaptTask(t: TaskOut): Task {
  return {
    id: t.id,
    name: t.name,
    status: t.status as Task['status'],
    model: t.model_ref,
    mcps: t.mcp_server_ids,
    runtime: t.runtime ?? '—',
    created: t.created_at,
    steps: t.steps.map((s) => ({
      id: s.id,
      label: s.label,
      status: s.status as Task['status'],
      detail: s.detail ?? undefined,
    })),
  }
}

function adaptChatSession(s: ChatSessionOut): ChatSession {
  return {
    id: s.id,
    title: s.title,
    model: s.model_ref,
    selectedMcps: s.mcp_server_ids,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    messages: [],
  }
}

// ─── useMcpServers ────────────────────────────────────────────────────────

export function useMcpServers() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const online = await isBackendReachable()
    if (online) {
      try {
        const data = await mcpApi.list()
        const adapted = data.map(adaptMcpServer)
        setServers(adapted)
        setStoredCache(STORAGE_KEYS.MCP_SERVERS, adapted)
        return
      } catch (e) {
        console.warn('Backend fetch failed, falling back to localStorage', e)
      }
    }
    setServers(getStored<McpServer[]>(STORAGE_KEYS.MCP_SERVERS, []))
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoaded(true))

    const handler = () => refresh()
    window.addEventListener('mcpier_storage_update', handler)
    return () => window.removeEventListener('mcpier_storage_update', handler)
  }, [refresh])

  const addServer = async (serverData: Omit<McpServer, 'id'> & {
    serverUrl?: string
    transport?: string
    authToken?: string
    stdioCommand?: string
  }) => {
    const online = await isBackendReachable()
    if (online) {
      try {
        const created = await mcpApi.create({
          name: serverData.name,
          category: serverData.category,
          description: serverData.description,
          server_url: serverData.serverUrl ?? '',
          transport: (serverData.transport as 'http' | 'sse' | 'stdio') ?? 'http',
          stdio_command: serverData.stdioCommand,
          auth_token: serverData.authToken,
          environment: serverData.environment,
        })
        await refresh()
        return created
      } catch (e) {
        console.warn('Backend create failed, using localStorage', e)
      }
    }
    // Fallback
    const server = { ...serverData, id: crypto.randomUUID() } as McpServer
    const current = getStored<McpServer[]>(STORAGE_KEYS.MCP_SERVERS, [])
    setStored(STORAGE_KEYS.MCP_SERVERS, [server, ...current])
    setServers((prev) => [server, ...prev])
    return server
  }

  const removeServer = async (id: string) => {
    const online = await isBackendReachable()
    if (online) {
      try {
        await mcpApi.delete(id)
        await refresh()
        return
      } catch (e) {
        console.warn('Backend delete failed, using localStorage', e)
      }
    }
    const current = getStored<McpServer[]>(STORAGE_KEYS.MCP_SERVERS, [])
    const updated = current.filter((s) => s.id !== id)
    setStored(STORAGE_KEYS.MCP_SERVERS, updated)
    setServers(updated)
  }

  const testServer = async (id: string) => {
    const online = await isBackendReachable()
    if (online) {
      return mcpApi.test(id)
    }
    return { success: false, error: 'Backend not reachable' }
  }

  const getServerTools = async (id: string) => {
    const online = await isBackendReachable()
    if (online) {
      return mcpApi.tools(id)
    }
    return { success: false, tools: [], error: 'Backend not reachable' }
  }

  return { servers, loaded, addServer, removeServer, testServer, getServerTools, refresh }
}

// ─── useModels ────────────────────────────────────────────────────────────

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const online = await isBackendReachable()
    if (online) {
      try {
        const data = await modelsApi.list()
        const adapted = data.map(adaptModel)
        setModels(adapted)
        setStoredCache(STORAGE_KEYS.MODELS, adapted)
        return
      } catch (e) {
        console.warn('Backend fetch failed, falling back to localStorage', e)
      }
    }
    setModels(getStored<ModelInfo[]>(STORAGE_KEYS.MODELS, []))
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoaded(true))

    const handler = () => refresh()
    window.addEventListener('mcpier_storage_update', handler)
    return () => window.removeEventListener('mcpier_storage_update', handler)
  }, [refresh])

  const addModel = async (modelData: ModelInfo & { apiKey?: string }) => {
    const online = await isBackendReachable()
    if (online) {
      try {
        const created = await modelsApi.create({
          name: modelData.name,
          model_id: modelData.modelId,
          provider: modelData.provider,
          endpoint_url: modelData.endpointUrl,
          api_key: modelData.apiKey,
          context_length: modelData.contextLength,
          capabilities: modelData.capabilities,
        })
        await refresh()
        return adaptModel(created)
      } catch (e) {
        console.warn('Backend create failed, using localStorage', e)
      }
    }
    const current = getStored<ModelInfo[]>(STORAGE_KEYS.MODELS, [])
    const updated = [modelData, ...current]
    setStored(STORAGE_KEYS.MODELS, updated)
    setModels(updated)
    return modelData
  }

  const updateModel = async (id: string, updates: Partial<ModelInfo>) => {
    const online = await isBackendReachable()
    if (online) {
      try {
        await modelsApi.update(id, {
          name: updates.name,
          model_id: updates.modelId,
          provider: updates.provider,
          endpoint_url: updates.endpointUrl,
          context_length: updates.contextLength,
          capabilities: updates.capabilities,
          status: updates.status,
        })
        await refresh()
        return
      } catch (e) {
        console.warn('Backend update failed, using localStorage', e)
      }
    }
    const current = getStored<ModelInfo[]>(STORAGE_KEYS.MODELS, [])
    const updated = current.map((m) => (m.id === id ? { ...m, ...updates } : m))
    setStored(STORAGE_KEYS.MODELS, updated)
    setModels(updated)
  }

  const removeModel = async (id: string) => {
    const online = await isBackendReachable()
    if (online) {
      try {
        await modelsApi.delete(id)
        await refresh()
        return
      } catch (e) {
        console.warn('Backend delete failed, using localStorage', e)
      }
    }
    const current = getStored<ModelInfo[]>(STORAGE_KEYS.MODELS, [])
    const updated = current.filter((m) => m.id !== id)
    setStored(STORAGE_KEYS.MODELS, updated)
    setModels(updated)
  }

  const testModel = async (id: string) => {
    const online = await isBackendReachable()
    if (online) {
      return modelsApi.test(id)
    }
    return { success: false, available_models: [], error: 'Backend not reachable' }
  }

  return { models, loaded, addModel, updateModel, removeModel, testModel, refresh }
}

// ─── useTasks ────────────────────────────────────────────────────────────

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const online = await isBackendReachable()
    if (online) {
      try {
        const data = await tasksApi.list()
        const adapted = data.map(adaptTask)
        setTasks(adapted)
        setStoredCache(STORAGE_KEYS.TASKS, adapted)
        return
      } catch (e) {
        console.warn('Backend fetch failed, falling back to localStorage', e)
      }
    }
    setTasks(getStored<Task[]>(STORAGE_KEYS.TASKS, []))
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoaded(true))

    const handler = () => refresh()
    window.addEventListener('mcpier_storage_update', handler)
    return () => window.removeEventListener('mcpier_storage_update', handler)
  }, [refresh])

  const addTask = async (task: Task) => {
    const online = await isBackendReachable()
    if (online) {
      try {
        const created = await tasksApi.create({
          name: task.name,
          model_ref: task.model,
          mcp_server_ids: task.mcps,
          steps: task.steps.map((s) => ({ id: s.id, label: s.label, status: s.status, detail: s.detail })),
        })
        await refresh()
        return
      } catch (e) {
        console.warn('Backend create failed, using localStorage', e)
      }
    }
    const current = getStored<Task[]>(STORAGE_KEYS.TASKS, [])
    const updated = [task, ...current]
    setStored(STORAGE_KEYS.TASKS, updated)
    setTasks(updated)
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const online = await isBackendReachable()
    if (online) {
      try {
        await tasksApi.update(id, {
          name: updates.name,
          status: updates.status,
          runtime: updates.runtime,
          steps: updates.steps?.map((s) => ({ id: s.id, label: s.label, status: s.status, detail: s.detail })),
        })
        await refresh()
        return
      } catch (e) {
        console.warn('Backend update failed, using localStorage', e)
      }
    }
    const current = getStored<Task[]>(STORAGE_KEYS.TASKS, [])
    const updated = current.map((t) => (t.id === id ? { ...t, ...updates } : t))
    setStored(STORAGE_KEYS.TASKS, updated)
    setTasks(updated)
  }

  const deleteTask = async (id: string) => {
    const online = await isBackendReachable()
    if (online) {
      try {
        await tasksApi.delete(id)
        await refresh()
        return
      } catch (e) {
        console.warn('Backend delete failed, using localStorage', e)
      }
    }
    const current = getStored<Task[]>(STORAGE_KEYS.TASKS, [])
    const updated = current.filter((t) => t.id !== id)
    setStored(STORAGE_KEYS.TASKS, updated)
    setTasks(updated)
  }

  return { tasks, loaded, addTask, updateTask, deleteTask, refresh }
}

// ─── useChats ────────────────────────────────────────────────────────────

export function useChats() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const online = await isBackendReachable()
    if (online) {
      try {
        const data = await chatApi.listSessions()
        const adapted = data.map(adaptChatSession)
        setSessions(adapted)
        setStoredCache(STORAGE_KEYS.CHATS, adapted)
        return
      } catch (e) {
        console.warn('Backend fetch failed, falling back to localStorage', e)
      }
    }
    setSessions(getStored<ChatSession[]>(STORAGE_KEYS.CHATS, []))
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoaded(true))

    const handler = () => refresh()
    window.addEventListener('mcpier_storage_update', handler)
    return () => window.removeEventListener('mcpier_storage_update', handler)
  }, [refresh])

  const saveSession = async (session: ChatSession) => {
    const online = await isBackendReachable()
    if (online) {
      try {
        // Check if session exists
        const existing = sessions.find((s) => s.id === session.id)
        if (existing) {
          await chatApi.updateSession(session.id, {
            title: session.title,
            model_ref: session.model,
            mcp_server_ids: session.selectedMcps,
          })
        } else {
          await chatApi.createSession({
            title: session.title,
            model_ref: session.model,
            mcp_server_ids: session.selectedMcps,
          })
        }
        await refresh()
        return
      } catch (e) {
        console.warn('Backend save failed, using localStorage', e)
      }
    }
    const current = getStored<ChatSession[]>(STORAGE_KEYS.CHATS, [])
    const index = current.findIndex((s) => s.id === session.id)
    let updated: ChatSession[]
    if (index >= 0) {
      updated = [...current]
      updated[index] = session
    } else {
      updated = [session, ...current]
    }
    setStored(STORAGE_KEYS.CHATS, updated)
    setSessions(updated)
  }

  const deleteSession = async (id: string) => {
    const online = await isBackendReachable()
    if (online) {
      try {
        await chatApi.deleteSession(id)
        await refresh()
        return
      } catch (e) {
        console.warn('Backend delete failed, using localStorage', e)
      }
    }
    const current = getStored<ChatSession[]>(STORAGE_KEYS.CHATS, [])
    const updated = current.filter((s) => s.id !== id)
    setStored(STORAGE_KEYS.CHATS, updated)
    setSessions(updated)
  }

  const clearAllSessions = async () => {
    const online = await isBackendReachable()
    if (online) {
      try {
        await Promise.all(sessions.map((s) => chatApi.deleteSession(s.id)))
        setSessions([])
        setStored(STORAGE_KEYS.CHATS, [])
        return
      } catch (e) {
        console.warn('Backend clear failed, using localStorage', e)
      }
    }
    setStored(STORAGE_KEYS.CHATS, [])
    setSessions([])
  }

  return { sessions, loaded, saveSession, deleteSession, clearAllSessions, refresh }
}
