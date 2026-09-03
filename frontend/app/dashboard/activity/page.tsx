'use client'

import { useState } from 'react'
import { Activity, CheckCircle2, Clock3, Filter, XCircle } from 'lucide-react'
import { activityLog as seedLogs, type ActivityLogEntry } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const icons = { started: Clock3, completed: CheckCircle2, failed: XCircle }

export default function ActivityPage() {
  const [logs] = useState<ActivityLogEntry[]>(seedLogs)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Observability</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">A unified timeline of agent and infrastructure events.</p>
        </div>
        <Button variant="outline" size="sm" disabled={logs.length === 0}>
          <Filter data-icon="inline-start" /> Filters
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="size-4 text-muted-foreground" /> Recent activity
          </CardTitle>
          <span className="text-xs text-muted-foreground">Live stream</span>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length > 0 ? (
            <div className="divide-y divide-border">
              {logs.map((entry) => {
                const Icon = icons[entry.status]
                return (
                  <div key={entry.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[90px_1fr_auto] sm:items-center">
                    <span className="font-mono text-xs text-muted-foreground">{entry.timestamp}</span>
                    <div className="flex items-start gap-3">
                      <Icon
                        className={`mt-0.5 size-4 ${
                          entry.status === 'failed'
                            ? 'text-destructive'
                            : entry.status === 'completed'
                            ? 'text-success'
                            : 'text-warning'
                        }`}
                      />
                      <div>
                        <p className="text-sm">
                          {entry.event} <span className="text-muted-foreground">in {entry.task}</span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {entry.component} · <span className="font-mono">{entry.tool}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs capitalize text-muted-foreground">{entry.status}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="size-8 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium text-foreground">No recent activity events</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Agent actions, tool calls, and model invocations will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
