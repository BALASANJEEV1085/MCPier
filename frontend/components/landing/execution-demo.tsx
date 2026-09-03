import { CheckCircle2, CircleDashed, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const plan = [
  { label: 'Analyze request', status: 'completed' },
  { label: 'Discover MCPs', status: 'completed' },
  { label: 'Check capabilities', status: 'completed' },
  { label: 'Create plan', status: 'completed' },
  { label: 'Initialize sandbox', status: 'completed' },
  { label: 'Generate code', status: 'completed' },
  { label: 'Run tests', status: 'running' },
  { label: 'Push code', status: 'pending' },
  { label: 'Deploy', status: 'pending' },
  { label: 'Verify', status: 'pending' },
] as const

const activity = [
  'Analyzing request...',
  'GitHub MCP selected...',
  'Sandbox initialized...',
  'Running npm test...',
  'Tests passed...',
  'Deploying...',
]

const mcpsUsed = [
  { name: 'GitHub MCP', tools: 8 },
  { name: 'AWS MCP', tools: 18 },
]

function StepIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 className="size-3.5 text-accent" />
  if (status === 'running') return <Loader2 className="size-3.5 animate-spin text-info" />
  return <CircleDashed className="size-3.5 text-muted-foreground" />
}

export function ExecutionDemo() {
  return (
    <section id="developers" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-[26px]">
            Watch a task execute end to end
          </h2>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Create a React application, test it, push it to GitHub, and deploy it.
          </p>
        </div>

        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-[1fr_1.4fr_1fr]">
          <div className="bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Task Plan
            </p>
            <ul className="mt-3 space-y-2.5">
              {plan.map((step) => (
                <li key={step.label} className="flex items-center gap-2 text-[12.5px]">
                  <StepIcon status={step.status} />
                  <span className="text-foreground">{step.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Execution
            </p>
            <div className="mt-3 space-y-1.5 rounded-md border border-border bg-surface p-3 font-mono text-[12px] text-muted-foreground">
              {activity.map((line) => (
                <p key={line}>
                  <span className="text-accent">$</span> {line}
                </p>
              ))}
            </div>
          </div>

          <div className="bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              MCPs Used
            </p>
            <div className="mt-3 space-y-2">
              {mcpsUsed.map((mcp) => (
                <div
                  key={mcp.name}
                  className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2"
                >
                  <span className="text-[12.5px] font-medium text-foreground">{mcp.name}</span>
                  <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                    {mcp.tools} tools
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
