'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Task } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

interface LogLine {
  id: number
  text: string
  tone: 'default' | 'muted' | 'success' | 'error'
}

function seedLogs(task: Task): LogLine[] {
  const base: LogLine[] = [
    { id: 1, text: `$ mcpier run "${task.name}"`, tone: 'default' },
    { id: 2, text: `Resolved model: ${task.model}`, tone: 'muted' },
    { id: 3, text: `Connected servers: ${task.mcps.join(', ')}`, tone: 'muted' },
    { id: 4, text: 'Sandbox initialized (ubuntu-22.04, 2 vCPU, 4GB)', tone: 'muted' },
  ]
  task.steps.forEach((step, i) => {
    if (step.status === 'completed') {
      base.push({ id: 10 + i, text: `✓ ${step.label}`, tone: 'success' })
    } else if (step.status === 'failed') {
      base.push({ id: 10 + i, text: `✗ ${step.label} — error: connection timed out`, tone: 'error' })
    } else if (step.status === 'running') {
      base.push({ id: 10 + i, text: `… ${step.label}`, tone: 'default' })
    }
  })
  return base
}

export function TaskLivePanel({ task }: { task: Task }) {
  const [logs, setLogs] = useState<LogLine[]>(() => seedLogs(task))

  useEffect(() => {
    if (task.status !== 'running') return
    const extra = [
      'Running test suite… 14/18 passed',
      'Fetching dependency graph from registry',
      'Provisioning container network',
      'Streaming build output',
    ]
    let i = 0
    const interval = setInterval(() => {
      setLogs((prev) => [...prev, { id: prev.length + 1, text: extra[i % extra.length], tone: 'muted' }])
      i += 1
    }, 2600)
    return () => clearInterval(interval)
  }, [task.status])

  const toneClass: Record<LogLine['tone'], string> = {
    default: 'text-foreground',
    muted: 'text-muted-foreground',
    success: 'text-chart-1',
    error: 'text-destructive',
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-[14px] font-medium text-muted-foreground">Execution Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[420px] overflow-y-auto rounded-md bg-background/60 p-4 font-mono text-[12.5px] leading-relaxed">
          {logs.map((log) => (
            <p key={log.id} className={cn('whitespace-pre-wrap', toneClass[log.tone])}>
              {log.text}
            </p>
          ))}
          {task.status === 'running' && (
            <span className="inline-block h-3.5 w-1.5 animate-pulse bg-foreground/60 align-middle" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
