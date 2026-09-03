'use client'

import Link from 'next/link'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ListTodo, Plus } from 'lucide-react'
import { useTasks } from '@/lib/store'

export default function TasksPage() {
  const { tasks } = useTasks()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workloads</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and inspect autonomous agent execution workloads.</p>
        </div>
        <Link href="/dashboard/tasks/new" className={buttonVariants({ size: 'sm' })}>
          <Plus data-icon="inline-start" /> Create Task
        </Link>
      </div>

      {tasks.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[12px] text-muted-foreground">
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">MCP Servers</th>
                <th className="px-4 py-3 font-medium">Runtime</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/tasks/${task.id}`} className="font-medium text-foreground hover:underline">
                      {task.name}
                    </Link>
                    <p className="mt-0.5 font-mono text-[11.5px] text-muted-foreground">{task.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{task.model}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {task.mcps.map((mcp) => (
                        <Badge key={mcp} variant="secondary">
                          {mcp}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{task.runtime}</td>
                  <td className="px-4 py-3 text-muted-foreground">{task.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <ListTodo className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No tasks yet</h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Create your first autonomous task to start orchestrating MCP tools and agent workflows.
          </p>
          <Link href="/dashboard/tasks/new" className={buttonVariants({ size: 'sm', className: 'mt-4' })}>
            <Plus data-icon="inline-start" /> Create New Task
          </Link>
        </Card>
      )}
    </div>
  )
}
