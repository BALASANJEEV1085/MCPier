'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMcpServers } from '@/lib/store'
import { Wrench, Network, History } from 'lucide-react'

export function OperatorPanel() {
  const { servers } = useMcpServers()
  const connectedCount = servers.filter((s) => s.status === 'connected').length

  // Extract tools from servers if available
  const allTools = servers.flatMap((s) => s.tools || [])
  const sortedTools = [...allTools].sort((a, b) => b.calls - a.calls).slice(0, 5)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-[14px] font-medium text-muted-foreground">Top Tools</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {sortedTools.length > 0 ? (
            sortedTools.map((tool, i) => {
              const max = sortedTools[0]?.calls || 1
              const pct = Math.round((tool.calls / max) * 100)
              return (
                <div key={tool.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-mono text-foreground">
                      {i + 1}. {tool.name}
                    </span>
                    <span className="text-muted-foreground">{tool.calls.toLocaleString()}</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-muted">
                    <div className="h-1 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Wrench className="size-5 text-muted-foreground/40" />
              <p className="mt-2 text-xs text-muted-foreground">No tool calls recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[14px] font-medium text-muted-foreground">MCP Health</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-foreground">{connectedCount}</span>
            <span className="text-[13px] text-muted-foreground">of {servers.length} servers connected</span>
          </div>
          {servers.length > 0 ? (
            <div className="flex flex-col gap-2">
              {servers.slice(0, 4).map((server) => (
                <div key={server.id} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-foreground">{server.name}</span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-chart-2" />
                    {server.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-3 text-center">
              <Network className="size-5 text-muted-foreground/40" />
              <p className="mt-2 text-xs text-muted-foreground">No MCP servers connected</p>
              <Link href="/dashboard/mcp-servers" className="mt-1 text-xs font-medium text-primary hover:underline">
                + Connect server
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[14px] font-medium text-muted-foreground">Recent Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <History className="size-5 text-muted-foreground/40" />
            <p className="mt-2 text-xs text-muted-foreground">No recent configuration changes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
