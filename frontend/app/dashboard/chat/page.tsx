'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Bot,
  User,
  Sparkles,
  Cpu,
  Network,
  Plus,
  Trash2,
  Copy,
  Check,
  Code2,
  ChevronDown,
  ChevronRight,
  Terminal,
  RefreshCw,
  Search,
  MessageSquare,
  Zap,
  ShieldAlert,
  ArrowDown,
  Paperclip,
  Maximize2,
  Download,
  Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useModels, useMcpServers, useChats } from '@/lib/store'
import type { ChatMessage, ChatSession, ChatToolCall } from '@/lib/mock-data'
import { chatApi, healthApi } from '@/lib/api-client'

const DEFAULT_STARTER_PROMPTS = [
  {
    title: 'Analyze Repository Code',
    description: 'Use GitHub & Filesystem MCPs to inspect repository structure and report code quality.',
    prompt: 'Please search the repository for all API route handlers and summarize their authentication security posture.',
    mcp: 'GitHub MCP',
  },
  {
    title: 'PostgreSQL Database Query',
    description: 'Inspect schemas, run analytical SQL queries, and generate optimized indexes.',
    prompt: 'Query our Postgres database for the top 5 active customer accounts and write an optimized migration for indexing.',
    mcp: 'Postgres MCP',
  },
  {
    title: 'Build & Test Docker Sandbox',
    description: 'Create containerized execution environments and verify automated test suites.',
    prompt: 'Generate a multi-stage Dockerfile for our Next.js application, spin up a test container, and verify the build.',
    mcp: 'Filesystem MCP',
  },
  {
    title: 'Debug Deployment & Logs',
    description: 'Diagnose runtime errors, analyze logs, and propose corrective code diffs.',
    prompt: 'Investigate recent task execution logs for connection timeout errors and formulate a fix.',
    mcp: 'Autonomous Agent',
  },
]

const AGENT_PERSONAS = [
  { id: 'fullstack', label: 'Full-Stack Agent', desc: 'Autonomous coding, debugging & API development' },
  { id: 'devops', label: 'DevOps & Infra Agent', desc: 'Docker, Kubernetes, CI/CD pipelines & deployment' },
  { id: 'database', label: 'Data & SQL Specialist', desc: 'PostgreSQL, Redis, migrations & query tuning' },
  { id: 'security', label: 'Security & Audit Agent', desc: 'Vulnerability scan, secret leakage & permissions' },
]

export default function AgentChatPage() {
  const { models } = useModels()
  const { servers } = useMcpServers()
  const { sessions, saveSession, deleteSession } = useChats()

  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [selectedMcps, setSelectedMcps] = useState<string[]>([])
  const [selectedPersona, setSelectedPersona] = useState<string>('fullstack')
  const [inputMessage, setInputMessage] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null)
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})
  const [searchHistory, setSearchHistory] = useState<string>('')
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Initialize active session from existing sessions if not selected
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id)
    }
  }, [sessions, activeSessionId])

  // Sync active model: if connected models exist, prioritize the user's connected model
  useEffect(() => {
    if (models.length > 0) {
      const exists = models.some((m) => m.name === selectedModel || m.id === selectedModel)
      if (!exists || !selectedModel) {
        setSelectedModel(models[0].name)
      }
    } else if (!selectedModel) {
      setSelectedModel('Gemini 2.5 Flash')
    }
  }, [models, selectedModel])

  // Sync active MCP tools
  useEffect(() => {
    if (servers.length > 0 && selectedMcps.length === 0) {
      setSelectedMcps(servers.slice(0, 3).map((s) => s.name))
    }
  }, [servers])

  const activeSession = sessions.find((s) => s.id === activeSessionId) || {
    id: activeSessionId || 'default',
    title: 'New Agent Chat',
    model: selectedModel || 'Claude 3.7 Sonnet',
    selectedMcps: selectedMcps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  }

  // Load messages whenever active session changes
  useEffect(() => {
    if (isGenerating) return
    if (!activeSessionId || activeSessionId.startsWith('session-') || activeSessionId === 'default') {
      return
    }

    let cancelled = false
    chatApi.getSession(activeSessionId)
      .then((detail) => {
        if (!cancelled && !isGenerating && detail && detail.messages) {
          const msgs: ChatMessage[] = detail.messages.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            model: m.model_used || undefined,
            toolCalls: (m.tool_calls || []).map((tc) => ({
              id: tc.id,
              toolName: tc.tool_name,
              serverName: tc.server_name,
              arguments: typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : tc.arguments,
              output: tc.output || undefined,
              status: (tc.status === 'failed' ? 'failed' : tc.status === 'running' ? 'running' : 'completed') as 'running' | 'completed' | 'failed',
            })),
            isThinking: false,
            thinkingContent: m.thinking_content || undefined,
          }))
          setLocalMessages(msgs)
        }
      })
      .catch(() => {
        const local = sessions.find((s) => s.id === activeSessionId)
        if (!cancelled && local?.messages) {
          setLocalMessages(local.messages)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeSessionId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [localMessages, isGenerating])

  const createNewChat = () => {
    const newId = `session-${Date.now().toString().slice(-6)}`
    setActiveSessionId(newId)
    setLocalMessages([])
  }

  const toggleMcpSelection = (mcpName: string) => {
    setSelectedMcps((prev) =>
      prev.includes(mcpName) ? prev.filter((m) => m !== mcpName) : [...prev, mcpName]
    )
  }

  const toggleToolExpand = (toolId: string) => {
    setExpandedTools((prev) => ({ ...prev, [toolId]: !prev[toolId] }))
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCodeId(id)
    setTimeout(() => setCopiedCodeId(null), 1500)
  }

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim()
    if (!text || isGenerating) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const currentMsgs = localMessages.length > 0 ? localMessages : (activeSession.messages || [])
    const updatedMessages = [...currentMsgs, userMessage]
    const updatedTitle =
      currentMsgs.length === 0
        ? text.slice(0, 32) + (text.length > 32 ? '...' : '')
        : activeSession.title

    setLocalMessages(updatedMessages)
    setInputMessage('')
    setIsGenerating(true)

    // ── Real Backend SSE Streaming ────────────────────────────────────────
    const backendOnline = await healthApi.isReachable()
    const assistantId = `msg-${Date.now()}-assistant`

    if (!backendOnline) {
      const liveMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: `⚠️ Error: Backend API is unreachable. Please ensure the Python backend is running on port 8300.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: selectedModel,
        isThinking: false,
      }
      setLocalMessages([...updatedMessages, liveMsg])
      setIsGenerating(false)
      return
    }

    try {
      const activeMcpIds = selectedMcps.length > 0
        ? servers.filter((s) => selectedMcps.includes(s.name) || selectedMcps.includes(s.id)).map((s) => s.id)
        : servers.map((s) => s.id)

      let backendSessionId = activeSession.id
      if (!backendSessionId || backendSessionId.startsWith('session-') || backendSessionId === 'default') {
        const created = await chatApi.createSession({
          title: updatedTitle,
          model_ref: selectedModel,
          mcp_server_ids: activeMcpIds,
        })
        backendSessionId = created.id
        setActiveSessionId(created.id)
      }

      const toolCallsLive: ChatToolCall[] = []
      let streamedContent = ''
      let thinkingText = ''
      let isDone = false

      const updateDisplay = (done = false, finalContent?: string) => {
        const liveMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: finalContent ?? streamedContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: selectedModel,
          toolCalls: [...toolCallsLive],
          isThinking: !done,
          thinkingContent: thinkingText || undefined,
        }
        setLocalMessages([...updatedMessages, liveMsg])
      }

      updateDisplay(false)

      const targetModel = models.find(
        (m) => m.name === selectedModel || m.id === selectedModel || m.modelId === selectedModel
      )

      for await (const event of chatApi.streamMessage(backendSessionId, text, {
        model_id: targetModel?.id || targetModel?.name || selectedModel,
        mcp_server_ids: activeMcpIds,
      })) {
        if (event.type === 'thinking') {
          thinkingText = event.content
          updateDisplay(false)
        } else if (event.type === 'tool_call') {
          toolCallsLive.push({
            id: event.id,
            toolName: event.tool_name,
            serverName: event.server_name,
            arguments: event.arguments as Record<string, any>,
            status: 'running',
          })
          updateDisplay(false)
        } else if (event.type === 'tool_result') {
          const tc = toolCallsLive.find((t) => t.id === event.id)
          if (tc) {
            tc.output = event.output
            tc.status = event.success ? 'completed' : 'failed'
            tc.durationMs = event.duration_ms
          }
          updateDisplay(false)
        } else if (event.type === 'content') {
          streamedContent += event.chunk
          updateDisplay(false)
        } else if (event.type === 'done') {
          isDone = true
          const finalTxt = streamedContent || event.content
          updateDisplay(true, finalTxt)
          // Save completed session once to backend/store
          const finalAssistantMsg: ChatMessage = {
            id: assistantId,
            role: 'assistant',
            content: finalTxt,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            model: selectedModel,
            toolCalls: [...toolCallsLive],
            isThinking: false,
          }
          saveSession({
            id: backendSessionId,
            title: updatedTitle,
            model: selectedModel,
            selectedMcps: selectedMcps,
            createdAt: activeSession.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [...updatedMessages, finalAssistantMsg],
          })
        } else if (event.type === 'error') {
          updateDisplay(true, `⚠️ ${event.message}`)
        }
      }

      setIsGenerating(false)
    } catch (err) {
      console.warn('Backend streaming error:', err)
      const liveMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: `⚠️ Error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: selectedModel,
        isThinking: false,
      }
      setLocalMessages([...updatedMessages, liveMsg])
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchHistory.toLowerCase())
  )

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-background md:-m-6">
      {/* Top Header / Control Bar */}
      <div className="flex h-13 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sessions Sidebar"
            className="text-muted-foreground hover:text-foreground"
          >
            <MessageSquare className="size-4" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <Bot className="size-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                <span>Agent Chat</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.2 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                  Ready
                </span>
              </h2>
            </div>
          </div>
        </div>

        {/* Model & MCP Controls */}
        <div className="flex items-center gap-2.5">
          {/* Persona selector */}
          <div className="hidden sm:flex items-center gap-1.5">
            <select
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              className="h-8 rounded-md border border-input bg-background/80 px-2.5 text-xs text-foreground outline-none focus:border-ring"
            >
              {AGENT_PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Model Selector */}
          <div className="flex items-center gap-1">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground outline-none focus:border-ring"
            >
              {models.length > 0 ? (
                models.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.provider})
                  </option>
                ))
              ) : (
                <>
                  <option value="Claude 3.7 Sonnet">Claude 3.7 Sonnet (Anthropic)</option>
                  <option value="GPT-4o">GPT-4o (OpenAI)</option>
                  <option value="Gemini 2.5 Flash">Gemini 2.5 Flash (Google)</option>
                  <option value="DeepSeek R1">DeepSeek R1 (OpenRouter)</option>
                  <option value="Qwen 2.5 Coder">Qwen 2.5 Coder (Ollama)</option>
                </>
              )}
            </select>
          </div>

          <Button size="xs" variant="outline" onClick={createNewChat} className="h-8 gap-1.5 text-xs">
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        </div>
      </div>

      {/* Main Container: Sidebar + Chat Feed */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Chat History Sidebar */}
        <div
          className={`${
            sidebarOpen ? 'w-64 border-r' : 'w-0 border-r-0'
          } hidden shrink-0 flex-col overflow-hidden border-border bg-card/50 transition-all duration-200 lg:flex`}
        >
          <div className="p-3 border-b border-border/70 flex flex-col gap-2">
            <Button size="sm" onClick={createNewChat} className="w-full justify-start gap-2 h-8 text-xs">
              <Plus className="size-3.5" /> New Agent Session
            </Button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="h-7 pl-8 text-xs bg-background/60"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session) => {
                const isActive = session.id === activeSessionId
                return (
                  <div
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-1">
                      <MessageSquare className={`size-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="truncate">{session.title || 'Untitled Chat'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSession(session.id)
                        if (activeSessionId === session.id) {
                          const remaining = sessions.filter((s) => s.id !== session.id)
                          if (remaining.length > 0) setActiveSessionId(remaining[0].id)
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive p-1 rounded transition-opacity"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                )
              })
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">No chat history</div>
            )}
          </div>

          {/* Active MCPs indicator at bottom of sidebar */}
          <div className="border-t border-border p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
              <span>Connected Tools</span>
              <span className="text-primary font-mono">{selectedMcps.length} active</span>
            </p>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {servers.length > 0 ? (
                servers.map((s) => {
                  const isSelected = selectedMcps.includes(s.name)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleMcpSelection(s.name)}
                      className={`rounded px-1.5 py-0.5 text-[10px] transition-colors border ${
                        isSelected
                          ? 'border-primary/40 bg-primary/15 text-primary-foreground font-medium'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-border-strong'
                      }`}
                    >
                      {s.name}
                    </button>
                  )
                })
              ) : (
                <span className="text-[11px] text-muted-foreground italic">No custom MCP servers</span>
              )}
            </div>
          </div>
        </div>

        {/* Central Chat View */}
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {localMessages.length === 0 ? (
              /* Empty Chat Hero & Starter Prompts */
              <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-8 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/5">
                  <Bot className="size-7" />
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                  How can I help you today?
                </h2>
                <p className="mt-1.5 max-w-md text-xs text-muted-foreground">
                  I can orchestrate connected MCP tools, query private databases, inspect repositories, and execute verified code in secure sandboxes.
                </p>

                {/* Quick Starter Grid */}
                <div className="mt-8 grid w-full gap-3 sm:grid-cols-2 text-left">
                  {DEFAULT_STARTER_PROMPTS.map((starter) => (
                    <button
                      key={starter.title}
                      type="button"
                      onClick={() => handleSendMessage(starter.prompt)}
                      className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3.5 transition-all hover:border-primary/50 hover:bg-muted/40 text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {starter.title}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-mono">
                          {starter.mcp}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {starter.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message Thread */
              <div className="mx-auto max-w-3xl space-y-6">
                {localMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary shadow-xs">
                        <Bot className="size-4" />
                      </div>
                    )}

                    <div
                      className={`flex flex-col gap-2 max-w-[85%] ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* Message Bubble Header */}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
                        <span className="font-medium text-foreground">
                          {msg.role === 'user' ? 'You' : msg.model || 'Agent'}
                        </span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      {/* Tool Calls Execution Box (for Assistant) */}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="w-full space-y-2">
                          {msg.toolCalls.map((tool) => {
                            const isExpanded = expandedTools[tool.id]
                            return (
                              <div
                                key={tool.id}
                                className="rounded-lg border border-border/80 bg-muted/40 overflow-hidden text-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleToolExpand(tool.id)}
                                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                                >
                                  <div className="flex items-center gap-2 font-mono text-[11px]">
                                    <Terminal className="size-3.5 text-primary" />
                                    <span className="text-foreground font-semibold">Tool Invocation:</span>
                                    <span className="text-primary">{tool.toolName}</span>
                                    <Badge variant="secondary" className="text-[9px] font-normal py-0">
                                      {tool.serverName}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                                      <Check className="size-3" /> {tool.durationMs}ms
                                    </span>
                                    {isExpanded ? (
                                      <ChevronDown className="size-3.5 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="size-3.5 text-muted-foreground" />
                                    )}
                                  </div>
                                </button>

                                {isExpanded && (
                                  <div className="border-t border-border/60 p-3 bg-background/50 space-y-2 font-mono text-[11px]">
                                    <div>
                                      <span className="text-muted-foreground block mb-1">Arguments:</span>
                                      <pre className="rounded bg-muted/60 p-2 overflow-x-auto text-[11px] text-foreground">
                                        {JSON.stringify(tool.arguments, null, 2)}
                                      </pre>
                                    </div>
                                    {tool.output && (
                                      <div>
                                        <span className="text-muted-foreground block mb-1">Response Payload:</span>
                                        <pre className="rounded bg-muted/60 p-2 overflow-x-auto text-[11px] text-emerald-400">
                                          {tool.output}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Main Message Content Box */}
                      <div
                        className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground font-medium rounded-tr-xs'
                            : 'bg-card border border-border text-foreground rounded-tl-xs shadow-xs'
                        }`}
                      >
                        {msg.isThinking && !msg.content ? (
                          <div className="flex items-center gap-2.5 py-0.5 text-muted-foreground">
                            <span className="flex gap-1 items-center">
                              <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                              <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                              <span className="size-1.5 rounded-full bg-primary animate-bounce" />
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium">
                              {msg.thinkingContent || 'Agent is reasoning & generating...'}
                            </span>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap font-sans break-words space-y-2">
                            {msg.content}
                            {msg.isThinking && (
                              <span className="inline-block w-1.5 h-3 bg-primary ml-1 animate-pulse align-middle" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Message Actions */}
                      {msg.role === 'assistant' && msg.content && (
                        <div className="flex items-center gap-1 px-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            {copiedCodeId === msg.id ? (
                              <>
                                <Check className="size-3 text-emerald-400" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                        <User className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="border-t border-border bg-card/60 p-3 md:p-4 backdrop-blur-md">
            <div className="mx-auto max-w-3xl">
              <div className="relative rounded-xl border border-border bg-background shadow-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring transition-all">
                {/* Active MCP Pills Header inside input */}
                <div className="flex items-center justify-between border-b border-border/50 px-3 py-1.5 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <Network className="size-3.5 text-primary shrink-0" />
                    <span className="font-medium text-foreground">Active MCPs:</span>
                    {selectedMcps.length > 0 ? (
                      selectedMcps.map((mcp) => (
                        <span
                          key={mcp}
                          className="rounded bg-muted/80 px-1.5 py-0.2 font-mono text-[10px] text-foreground"
                        >
                          {mcp}
                        </span>
                      ))
                    ) : (
                      <span className="italic text-[10px]">None selected</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                    {selectedModel}
                  </span>
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask ${selectedModel} to invoke tools, analyze repositories, or run code... (Shift+Enter for newline)`}
                  rows={2}
                  className="w-full resize-none bg-transparent p-3 text-xs text-foreground placeholder:text-muted-foreground outline-none"
                />

                {/* Footer Toolbar */}
                <div className="flex items-center justify-between px-3 pb-2 pt-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-foreground"
                      title="Attach file context"
                    >
                      <Paperclip className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-foreground"
                      title="Tool Configuration"
                    >
                      <Settings2 className="size-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {inputMessage.length > 0 ? `${inputMessage.length} chars` : ''}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleSendMessage()}
                      disabled={!inputMessage.trim() || isGenerating}
                      className="h-7 gap-1 px-3 text-xs"
                    >
                      {isGenerating ? (
                        <RefreshCw className="size-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>Send</span>
                          <Send className="size-3" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <p className="mt-1.5 text-center text-[10.5px] text-muted-foreground">
                MCPier Agent executes authenticated tool calls within configured security boundaries and sandboxes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
