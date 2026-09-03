'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const steps = [
  { label: 'Request received', mcps: [] as string[] },
  { label: 'Analyzing request', mcps: [] },
  { label: 'Discovering MCP servers', mcps: ['github-mcp', 'aws-mcp'] },
  { label: 'Checking capabilities', mcps: ['github-mcp', 'aws-mcp'] },
  { label: 'Creating execution plan', mcps: [] },
  { label: 'Starting sandbox', mcps: [] },
  { label: 'Generating application', mcps: [] },
  { label: 'Running tests', mcps: [] },
  { label: 'Calling GitHub MCP', mcps: ['github-mcp'] },
  { label: 'Calling AWS MCP', mcps: ['aws-mcp'] },
  { label: 'Verifying deployment', mcps: ['aws-mcp'] },
  { label: 'Completed', mcps: [] },
]

export function InteractiveDemo() {
  const [prompt, setPrompt] = useState('Deploy my Next.js application to AWS and create a GitHub repository.')
  const [running, setRunning] = useState(false)
  const [stepIndex, setStepIndex] = useState(-1)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function runDemo() {
    if (running) return
    setRunning(true)
    setStepIndex(0)
    let i = 0
    const tick = () => {
      i += 1
      if (i >= steps.length) {
        setStepIndex(steps.length - 1)
        setRunning(false)
        return
      }
      setStepIndex(i)
      timeoutRef.current = setTimeout(tick, 480)
    }
    timeoutRef.current = setTimeout(tick, 480)
  }

  const completed = stepIndex === steps.length - 1

  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-[26px]">
            Try it yourself
          </h2>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Describe a goal and watch MCPier plan and execute it.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl rounded-lg border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What would you like MCPier to do?"
              className="w-full flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <Button size="sm" onClick={runDemo} disabled={running} className="shrink-0">
              {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
              {running ? 'Running…' : 'Execute Demo'}
            </Button>
          </div>

          <div className="p-4">
            {stepIndex === -1 ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">
                Click &quot;Execute Demo&quot; to see MCPier plan and execute this task.
              </p>
            ) : (
              <ul className="space-y-2">
                {steps.slice(0, stepIndex + 1).map((step, i) => {
                  const isLast = i === stepIndex
                  const isCompleted = !isLast || completed
                  return (
                    <li key={step.label} className="flex items-center gap-2.5 text-[13px]">
                      {isCompleted ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-accent" />
                      ) : (
                        <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                      )}
                      <span className={cn(isCompleted ? 'text-foreground' : 'text-muted-foreground')}>
                        {step.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}

            {completed && (
              <div className="mt-4 space-y-1.5 rounded-md border border-border bg-surface p-3">
                <p className="text-[13px] font-medium text-accent">Task completed successfully</p>
                <p className="text-[12px] text-muted-foreground">GitHub repository created</p>
                <p className="text-[12px] text-muted-foreground">Application deployed</p>
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">This is a demonstration only.</p>
      </div>
    </section>
  )
}
