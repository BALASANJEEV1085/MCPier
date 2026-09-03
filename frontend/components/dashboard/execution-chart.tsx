'use client'

import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { generateChartData } from '@/lib/mock-data'
import { useTasks } from '@/lib/store'

const chartConfig: ChartConfig = {
  completed: { label: 'Completed', color: 'var(--chart-1)' },
  running: { label: 'Running', color: 'var(--chart-4)' },
  failed: { label: 'Failed', color: 'var(--chart-2)' },
}

export function ExecutionChart() {
  const { tasks } = useTasks()
  const [data, setData] = useState(() => generateChartData(7))

  useEffect(() => {
    // Generate 7-day points and populate with actual task counts if any exist
    const basePoints = generateChartData(7)
    if (tasks.length > 0) {
      // Map tasks to days if created dates match
      const lastPoint = basePoints[basePoints.length - 1]
      if (lastPoint) {
        lastPoint.completed = tasks.filter((t) => t.status === 'completed').length
        lastPoint.running = tasks.filter((t) => t.status === 'running').length
        lastPoint.failed = tasks.filter((t) => t.status === 'failed').length
      }
    }
    setData(basePoints)
  }, [tasks])

  return (
    <Card className="col-span-1 flex h-full flex-col lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="text-[14px] font-medium text-muted-foreground">Task Executions</CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--chart-1)]" /> Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--chart-4)]" /> Running
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--chart-2)]" /> Failed
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            7 Days (Rolling)
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-2 pb-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-full min-h-[300px] w-full flex-1">
          <AreaChart data={data} margin={{ left: 10, right: 10, top: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillRunning" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-4)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-4)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillFailed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
              padding={{ left: 14, right: 14 }}
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area dataKey="completed" type="monotone" stroke="var(--chart-1)" fill="url(#fillCompleted)" strokeWidth={2} />
            <Area dataKey="running" type="monotone" stroke="var(--chart-4)" fill="url(#fillRunning)" strokeWidth={2} />
            <Area dataKey="failed" type="monotone" stroke="var(--chart-2)" fill="url(#fillFailed)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
