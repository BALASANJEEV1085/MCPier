'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/chat': 'Agent Chat',
  '/dashboard/tasks': 'Tasks',
  '/dashboard/tasks/new': 'New Task',
  '/dashboard/mcp-servers': 'MCP Servers',
  '/dashboard/models': 'Models',
  '/dashboard/sandbox': 'Sandbox',
  '/dashboard/activity': 'Activity',
  '/dashboard/settings': 'Settings',
}

function resolveTitle(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith('/dashboard/tasks/')) return 'Task Execution'
  if (pathname.startsWith('/dashboard/mcp-servers/')) return 'MCP Server'
  return 'Dashboard'
}

export function DashboardTopbar() {
  const pathname = usePathname()
  const title = resolveTitle(pathname)
  const showNewTask = pathname !== '/dashboard/tasks/new'

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <h1 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        {showNewTask && (
          <Button size="sm" nativeButton={false} render={<Link href="/dashboard/tasks/new" />}>
            <Plus data-icon="inline-start" />
            New Task
          </Button>
        )}
      </div>
    </header>
  )
}
