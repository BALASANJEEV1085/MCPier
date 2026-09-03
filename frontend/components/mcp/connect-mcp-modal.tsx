'use client'

import { useState } from 'react'
import { Check, ArrowLeft, Search, X, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MCP_CATALOG, type McpCatalogItem } from '@/lib/mcp-catalog'
import { McpLogo } from '@/components/mcp/mcp-logo'
import { useMcpServers } from '@/lib/store'
import type { McpServer } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'

interface ConnectMcpModalProps {
  open: boolean
  onClose: () => void
  initialSelectedId?: string
}

export function ConnectMcpModal({ open, onClose, initialSelectedId }: ConnectMcpModalProps) {
  const { servers, addServer } = useMcpServers()
  const [selectedMcp, setSelectedMcp] = useState<McpCatalogItem | null>(() => {
    return initialSelectedId ? MCP_CATALOG.find((m) => m.id === initialSelectedId) || null : null
  })
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<string>('All')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [connecting, setConnecting] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!open) return null

  const groups = ['All', 'DevOps & Tooling', 'Databases & Storage', 'Cloud & Infrastructure', 'Productivity & Apps', 'Observability & Monitoring']

  const filteredCatalog = MCP_CATALOG.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
    const matchesGroup = groupFilter === 'All' || item.group === groupFilter
    return matchesSearch && matchesGroup
  })

  const handleSelect = (item: McpCatalogItem) => {
    setSelectedMcp(item)
    // Initialize default field values
    const initialValues: Record<string, any> = {}
    item.fields.forEach((field) => {
      initialValues[field.name] = field.defaultValue ?? ''
    })
    setFormData(initialValues)
    setSuccess(false)
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleConnect = () => {
    if (!selectedMcp) return
    setConnecting(true)

    const serverUrl = formData.url || formData.server_url || (selectedMcp.id === 'github' ? 'https://api.githubcopilot.com/mcp/' : '')
    const transport = formData.transport || (selectedMcp.id === 'github' ? 'http' : formData.server_command ? 'stdio' : 'http')
    const authToken = formData.token || formData.auth_token || formData.api_key || undefined
    const stdioCommand = formData.server_command || formData.stdio_command || undefined

    const newServer: McpServer = {
      id: `${selectedMcp.id}-${Date.now().toString().slice(-4)}`,
      name: selectedMcp.name,
      category: selectedMcp.category,
      status: 'connected',
      toolsCount: selectedMcp.fields.length + 3,
      resourcesCount: 2,
      promptsCount: 1,
      lastActivity: 'Just now',
      environment: 'Development',
      description: selectedMcp.description,
      capabilities: ['Tools', 'Resources', 'Prompts'],
      tools: [
        { name: `${selectedMcp.id}_execute`, description: `Execute ${selectedMcp.name} actions`, permission: 'execute', status: 'enabled', calls: 0 },
        { name: `${selectedMcp.id}_query`, description: `Query resources from ${selectedMcp.name}`, permission: 'read', status: 'enabled', calls: 0 },
      ],
    }

    setTimeout(() => {
      addServer({
        ...newServer,
        serverUrl,
        transport,
        authToken,
        stdioCommand,
      })
      setConnecting(false)
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSelectedMcp(null)
        setSuccess(false)
      }, 1200)
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            {selectedMcp ? (
              <button
                type="button"
                onClick={() => setSelectedMcp(null)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" /> Back to catalog
              </button>
            ) : (
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">Connect MCP Server</h2>
                <p className="text-xs text-muted-foreground">Select a server to configure credentials and endpoint details.</p>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedMcp ? (
            /* Configure Selected MCP */
            <div className="flex flex-col gap-6">
              <div className="flex items-start justify-between rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-lg border border-border bg-card shadow-xs">
                    <McpLogo iconKey={selectedMcp.iconKey} size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{selectedMcp.name}</h3>
                      <Badge variant="secondary" className="text-[11px]">{selectedMcp.category}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{selectedMcp.description}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-background/50 p-4">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <span className="font-medium text-foreground">Required Details: </span>
                    {selectedMcp.detailsSummary}
                  </div>
                </div>
              </div>

              {/* Dynamic Field Form */}
              <div className="grid gap-4 sm:grid-cols-2">
                {selectedMcp.fields.map((field) => {
                  const isFullWidth = field.type === 'textarea' || field.name === 'connection_string' || field.name === 'kubeconfig'

                  return (
                    <div key={field.name} className={isFullWidth ? 'sm:col-span-2 flex flex-col gap-1.5' : 'flex flex-col gap-1.5'}>
                      <label className="text-xs font-medium text-foreground">
                        {field.label} {field.required && <span className="text-destructive">*</span>}
                      </label>

                      {field.type === 'select' ? (
                        <select
                          value={formData[field.name] || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                        >
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <label className="flex cursor-pointer items-center gap-2 py-1">
                          <input
                            type="checkbox"
                            checked={Boolean(formData[field.name])}
                            onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                            className="size-4 rounded border-border"
                          />
                          <span className="text-xs text-muted-foreground">{field.description || 'Enable'}</span>
                        </label>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          placeholder={field.placeholder}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          className="w-full rounded-md border border-input bg-background p-2.5 font-mono text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                        />
                      ) : (
                        <Input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      )}

                      {field.description && field.type !== 'checkbox' && (
                        <p className="text-[11px] text-muted-foreground">{field.description}</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {success ? (
                <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-xs text-success">
                  <Check className="size-4" />
                  <span>Successfully connected {selectedMcp.name}! Saved to workspace.</span>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" size="sm" onClick={() => setSelectedMcp(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConnect} disabled={connecting || success}>
                  <Sparkles data-icon="inline-start" />
                  {connecting ? 'Validating connection…' : 'Connect Server'}
                </Button>
              </div>
            </div>
          ) : (
            /* Catalog Grid with Filters */
            <div className="flex flex-col gap-5">
              {/* Search & Categories */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    className="h-8 pl-8 text-xs"
                    placeholder="Search 21 MCP servers (e.g. GitHub, AWS, Postgres, Notion)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
                {groups.map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setGroupFilter(grp)}
                    className={`rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors ${
                      groupFilter === grp
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>

              {/* Catalog Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCatalog.map((item) => {
                  const isAlreadyConnected = servers.some((s) => s.name.toLowerCase().includes(item.name.toLowerCase().split(' ')[0]))

                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex size-10 items-center justify-center rounded-md border border-border bg-muted/40">
                            <McpLogo iconKey={item.iconKey} size={22} />
                          </div>
                          <Badge variant="outline" className="text-[10.5px]">
                            {item.category}
                          </Badge>
                        </div>
                        <h4 className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary">
                          {item.name}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {item.fields.length} config {item.fields.length === 1 ? 'field' : 'fields'}
                        </span>
                        <Button
                          size="xs"
                          variant={isAlreadyConnected ? 'outline' : 'default'}
                          onClick={() => handleSelect(item)}
                        >
                          {isAlreadyConnected ? 'Configure' : 'Connect'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {filteredCatalog.length === 0 && (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No MCP servers match &ldquo;{search}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
