'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Network } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { InputGroup, InputGroupTextarea } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useTasks, useMcpServers } from '@/lib/store'
import type { Task, TaskStep } from '@/lib/mock-data'

const suggestions = [
  'Deploy Next.js application with Docker and AWS',
  'Search GitHub repository and summarize security posture',
  'Execute SQL query and generate API endpoint',
  'Build and verify automated test suite',
]

const initialSteps: TaskStep[] = [
  { id: 'understand', label: 'Understand request', status: 'completed' },
  { id: 'discover', label: 'Discover MCP tools', status: 'completed' },
  { id: 'capabilities', label: 'Check capabilities', status: 'running' },
  { id: 'plan', label: 'Execute plan', status: 'pending' },
  { id: 'complete', label: 'Finalize output', status: 'pending' },
]

export default function NewTaskPage() {
  const router = useRouter()
  const { addTask } = useTasks()
  const { servers } = useMcpServers()
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('gpt-oss-20b')
  const [selectedMcps, setSelectedMcps] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  function toggleMcp(name: string) {
    setSelectedMcps((prev) => (prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]))
  }

  function handleSubmit() {
    if (!prompt.trim()) return
    setSubmitting(true)

    const newId = `task-${Math.floor(1000 + Math.random() * 9000)}`
    const newTask: Task = {
      id: newId,
      name: prompt.trim(),
      status: 'running',
      model: model === 'gpt-oss-20b' ? 'GPT-OSS 20B' : model === 'gpt-oss-120b' ? 'GPT-OSS 120B' : 'Custom Model',
      mcps: selectedMcps.length > 0 ? selectedMcps : ['Autonomous Agent'],
      runtime: '12s',
      created: 'Just now',
      steps: initialSteps,
    }

    addTask(newTask)

    setTimeout(() => {
      router.push(`/dashboard/tasks/${newId}`)
    }, 400)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Describe your task</CardTitle>
          <CardDescription>MCPier plans the execution steps, connects the active MCP tools, and runs autonomously.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <InputGroup>
                <InputGroupTextarea
                  placeholder="e.g. Deploy my application to AWS and configure database migrations"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-32"
                />
              </InputGroup>
              <FieldDescription>Be as specific as possible about the desired output.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Suggestions</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPrompt(s)}
                    className="rounded-full border border-border px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <Field>
              <FieldLabel>Model</FieldLabel>
              <Select value={model} onValueChange={(val) => setModel(val || '')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="gpt-oss-20b">GPT-OSS 20B</SelectItem>
                    <SelectItem value="gpt-oss-120b">GPT-OSS 120B</SelectItem>
                    <SelectItem value="custom">Custom Self-Hosted</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>MCP Servers</FieldLabel>
              <FieldDescription>Select which tools the agent is permitted to call during execution.</FieldDescription>
              {servers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {servers.map((server) => {
                    const active = selectedMcps.includes(server.name)
                    return (
                      <button
                        key={server.id}
                        type="button"
                        onClick={() => toggleMcp(server.name)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
                        )}
                      >
                        {server.name}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Network className="size-4 text-muted-foreground/60" /> No external MCP servers connected yet
                  </span>
                  <Link href="/dashboard/mcp-servers" className="font-medium text-primary hover:underline">
                    Connect Servers
                  </Link>
                </div>
              )}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedMcps.length > 0 && <Badge variant="secondary">{selectedMcps.length} servers selected</Badge>}
        </div>
        <Button onClick={handleSubmit} disabled={!prompt.trim() || submitting}>
          <Sparkles data-icon="inline-start" />
          {submitting ? 'Starting…' : 'Run Task'}
        </Button>
      </div>
    </div>
  )
}
