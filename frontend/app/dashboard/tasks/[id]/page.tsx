'use client'

import { use } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TaskStepList } from '@/components/dashboard/task-step-list'
import { TaskLivePanel } from '@/components/dashboard/task-live-panel'
import { useTasks } from '@/lib/store'
import { ArrowLeft, ListTodo } from 'lucide-react'

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { tasks, loaded } = useTasks()

  const task = tasks.find((t) => t.id === id)

  if (!task && loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <ListTodo className="size-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">Task Not Found</h3>
        <p className="mt-1 text-xs text-muted-foreground">The task &ldquo;{id}&rdquo; does not exist or has been deleted.</p>
        <Link href="/dashboard/tasks" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4' })}>
          <ArrowLeft data-icon="inline-start" /> Back to Tasks
        </Link>
      </div>
    )
  }

  if (!task) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading task details...</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-foreground">{task.name}</h2>
            <StatusBadge status={task.status} />
          </div>
          <p className="font-mono text-[12px] text-muted-foreground">
            {task.id} · {task.model} · runtime {task.runtime} · created {task.created}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {task.mcps.map((mcp) => (
            <Badge key={mcp} variant="secondary">
              {mcp}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-[14px] font-medium text-muted-foreground">Execution Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskStepList steps={task.steps} />
          </CardContent>
        </Card>

        <TaskLivePanel task={task} />
      </div>
    </div>
  )
}
