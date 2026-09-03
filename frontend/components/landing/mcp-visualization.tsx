'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const positions = [
  { top: '4%', left: '50%' },
  { top: '24%', left: '92%' },
  { top: '62%', left: '96%' },
  { top: '92%', left: '62%' },
  { top: '92%', left: '18%' },
  { top: '24%', left: '8%' },
]

const protocolNodes = [
  { id: 'github-mcp', name: 'GitHub MCP', status: 'connected', toolsCount: 6, tools: [{ name: 'create_pr' }, { name: 'search_code' }], capabilities: ['Repo access', 'Branch creation'] },
  { id: 'aws-mcp', name: 'AWS MCP', status: 'connected', toolsCount: 8, tools: [{ name: 'deploy_app' }, { name: 'get_logs' }], capabilities: ['Cloud compute', 'Serverless'] },
  { id: 'postgres-mcp', name: 'Postgres MCP', status: 'connected', toolsCount: 5, tools: [{ name: 'run_query' }, { name: 'migrate' }], capabilities: ['SQL queries', 'Schema inspection'] },
  { id: 'docker-mcp', name: 'Docker MCP', status: 'connected', toolsCount: 4, tools: [{ name: 'build_image' }], capabilities: ['Container build', 'Registry push'] },
  { id: 'slack-mcp', name: 'Slack MCP', status: 'connected', toolsCount: 3, tools: [{ name: 'send_msg' }], capabilities: ['Notifications', 'Webhooks'] },
  { id: 'custom-mcp', name: 'Custom MCP', status: 'connected', toolsCount: 4, tools: [{ name: 'call_tool' }], capabilities: ['Internal tools', 'APIs'] },
]

const nodes = protocolNodes.map((server, i) => ({
  ...server,
  position: positions[i],
}))

export function McpVisualization({ activeIds = [] as string[] }: { activeIds?: string[] }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const focused = nodes.find((n) => n.id === (selected ?? hovered)) ?? null

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {nodes.map((node) => {
          const isActive = activeIds.includes(node.id) || hovered === node.id || selected === node.id
          return (
            <line
              key={node.id}
              x1="50"
              y1="50"
              x2={parseFloat(node.position.left)}
              y2={parseFloat(node.position.top)}
              stroke={isActive ? 'var(--accent)' : 'var(--border-strong)'}
              strokeWidth={isActive ? 0.6 : 0.4}
              className="transition-all duration-200"
            />
          )
        })}
      </svg>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center gap-1 rounded-md border border-border-strong bg-surface-elevated px-3.5 py-2.5 shadow-sm">
          <span className="size-1.5 rounded-full bg-accent" />
          <span className="text-[12px] font-semibold text-foreground">MCPier Agent</span>
        </div>
      </div>

      {nodes.map((node) => {
        const isActive = activeIds.includes(node.id)
        const isFocused = hovered === node.id || selected === node.id
        return (
          <button
            key={node.id}
            type="button"
            style={{ top: node.position.top, left: node.position.left }}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 rounded-md border bg-surface-elevated px-2.5 py-1.5 text-left transition-all duration-200',
              isFocused || isActive
                ? 'border-accent shadow-[0_0_0_1px_var(--accent)]'
                : 'border-border hover:border-border-strong',
            )}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setSelected((s) => (s === node.id ? null : node.id))}
            aria-expanded={selected === node.id}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  isActive ? 'bg-accent' : 'bg-muted-foreground/50',
                )}
              />
              <span className="whitespace-nowrap text-[11px] font-medium text-foreground">{node.name}</span>
            </div>
            <div className="mt-0.5 whitespace-nowrap text-[10px] text-muted-foreground">
              {node.status === 'connected' ? 'Connected' : 'Disconnected'} · {node.toolsCount} tools
            </div>
          </button>
        )
      })}

      {focused && (
        <div className="absolute inset-x-0 bottom-0 translate-y-[calc(100%+12px)] rounded-md border border-border bg-popover p-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-foreground">{focused.name}</span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-accent">
              <span className="size-1.5 rounded-full bg-accent" />
              Connected
            </span>
          </div>
          {selected === focused.id ? (
            <div className="mt-2 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Tools</p>
              <ul className="space-y-1 font-mono text-[11px] text-foreground">
                {focused.tools.slice(0, 4).map((tool) => (
                  <li key={tool.name} className="text-muted-foreground">
                    {tool.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-2 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Capabilities</p>
              <ul className="space-y-0.5 text-[12px] text-foreground">
                {focused.capabilities.map((cap) => (
                  <li key={cap}>{cap}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
