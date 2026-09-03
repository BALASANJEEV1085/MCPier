'use client'

import Link from 'next/link'
import { ArrowLeft, Check, ExternalLink, KeyRound, Network, Play, RefreshCw } from 'lucide-react'
import { useParams } from 'next/navigation'
import { ConnectionBadge } from '@/components/dashboard/connection-badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMcpServers } from '@/lib/store'
import { McpLogo } from '@/components/mcp/mcp-logo'

export default function McpDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { servers, loaded } = useMcpServers()
  const server = servers.find((item) => item.id === id)

  if (!server && loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Network className="size-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">MCP Server Not Found</h3>
        <p className="mt-1 text-xs text-muted-foreground">The requested MCP server &ldquo;{id}&rdquo; is not connected.</p>
        <Link href="/dashboard/mcp-servers" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4' })}>
          <ArrowLeft data-icon="inline-start" /> Back to MCP Servers
        </Link>
      </div>
    )
  }

  if (!server) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading server details...</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/mcp-servers" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to MCP servers
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3.5 items-center">
          <div className="flex size-14 items-center justify-center rounded-xl border border-border bg-muted/40 shadow-xs">
            <McpLogo name={server.name} size={30} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{server.name}</h1>
              <ConnectionBadge status={server.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{server.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw data-icon="inline-start" /> Reconnect
          </Button>
          <Button size="sm">
            <Play data-icon="inline-start" /> Test connection
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tools</p>
            <p className="mt-2 font-mono text-xl">{server.toolsCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Resources</p>
            <p className="mt-2 font-mono text-xl">{server.resourcesCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Environment</p>
            <p className="mt-2 text-sm">{server.environment}</p>
          </CardContent>
        </Card>
      </div>
      <Tabs defaultValue="tools">
        <TabsList>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>
        <TabsContent value="tools">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available tools</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {server.tools.map((tool) => (
                  <div key={tool.name} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-mono text-sm">{tool.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="capitalize text-muted-foreground">{tool.permission}</span>
                      <span className="font-mono text-muted-foreground">{tool.calls.toLocaleString()} calls</span>
                      <span className="flex items-center gap-1 text-success">
                        <Check className="size-3.5" /> enabled
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="capabilities">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Server capabilities</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {server.capabilities.map((capability) => (
                <span key={capability} className="border border-border px-3 py-2 text-xs">
                  {capability}
                </span>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <KeyRound className="size-4 text-muted-foreground" /> Connection configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between border-b border-border py-3">
                <span className="text-muted-foreground">Transport</span>
                <span>Streamable HTTP / stdio</span>
              </div>
              <div className="flex justify-between border-b border-border py-3">
                <span className="text-muted-foreground">Endpoint</span>
                <span className="flex items-center gap-1 font-mono text-xs">
                  mcpier.dev/{server.id}
                  <ExternalLink className="size-3" />
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-muted-foreground">Authentication</span>
                <span>Workspace encrypted token</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
