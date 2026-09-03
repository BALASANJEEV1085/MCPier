'use client'

import Link from 'next/link'
import { Code2, GitBranch, Plus, Search, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const projects = [
  { name: 'Customer Support MCP', id: 'mcp_customer_support', status: 'Running', updated: '12 min ago', tools: 8 },
  { name: 'Data Analyst', id: 'mcp_data_analyst', status: 'Draft', updated: 'Yesterday', tools: 5 },
  { name: 'GitHub Assistant', id: 'mcp_github_assistant', status: 'Running', updated: 'Aug 28', tools: 12 },
]

export default function CodewritePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Developer workspace</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Codewrite</h1><p className="mt-1 text-sm text-muted-foreground">Your development environment inside MCPier. Build anything, run it safely, and ship with confidence.</p></div>
        <Button render={<Link href="/dashboard/codewrite/new" />}><Plus /> New Project</Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search projects" /></div><Button variant="outline">All projects</Button></div>
      <div className="grid gap-3 lg:grid-cols-3">{projects.map((project) => <Link key={project.id} href={`/dashboard/codewrite/${project.id}`} className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/60"><div className="flex items-start justify-between"><div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Code2 className="size-4" /></div><MoreHorizontal className="size-4 text-muted-foreground" /></div><h2 className="mt-5 font-medium group-hover:text-primary">{project.name}</h2><p className="mt-1 font-mono text-xs text-muted-foreground">{project.id}</p><div className="mt-5 flex items-center justify-between"><Badge variant={project.status === 'Running' ? 'default' : 'secondary'}>{project.status}</Badge><span className="text-xs text-muted-foreground">{project.tools} tools</span></div><div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground"><GitBranch className="size-3.5" /> main <span className="ml-auto">Updated {project.updated}</span></div></Link>)}</div>
    </div>
  )
}
