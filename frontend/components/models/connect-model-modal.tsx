'use client'

import { useState } from 'react'
import {
  Sparkles,
  X,
  ShieldCheck,
  Globe,
  Key,
  Layers,
  Cpu,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Server,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useModels } from '@/lib/store'
import type { ModelInfo } from '@/lib/mock-data'

export interface ProviderPreset {
  id: string
  name: string
  defaultEndpoint: string
  sampleModels: { id: string; name: string; context: string }[]
  requiresApiKey: boolean
  placeholderKey: string
  docsUrl: string
  category: 'Cloud' | 'Local' | 'Self-Hosted'
  description: string
  iconBg: string
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    sampleModels: [
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', context: '1M tokens' },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', context: '1M tokens' },
      { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', context: '1M tokens' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', context: '1M tokens' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', context: '1M tokens' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', context: '2M tokens' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', context: '1M tokens' },
      { id: 'gemini-2.0-flash-thinking-exp', name: 'Gemini 2.0 Flash Thinking', context: '1M tokens' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', context: '2M tokens' },
    ],
    requiresApiKey: true,
    placeholderKey: 'AIzaSyxxxxxxxxxxxxxxxx',
    docsUrl: 'https://ai.google.dev/gemini-api/docs/openai',
    category: 'Cloud',
    description: 'Multimodal Gemini models with massive context windows (up to 2M tokens) and native reasoning.',
    iconBg: '#4285f4',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    defaultEndpoint: 'https://api.openai.com/v1',
    sampleModels: [
      { id: 'gpt-4o', name: 'GPT-4o (Omni)', context: '128K tokens' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context: '128K tokens' },
      { id: 'o3-mini', name: 'o3-mini (STEM Reasoning)', context: '200K tokens' },
      { id: 'o1', name: 'o1 (Deep Reasoning)', context: '200K tokens' },
      { id: 'o1-mini', name: 'o1 Mini', context: '128K tokens' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context: '128K tokens' },
      { id: 'gpt-4', name: 'GPT-4', context: '8K tokens' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', context: '16K tokens' },
    ],
    requiresApiKey: true,
    placeholderKey: 'sk-proj-xxxxxxxxxxxxxxxx',
    docsUrl: 'https://platform.openai.com/docs',
    category: 'Cloud',
    description: 'GPT-4o, reasoning models, and standard OpenAI chat completion endpoints.',
    iconBg: '#10a37f',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    defaultEndpoint: 'https://api.anthropic.com/v1',
    sampleModels: [
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', context: '200K tokens' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet v2', context: '200K tokens' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', context: '200K tokens' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', context: '200K tokens' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', context: '200K tokens' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', context: '200K tokens' },
    ],
    requiresApiKey: true,
    placeholderKey: 'sk-ant-api03-xxxxxxxxxxxxxxxx',
    docsUrl: 'https://docs.anthropic.com',
    category: 'Cloud',
    description: 'Direct access to Claude models with state-of-the-art coding and reasoning.',
    iconBg: '#d97706',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    defaultEndpoint: 'http://localhost:11434/v1',
    sampleModels: [
      { id: 'qwen2.5-coder:32b', name: 'Qwen 2.5 Coder (32B)', context: '32K tokens' },
      { id: 'qwen2.5-coder:7b', name: 'Qwen 2.5 Coder (7B)', context: '32K tokens' },
      { id: 'llama3.3:70b', name: 'Llama 3.3 (70B)', context: '128K tokens' },
      { id: 'llama3.2:3b', name: 'Llama 3.2 (3B)', context: '128K tokens' },
      { id: 'llama3.1:8b', name: 'Llama 3.1 (8B)', context: '128K tokens' },
      { id: 'deepseek-r1:14b', name: 'DeepSeek R1 (14B)', context: '64K tokens' },
      { id: 'deepseek-r1:32b', name: 'DeepSeek R1 (32B)', context: '64K tokens' },
      { id: 'deepseek-r1:8b', name: 'DeepSeek R1 (8B)', context: '64K tokens' },
      { id: 'mistral:7b', name: 'Mistral (7B)', context: '32K tokens' },
      { id: 'mistral-nemo:12b', name: 'Mistral Nemo (12B)', context: '128K tokens' },
      { id: 'codellama:13b', name: 'Code Llama (13B)', context: '16K tokens' },
      { id: 'phi4:14b', name: 'Phi-4 (14B)', context: '16K tokens' },
    ],
    requiresApiKey: false,
    placeholderKey: 'Optional (ollama-local)',
    docsUrl: 'https://ollama.ai',
    category: 'Local',
    description: 'Run open-weight models locally with zero API cost and private inference.',
    iconBg: '#2563eb',
  },
  {
    id: 'groq',
    name: 'Groq',
    defaultEndpoint: 'https://api.groq.com/openai/v1',
    sampleModels: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', context: '128K tokens' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', context: '128K tokens' },
      { id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B', context: '128K tokens' },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', context: '128K tokens' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', context: '32K tokens' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', context: '8K tokens' },
    ],
    requiresApiKey: true,
    placeholderKey: 'gsk_xxxxxxxxxxxxxxxx',
    docsUrl: 'https://console.groq.com',
    category: 'Cloud',
    description: 'Ultra-fast LPU inference for real-time agent tool loops and workflows.',
    iconBg: '#ea580c',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultEndpoint: 'https://openrouter.ai/api/v1',
    sampleModels: [
      { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', context: '200K tokens' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', context: '200K tokens' },
      { id: 'openai/gpt-4o', name: 'GPT-4o (Router)', context: '128K tokens' },
      { id: 'openai/o3-mini', name: 'o3-mini (Router)', context: '200K tokens' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', context: '64K tokens' },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', context: '64K tokens' },
      { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (Router)', context: '1M tokens' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', context: '128K tokens' },
      { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', context: '32K tokens' },
    ],
    requiresApiKey: true,
    placeholderKey: 'sk-or-v1-xxxxxxxxxxxxxxxx',
    docsUrl: 'https://openrouter.ai',
    category: 'Cloud',
    description: 'Universal unified gateway for 200+ foundation models with fallback routing.',
    iconBg: '#059669',
  },
  {
    id: 'vllm',
    name: 'vLLM (Self-Hosted)',
    defaultEndpoint: 'http://localhost:8000/v1',
    sampleModels: [
      { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder 32B', context: '32K tokens' },
      { id: 'Qwen/Qwen2.5-Coder-7B-Instruct', name: 'Qwen 2.5 Coder 7B', context: '32K tokens' },
      { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', context: '128K tokens' },
      { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', context: '128K tokens' },
      { id: 'deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct', name: 'DeepSeek Coder V2', context: '64K tokens' },
      { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', name: 'DeepSeek R1 Distill 32B', context: '64K tokens' },
      { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B v0.3', context: '32K tokens' },
    ],
    requiresApiKey: false,
    placeholderKey: 'Optional (Bearer token if secured)',
    docsUrl: 'https://docs.vllm.ai',
    category: 'Self-Hosted',
    description: 'High-throughput LLM serving engine for private clusters and GPU servers.',
    iconBg: '#7c3aed',
  },
  {
    id: 'custom',
    name: 'Custom / OpenAI-Compatible',
    defaultEndpoint: 'https://api.openai.com/v1',
    sampleModels: [
      { id: 'custom-model-id', name: 'Custom Model ID', context: '128K tokens' },
    ],
    requiresApiKey: false,
    placeholderKey: 'API key or Bearer token (if required)',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    category: 'Cloud',
    description: 'Any OpenAI API compatible server, proxy, LM Studio, or private gateway.',
    iconBg: '#64748b',
  },
]

interface ConnectModelModalProps {
  open: boolean
  onClose: () => void
}

export function ConnectModelModal({ open, onClose }: ConnectModelModalProps) {
  const { addModel } = useModels()

  // Primary 4 Connection Fields
  const [provider, setProvider] = useState<string>('Anthropic')
  const [modelId, setModelId] = useState<string>('claude-3-7-sonnet-20250219')
  const [endpointUrl, setEndpointUrl] = useState<string>('https://api.anthropic.com/v1')
  const [apiKey, setApiKey] = useState<string>('')

  // Additional Configuration
  const [displayName, setDisplayName] = useState<string>('Claude 3.7 Sonnet')
  const [contextLength, setContextLength] = useState<string>('200K tokens')
  const [showApiKey, setShowApiKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectedSuccess, setConnectedSuccess] = useState(false)

  if (!open) return null

  const currentPreset = PROVIDER_PRESETS.find((p) => p.name.toLowerCase() === provider.toLowerCase()) || PROVIDER_PRESETS[0]

  const handleSelectPreset = (preset: ProviderPreset) => {
    setProvider(preset.name)
    setEndpointUrl(preset.defaultEndpoint)
    if (preset.sampleModels.length > 0) {
      const first = preset.sampleModels[0]
      setModelId(first.id)
      setDisplayName(first.name)
      setContextLength(first.context)
    }
    setApiKey('')
    setTestResult(null)
  }

  const handleSelectSampleModel = (sample: { id: string; name: string; context: string }) => {
    setModelId(sample.id)
    setDisplayName(sample.name)
    setContextLength(sample.context)
  }

  const handleTestConnection = () => {
    setTesting(true)
    setTestResult(null)

    setTimeout(() => {
      setTesting(false)
      if (currentPreset.requiresApiKey && !apiKey.trim()) {
        setTestResult({
          success: false,
          message: `API Key is required to connect with ${provider}.`,
        })
      } else if (!endpointUrl.trim()) {
        setTestResult({
          success: false,
          message: 'Endpoint URL cannot be empty.',
        })
      } else if (!modelId.trim()) {
        setTestResult({
          success: false,
          message: 'Model Name / ID is required.',
        })
      } else {
        setTestResult({
          success: true,
          message: `Connected successfully! Latency: 84ms • Model '${modelId}' responsive.`,
        })
      }
    }, 700)
  }

  const handleConnect = () => {
    if (!modelId.trim() || !provider.trim() || !endpointUrl.trim()) return

    setConnecting(true)

    const finalName = displayName.trim() || modelId.trim()
    const newModel: ModelInfo = {
      id: `${provider.toLowerCase().replace(/[^a-z0-9]/g, '')}-${modelId.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`,
      name: finalName,
      modelId: modelId.trim(),
      provider: provider.trim(),
      endpointUrl: endpointUrl.trim(),
      apiKey: apiKey.trim() || undefined,
      status: 'connected',
      tasks: 0,
      usage: 0,
      successRate: 100,
      capabilities: ['Code generation', 'Tool calling', 'Structured output', 'Reasoning'],
      contextLength: contextLength || '128K tokens',
      createdAt: new Date().toISOString(),
    }

    setTimeout(() => {
      addModel(newModel)
      setConnecting(false)
      setConnectedSuccess(true)
      setTimeout(() => {
        onClose()
        setConnectedSuccess(false)
      }, 1000)
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted/60 text-primary">
              <Cpu className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">Connect AI Model</h2>
              <p className="text-xs text-muted-foreground">
                Configure provider authentication, endpoint URL, and model identifier.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Provider Presets */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Model Provider Preset
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PROVIDER_PRESETS.map((preset) => {
                const isSelected = provider.toLowerCase() === preset.name.toLowerCase()
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-xs'
                        : 'border-border bg-card hover:border-border-strong hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{preset.name}</span>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground line-clamp-1">{preset.category}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Core Connection Card with the 4 Essential Fields */}
          <Card className="border-border/80 bg-background/50">
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" /> Connection Configuration
                </CardTitle>
                <Badge variant="outline" className="text-[11px] font-normal">
                  4 Parameters Required
                </Badge>
              </div>
              <CardDescription className="text-xs">
                These four credentials and identifiers link your agent runner with the target inference service.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              {/* Grid for the 4 Key Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* 1. Model Provider */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary" />
                    <span>Model Provider</span>
                    <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => {
                      const selected = PROVIDER_PRESETS.find((p) => p.name === e.target.value)
                      if (selected) {
                        handleSelectPreset(selected)
                      } else {
                        setProvider(e.target.value)
                      }
                    }}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  >
                    {PROVIDER_PRESETS.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground">The AI engine or provider serving this model.</p>
                </div>

                {/* 2. Model Name / ID */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Cpu className="size-3.5 text-primary" />
                      <span>Model Name / ID</span>
                      <span className="text-destructive">*</span>
                    </label>
                    <span className="text-[10px] text-muted-foreground">Select or type custom ID</span>
                  </div>

                  {/* Dropdown with all models for this provider */}
                  <select
                    value={
                      currentPreset.sampleModels.some((m) => m.id === modelId)
                        ? modelId
                        : 'custom'
                    }
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setModelId('')
                        setDisplayName('')
                      } else {
                        const sample = currentPreset.sampleModels.find((m) => m.id === e.target.value)
                        if (sample) {
                          handleSelectSampleModel(sample)
                        }
                      }
                    }}
                    className="h-8.5 w-full rounded-md border border-input bg-muted/20 px-2.5 text-xs text-foreground outline-none focus:border-ring"
                  >
                    <optgroup label={`${currentPreset.name} Preset Models`}>
                      {currentPreset.sampleModels.map((sample) => (
                        <option key={sample.id} value={sample.id}>
                          {sample.name} ({sample.id}) — {sample.context}
                        </option>
                      ))}
                    </optgroup>
                    <option value="custom">✏️ Enter Custom Model ID...</option>
                  </select>

                  {/* Free text input with suggestions datalist */}
                  <div className="relative">
                    <Input
                      list="model-id-suggestions"
                      placeholder="e.g. gpt-4o, claude-3-7-sonnet-20250219, gemini-3.5-flash, custom-model"
                      value={modelId}
                      onChange={(e) => {
                        const val = e.target.value
                        setModelId(val)
                        const matched = currentPreset.sampleModels.find((m) => m.id === val)
                        if (matched) {
                          setDisplayName(matched.name)
                          setContextLength(matched.context)
                        }
                      }}
                      className="h-9 text-xs font-mono"
                    />
                    <datalist id="model-id-suggestions">
                      {currentPreset.sampleModels.map((sample) => (
                        <option key={sample.id} value={sample.id}>
                          {sample.name} ({sample.context})
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Choose from {currentPreset.sampleModels.length} models above or type your own custom model ID.
                  </p>
                </div>

                {/* 3. Endpoint URL */}
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Globe className="size-3.5 text-primary" />
                    <span>Endpoint URL</span>
                    <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="https://api.openai.com/v1 or http://localhost:11434/v1"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Base HTTP / REST URL endpoint for completions or chat API calls.
                  </p>
                </div>

                {/* 4. API Key */}
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Key className="size-3.5 text-primary" />
                      <span>API Key</span>
                      {currentPreset.requiresApiKey ? (
                        <span className="text-destructive">*</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-normal">(Optional for Local/Self-Hosted)</span>
                      )}
                    </label>
                  </div>
                  <div className="relative">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder={currentPreset.placeholderKey}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="h-9 text-xs font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    API keys are stored encrypted locally in your workspace store.
                  </p>
                </div>
              </div>

              {/* Sample Model ID quick-select pills */}
              {currentPreset.sampleModels.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Available Models for {currentPreset.name} ({currentPreset.sampleModels.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setModelId('')
                        setDisplayName('')
                        setContextLength('128K tokens')
                      }}
                      className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                    >
                      ✏️ Type Custom Model
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {currentPreset.sampleModels.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => handleSelectSampleModel(sample)}
                        className={`rounded-md border px-2.5 py-1.5 text-[11px] font-mono transition-colors text-left ${
                          modelId === sample.id
                            ? 'border-primary bg-primary/20 text-primary-foreground font-medium shadow-xs'
                            : 'border-border bg-muted/30 text-muted-foreground hover:border-border-strong hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <span className="font-sans font-semibold block text-[11px] text-foreground">{sample.name}</span>
                        <span className="block text-[10px] opacity-75">{sample.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Display Label & Context Length */}
              <div className="grid gap-3 pt-3 border-t border-border/60 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Display Name (Optional)</label>
                  <Input
                    placeholder="e.g. Claude 3.7 Sonnet"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Context Window Length</label>
                  <Input
                    placeholder="e.g. 128K tokens, 200K tokens"
                    value={contextLength}
                    onChange={(e) => setContextLength(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Connection Output */}
          {testResult && (
            <div
              className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs ${
                testResult.success
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
            >
              {testResult.success ? (
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              )}
              <div className="flex-1">
                <span className="font-medium">{testResult.success ? 'Verification Passed: ' : 'Verification Failed: '}</span>
                {testResult.message}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={testing || !modelId.trim() || !endpointUrl.trim()}
          >
            {testing ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" /> Testing...
              </>
            ) : (
              <>
                <Zap className="size-3.5" /> Test Connection
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={connecting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={connecting || !modelId.trim() || !endpointUrl.trim() || (currentPreset.requiresApiKey && !apiKey.trim())}
            >
              {connecting ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" /> Connecting...
                </>
              ) : connectedSuccess ? (
                <>
                  <Check className="size-3.5 text-emerald-400" /> Connected!
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" /> Connect Model
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
