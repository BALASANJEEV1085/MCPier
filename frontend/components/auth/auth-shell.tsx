import type { ReactNode } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/logo'
import { McpVisualization } from '@/components/landing/mcp-visualization'

const highlights = [
  'Connect any MCP server in minutes',
  'Autonomous, observable task execution',
  'Secure sandboxed environments for every run',
]

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-between border-r border-border bg-surface p-8 lg:p-12">
        <Link href="/">
          <Logo />
        </Link>

        <div className="mx-auto w-full max-w-sm py-12">
          <McpVisualization />
        </div>

        <div className="space-y-3">
          {highlights.map((item) => (
            <div key={item} className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 shrink-0 text-accent" />
              <span className="text-[13px] text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
