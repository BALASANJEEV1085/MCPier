'use client'

import { useState } from 'react'
import { Activity, Box, CircleStop, Cpu, MemoryStick, Play, Plus, Terminal } from 'lucide-react'
import { sandboxes as seedSandboxes, type Sandbox } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

const tone = { running: 'text-success', idle: 'text-muted-foreground', terminated: 'text-destructive' }

export default function SandboxPage() {
  const [sandboxList, setSandboxList] = useState<Sandbox[]>(seedSandboxes)

  const handleCreateSandbox = () => {
    const id = `sbx-${Math.floor(1000 + Math.random() * 9000)}`
    const newSandbox: Sandbox = {
      id,
      task: 'Interactive Development Session',
      status: 'running',
      cpu: 12,
      memory: '512 MB',
      runtime: '5s',
      started: 'Just now',
    }
    setSandboxList((prev) => [newSandbox, ...prev])
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Infrastructure</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Sandbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">Isolated execution environments for agent workloads.</p>
        </div>
        <Button size="sm" onClick={handleCreateSandbox}>
          <Plus data-icon="inline-start" /> Create sandbox
        </Button>
      </div>

      {sandboxList.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {sandboxList.map((sandbox) => (
            <Card key={sandbox.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="font-mono text-sm">{sandbox.id}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{sandbox.task}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-xs capitalize ${tone[sandbox.status]}`}>
                  <span className="size-1.5 rounded-full bg-current" />
                  {sandbox.status}
                </span>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="border border-border p-3">
                    <Cpu className="mb-2 size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">CPU</span>
                    <p className="mt-1 font-mono text-foreground">{sandbox.cpu}%</p>
                  </div>
                  <div className="border border-border p-3">
                    <MemoryStick className="mb-2 size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Memory</span>
                    <p className="mt-1 font-mono text-foreground">{sandbox.memory}</p>
                  </div>
                  <div className="border border-border p-3">
                    <Activity className="mb-2 size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Runtime</span>
                    <p className="mt-1 font-mono text-foreground">{sandbox.runtime}</p>
                  </div>
                </div>
                {sandbox.status === 'running' && <Progress value={sandbox.cpu} className="h-1" />}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">Started {sandbox.started}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon-xs" aria-label="Open terminal">
                      <Terminal />
                    </Button>
                    {sandbox.status === 'running' ? (
                      <Button variant="outline" size="icon-xs" aria-label="Stop sandbox">
                        <CircleStop />
                      </Button>
                    ) : (
                      <Button variant="outline" size="icon-xs" aria-label="Start sandbox">
                        <Play />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Box className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No active sandboxes</h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Isolated microVMs and container sandboxes are spawned when agents execute code or run test suites.
          </p>
          <Button size="sm" className="mt-4" onClick={handleCreateSandbox}>
            <Plus data-icon="inline-start" /> Launch Sandbox
          </Button>
        </Card>
      )}
    </div>
  )
}
