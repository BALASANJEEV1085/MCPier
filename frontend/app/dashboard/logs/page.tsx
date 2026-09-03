'use client'

import { useState } from 'react'
import { Download, FileSearch, Search } from 'lucide-react'
import { activityLog as seedLogs, type ActivityLogEntry } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function LogsPage() {
  const [logs] = useState<ActivityLogEntry[]>(seedLogs)
  const [search, setSearch] = useState('')

  const filteredLogs = logs.filter(
    (l) =>
      l.task.toLowerCase().includes(search.toLowerCase()) ||
      l.component.toLowerCase().includes(search.toLowerCase()) ||
      l.tool.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Observability</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Search execution output across tasks, tools, and sandboxes.</p>
        </div>
        <Button variant="outline" size="sm" disabled={logs.length === 0}>
          <Download data-icon="inline-start" /> Export
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileSearch className="size-4 text-muted-foreground" /> Execution logs
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={logs.length === 0}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="border-y border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Task</th>
                    <th className="px-4 py-3 font-medium">Component</th>
                    <th className="px-4 py-3 font-medium">Event</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{entry.timestamp}</td>
                      <td className="px-4 py-3">{entry.task}</td>
                      <td className="px-4 py-3 text-muted-foreground">{entry.component}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{entry.tool}</td>
                      <td
                        className={`px-4 py-3 capitalize ${
                          entry.status === 'failed'
                            ? 'text-destructive'
                            : entry.status === 'completed'
                            ? 'text-success'
                            : 'text-warning'
                        }`}
                      >
                        {entry.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileSearch className="size-8 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium text-foreground">No execution logs found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Task execution output and tool telemetry will stream here automatically.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
