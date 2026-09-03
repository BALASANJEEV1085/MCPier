'use client'

import { useState } from 'react'
import {
  Cpu,
  Globe,
  Key,
  Layers,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  Zap,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import { ConnectionBadge } from '@/components/dashboard/connection-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useModels } from '@/lib/store'
import { ConnectModelModal, PROVIDER_PRESETS } from '@/components/models/connect-model-modal'
import type { ModelInfo } from '@/lib/mock-data'

export default function ModelsPage() {
  const { models, loaded, removeModel, addModel } = useModels()
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [testingModelId, setTestingModelId] = useState<string | null>(null)
  const [testSuccessId, setTestSuccessId] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const handleTestEndpoint = (modelId: string) => {
    setTestingModelId(modelId)
    setTestSuccessId(null)
    setTimeout(() => {
      setTestingModelId(null)
      setTestSuccessId(modelId)
      setTimeout(() => setTestSuccessId(null), 2500)
    }, 600)
  }

  const handleQuickAddPreset = (presetIndex: number) => {
    const preset = PROVIDER_PRESETS[presetIndex]
    if (!preset) return
    const sample = preset.sampleModels[0]
    const newModel: ModelInfo = {
      id: `${preset.id}-${Date.now().toString().slice(-4)}`,
      name: sample.name,
      modelId: sample.id,
      provider: preset.name,
      endpointUrl: preset.defaultEndpoint,
      apiKey: undefined,
      status: 'connected',
      tasks: 0,
      usage: 0,
      successRate: 100,
      capabilities: ['Code generation', 'Tool calling', 'Structured output', 'Reasoning'],
      contextLength: sample.context,
      createdAt: new Date().toISOString(),
    }
    addModel(newModel)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Infrastructure</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">AI Models</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage foundation models, local Ollama endpoints, and self-hosted inference servers for agent execution.
          </p>
        </div>
        <Button size="sm" onClick={() => setConnectModalOpen(true)} className="gap-2">
          <Plus className="size-4" /> Connect Model
        </Button>
      </div>

      {/* Models Grid or Empty State */}
      {models.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {models.map((model) => (
            <Card key={model.id} className="flex flex-col border-border/80 bg-card hover:border-border transition-all">
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="flex gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground">
                    <Cpu className="size-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-semibold">{model.name}</CardTitle>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {model.provider}
                      </Badge>
                      <ConnectionBadge status={model.status} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove model"
                    onClick={() => removeModel(model.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4 pt-1">
                {/* Highlighted 4 Parameters Connection Card */}
                <div className="rounded-lg border border-border/70 bg-background/60 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-border/50 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="size-3 text-primary" /> Connection Parameters
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">{model.contextLength}</span>
                  </div>

                  {/* 1. Model Provider */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Layers className="size-3 text-muted-foreground/80" /> Model Provider:
                    </span>
                    <span className="font-medium text-foreground text-right">{model.provider}</span>
                  </div>

                  {/* 2. Model Name / ID */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Cpu className="size-3 text-muted-foreground/80" /> Model Name/ID:
                    </span>
                    <div className="flex items-center gap-1">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-primary">
                        {model.modelId || model.name}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(model.modelId || model.name, `modelId-${model.id}`)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy Model ID"
                      >
                        {copiedId === `modelId-${model.id}` ? (
                          <Check className="size-3 text-emerald-400" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 3. Endpoint URL */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Globe className="size-3 text-muted-foreground/80" /> Endpoint URL:
                    </span>
                    <div className="flex items-center gap-1 max-w-[55%] truncate">
                      <span
                        className="truncate font-mono text-[11px] text-muted-foreground hover:text-foreground"
                        title={model.endpointUrl || 'Default Endpoint'}
                      >
                        {model.endpointUrl || 'https://api.openai.com/v1'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(model.endpointUrl || 'https://api.openai.com/v1', `endpoint-${model.id}`)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        title="Copy Endpoint URL"
                      >
                        {copiedId === `endpoint-${model.id}` ? (
                          <Check className="size-3 text-emerald-400" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 4. API Key */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Key className="size-3 text-muted-foreground/80" /> API Key:
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {model.apiKey ? (
                        <span className="text-emerald-400 font-medium">{model.apiKey}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Not required (Local)</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1">
                  {model.capabilities?.map((capability) => (
                    <span
                      key={capability}
                      className="rounded border border-border bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {capability}
                    </span>
                  ))}
                </div>

                {/* Usage & Footer */}
                <div className="mt-auto flex flex-col gap-2.5 border-t border-border pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => handleTestEndpoint(model.id)}
                      disabled={testingModelId === model.id}
                      className="h-7 text-[11px] gap-1"
                    >
                      {testingModelId === model.id ? (
                        <>
                          <RefreshCw className="size-3 animate-spin" /> Ping...
                        </>
                      ) : testSuccessId === model.id ? (
                        <>
                          <Check className="size-3 text-emerald-400" /> 78ms OK
                        </>
                      ) : (
                        <>
                          <Zap className="size-3 text-primary" /> Test Connection
                        </>
                      )}
                    </Button>
                    <div className="flex gap-3 text-[11px] text-muted-foreground">
                      <span>{model.tasks} tasks</span>
                      <span>{model.successRate}% success</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State with Quick Connect Cards */
        <Card className="flex flex-col items-center justify-center border-dashed py-12 px-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/40 text-primary">
            <Cpu className="size-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No AI Models Connected</h3>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Connect an LLM provider using your <strong>API Key</strong>, <strong>Model Provider</strong>,{' '}
            <strong>Endpoint URL</strong>, and <strong>Model Name/ID</strong>.
          </p>

          <Button size="sm" className="mt-5 gap-2" onClick={() => setConnectModalOpen(true)}>
            <Plus className="size-4" /> Connect AI Model
          </Button>

          {/* Quick Connect Presets */}
          <div className="mt-8 w-full max-w-2xl border-t border-border/80 pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Or quick-connect a preset model
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleQuickAddPreset(0)}
                className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground">Claude 3.7 Sonnet</p>
                  <p className="text-[10px] text-muted-foreground">Anthropic API</p>
                </div>
                <Plus className="size-3.5 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickAddPreset(1)}
                className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground">GPT-4o</p>
                  <p className="text-[10px] text-muted-foreground">OpenAI Endpoint</p>
                </div>
                <Plus className="size-3.5 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickAddPreset(2)}
                className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground">Qwen 2.5 Coder</p>
                  <p className="text-[10px] text-muted-foreground">Ollama Localhost</p>
                </div>
                <Plus className="size-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Model Routing Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="size-4 text-muted-foreground" /> Model Routing & Fallbacks
          </CardTitle>
          <CardDescription className="text-xs">
            How agent requests are dispatched across your configured model endpoints.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-md border border-border p-3">
            <p className="font-medium text-foreground">Default Model</p>
            <p className="mt-1 text-muted-foreground font-mono">Auto-select (Best capability)</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="font-medium text-foreground">Fallback Routing</p>
            <p className="mt-1 text-emerald-400">Enabled (Auto-reroute on 429/500)</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="font-medium text-foreground">Inference Mode</p>
            <p className="mt-1 text-muted-foreground">Tool Calling & Streaming</p>
          </div>
        </CardContent>
      </Card>

      {/* Connect Model Modal */}
      <ConnectModelModal open={connectModalOpen} onClose={() => setConnectModalOpen(false)} />
    </div>
  )
}
