'use client'

import { ArrowUpRight, Minus } from 'lucide-react'
import { useTasks, useMcpServers } from '@/lib/store'
import { cn } from '@/lib/utils'

export function KpiCards() {
  const { tasks } = useTasks()
  const { servers } = useMcpServers()

  const tasksExecuted = tasks.length
  const tasksCompleted = tasks.filter((t) => t.status === 'completed').length
  const activeExecutions = tasks.filter((t) => t.status === 'running').length
  const toolCalls = servers.reduce((acc, s) => acc + s.tools.reduce((tAcc, tool) => tAcc + (tool.calls || 0), 0), 0)

  const successRate = tasksExecuted > 0 ? Math.round((tasksCompleted / tasksExecuted) * 100) : 0

  const items = [
    {
      label: 'Tasks Executed',
      value: tasksExecuted.toLocaleString(),
      delta: tasksExecuted > 0 ? `${tasksExecuted} total` : 'No tasks executed yet',
      trend: tasksExecuted > 0 ? ('up' as const) : ('flat' as const),
    },
    {
      label: 'Tasks Completed',
      value: tasksCompleted.toLocaleString(),
      delta: tasksExecuted > 0 ? `${successRate}% success rate` : '0% success rate',
      trend: tasksCompleted > 0 ? ('up' as const) : ('flat' as const),
    },
    {
      label: 'MCP Tool Calls',
      value: toolCalls.toLocaleString(),
      delta: toolCalls > 0 ? `${toolCalls} calls` : 'No calls recorded',
      trend: toolCalls > 0 ? ('up' as const) : ('flat' as const),
    },
    {
      label: 'Active Executions',
      value: activeExecutions.toLocaleString(),
      delta: activeExecutions > 0 ? `${activeExecutions} currently running` : '0 currently running',
      trend: activeExecutions > 0 ? ('up' as const) : ('flat' as const),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((kpi) => (
        <div key={kpi.label} className="rounded-lg border border-border bg-card p-5">
          <p className="text-[13px] text-muted-foreground">{kpi.label}</p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground">{kpi.value}</p>
          <div
            className={cn(
              'mt-2 flex items-center gap-1 text-[12.5px]',
              kpi.trend === 'up' ? 'text-chart-2' : 'text-muted-foreground',
            )}
          >
            {kpi.trend === 'up' ? <ArrowUpRight className="size-3.5" /> : <Minus className="size-3.5" />}
            <span>{kpi.delta}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
