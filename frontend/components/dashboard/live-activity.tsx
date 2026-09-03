'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { liveActivity as seedActivity, type LiveActivityItem } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { Activity } from 'lucide-react'

const statusStyles: Record<LiveActivityItem['status'], string> = {
  running: 'text-chart-3',
  completed: 'text-chart-2',
  failed: 'text-destructive',
}

export function LiveActivity() {
  const [items] = useState<LiveActivityItem[]>(seedActivity)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[14px] font-medium text-muted-foreground">Live Activity</CardTitle>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="inline-flex size-1.5 rounded-full bg-chart-2" />
          </span>
          Live
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="truncate text-[13px] font-medium text-foreground">{item.operation}</p>
                <p className="truncate text-[12px] text-muted-foreground">
                  {item.agent} <span className="text-muted-foreground/50">via</span> {item.source}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-[11.5px] text-muted-foreground">{item.runtime}</span>
                <Badge variant="outline" className={cn('capitalize', statusStyles[item.status])}>
                  {item.status}
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="size-8 text-muted-foreground/30" />
            <p className="mt-3 text-xs font-medium text-foreground">No Live Activity</p>
            <p className="mt-1 max-w-[200px] text-[11.5px] text-muted-foreground">
              Autonomous agent executions and tool calls will appear here in real time.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
