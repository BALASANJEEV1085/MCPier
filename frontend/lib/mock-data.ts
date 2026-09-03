// Type definitions and dynamic data structures for MCPier.
// All hardcoded mock datasets have been cleared.

export type ExecutionStatus = 'completed' | 'running' | 'pending' | 'failed'
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

export interface McpTool {
  name: string
  description: string
  permission: 'read' | 'write' | 'execute'
  status: 'enabled' | 'disabled'
  calls: number
}

export interface McpServer {
  id: string
  name: string
  category: string
  status: ConnectionStatus
  toolsCount: number
  resourcesCount: number
  promptsCount: number
  lastActivity: string
  environment: 'Production' | 'Development' | 'Local' | 'Private'
  description: string
  capabilities: string[]
  tools: McpTool[]
}

export interface TaskStep {
  id: string
  label: string
  status: ExecutionStatus
  detail?: string
}

export interface Task {
  id: string
  name: string
  status: ExecutionStatus
  model: string
  mcps: string[]
  runtime: string
  created: string
  steps: TaskStep[]
}

export interface LiveActivityItem {
  id: string
  agent: string
  source: string
  operation: string
  runtime: string
  status: 'running' | 'completed' | 'failed'
}

export interface ActivityLogEntry {
  id: string
  timestamp: string
  task: string
  component: string
  tool: string
  event: string
  status: 'started' | 'completed' | 'failed'
}

export interface Sandbox {
  id: string
  task: string
  status: 'running' | 'idle' | 'terminated'
  cpu: number
  memory: string
  runtime: string
  started: string
}

export interface ModelInfo {
  id: string
  name: string
  modelId: string
  provider: string
  endpointUrl: string
  apiKey?: string
  status: ConnectionStatus
  tasks: number
  usage: number
  successRate: number
  capabilities: string[]
  contextLength: string
  createdAt?: string
}

export interface ChatToolCall {
  id: string
  toolName: string
  serverName: string
  arguments: Record<string, any> | string
  output?: string
  status: 'running' | 'completed' | 'failed'
  durationMs?: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  model?: string
  toolCalls?: ChatToolCall[]
  isThinking?: boolean
  thinkingContent?: string
}

export interface ChatSession {
  id: string
  title: string
  model: string
  selectedMcps: string[]
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

export interface TopTool {
  name: string
  calls: number
}

export interface ChartPoint {
  date: string
  label: string
  completed: number
  failed: number
  running: number
}

// Initial empty collections (All mock rows removed)
export const mcpServers: McpServer[] = []
export const tasks: Task[] = []
export const taskSteps: TaskStep[] = []
export const liveActivity: LiveActivityItem[] = []
export const activityLog: ActivityLogEntry[] = []
export const sandboxes: Sandbox[] = []
export const models: ModelInfo[] = []
export const topTools: TopTool[] = []
export const recentChanges: string[] = []

export const kpis = [
  { label: 'Tasks Executed', value: '0', delta: 'No tasks run yet', trend: 'flat' as const },
  { label: 'Tasks Completed', value: '0', delta: '0% success rate', trend: 'flat' as const },
  { label: 'MCP Tool Calls', value: '0', delta: 'No calls recorded', trend: 'flat' as const },
  { label: 'Active Executions', value: '0', delta: '0 currently running', trend: 'flat' as const },
]

export const currentUser = {
  name: 'Workspace User',
  email: 'user@mcpier.dev',
  plan: 'Community',
  initials: 'WU',
}

export function generateChartData(days = 7, baseDate: Date = new Date()): ChartPoint[] {
  const points: ChartPoint[] = []
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - i)
    const month = months[d.getMonth()]
    const day = d.getDate()
    const dateStr = `${month} ${day}`
    points.push({
      date: dateStr,
      label: dateStr,
      completed: 0,
      failed: 0,
      running: 0,
    })
  }
  return points
}
