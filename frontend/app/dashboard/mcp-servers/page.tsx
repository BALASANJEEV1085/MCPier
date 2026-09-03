'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, Network, Plus, RefreshCw, Search, Sparkles, Trash2, Zap } from 'lucide-react'
import { ConnectionBadge } from '@/components/dashboard/connection-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useMcpServers } from '@/lib/store'
import { McpLogo } from '@/components/mcp/mcp-logo'
import { ConnectMcpModal } from '@/components/mcp/connect-mcp-modal'
import { MCP_CATALOG } from '@/lib/mcp-catalog'

export default function McpServersPage() {
  const { servers, removeServer, testServer } = useMcpServers()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedInitialId, setSelectedInitialId] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; latency?: number }>>({})

  const filteredServers = servers.filter((server) =>
    server.name.toLowerCase().includes(search.toLowerCase()) ||
    server.category.toLowerCase().includes(search.toLowerCase()) ||
    server.description.toLowerCase().includes(search.toLowerCase())
  )

  const openConnectFor = (id?: string) => {
    setSelectedInitialId(id)
    setModalOpen(true)
  }

  const handleTest = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setTestingId(id)
    try {
      const res = await testServer(id)
      setTestResult((prev) => ({
        ...prev,
        [id]: { success: res.success, latency: res.latency_ms ?? 80 },
      }))
    } finally {
      setTestingId(null)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    await removeServer(id)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Infrastructure</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">MCP Servers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect Model Context Protocol servers to grant your agents secure tool and data access.
          </p>
        </div>
        <Button size="sm" onClick={() => openConnectFor(undefined)}>
          <Plus data-icon="inline-start" /> Add Server
        </Button>
      </div>

      {/* Connected Servers List */}
      {servers.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-muted-foreground">
              <span className="font-mono font-medium text-foreground">{servers.filter((s) => s.status === 'connected').length}</span> of{' '}
              <span className="font-mono font-medium text-foreground">{servers.length}</span> servers connected
            </p>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                className="h-8 pl-8 text-xs"
                placeholder="Filter connected servers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServers.map((server) => (
              <div key={server.id} className="relative group">
                <Link href={`/dashboard/mcp-servers/${server.id}`}>
                  <Card className="h-full transition-all hover:border-primary/60 hover:shadow-xs flex flex-col">
                    <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/40">
                          <McpLogo name={server.name} size={22} />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold text-foreground">{server.name}</CardTitle>
                          <p className="mt-0.5 text-xs text-muted-foreground">{server.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ConnectionBadge status={server.status} />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Remove server"
                          onClick={(e) => handleDelete(e, server.id)}
                          className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col justify-between gap-3 pt-1">
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{server.description}</p>
                      
                      <div className="mt-auto pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={(e) => handleTest(e, server.id)}
                          disabled={testingId === server.id}
                          className="h-6 text-[11px] gap-1 px-2"
                        >
                          {testingId === server.id ? (
                            <>
                              <RefreshCw className="size-2.5 animate-spin" /> Ping...
                            </>
                          ) : testResult[server.id]?.success ? (
                            <>
                              <Check className="size-2.5 text-emerald-400" /> {testResult[server.id]?.latency}ms OK
                            </>
                          ) : (
                            <>
                              <Zap className="size-2.5 text-primary" /> Test
                            </>
                          )}
                        </Button>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>
                            <span className="font-mono text-foreground font-medium">{server.toolsCount}</span> tools
                          </span>
                          <span className="text-muted-foreground/70">{server.lastActivity}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <Card className="flex flex-col items-center justify-center border-dashed py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Network className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No MCP servers connected</h3>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Connect your cloud infrastructure, databases, source control, browser automation, and developer tools to give your AI agents autonomous capabilities.
          </p>
          <Button size="sm" className="mt-4" onClick={() => openConnectFor(undefined)}>
            <Plus data-icon="inline-start" /> Connect an MCP Server
          </Button>
        </Card>
      )}

      {/* Available MCP Catalog Showcase */}
      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Supported MCP Integrations (21 Available)
            </h2>
            <p className="text-xs text-muted-foreground">Click any server to configure and connect instantly.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {MCP_CATALOG.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openConnectFor(item.id)}
              className="group flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-3 text-center transition-all hover:border-primary/60 hover:bg-muted/40"
            >
              <div className="flex size-10 items-center justify-center rounded-md border border-border/60 bg-muted/20 transition-transform group-hover:scale-105">
                <McpLogo iconKey={item.iconKey} size={20} />
              </div>
              <span className="truncate w-full text-[11.5px] font-medium text-foreground group-hover:text-primary">
                {item.name.replace(' MCP', '')}
              </span>
              <span className="text-[10px] text-muted-foreground line-clamp-1">{item.category}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Connect Modal */}
      <ConnectMcpModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialSelectedId={selectedInitialId}
      />
    </div>
  )
}
