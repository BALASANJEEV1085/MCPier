import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { McpVisualization } from '@/components/landing/mcp-visualization'

export function Hero() {
  return (
    <section id="product" className="border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-2 md:items-center md:px-6 md:py-24">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            AI Agent Execution Platform
          </p>
          <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl">
            Connect any MCP.
            <br />
            Give AI a task.
            <br />
            Let it do the work.
          </h1>
          <p className="mt-5 max-w-md text-pretty text-[15px] leading-relaxed text-muted-foreground">
            MCPier connects AI models, MCP servers, and secure execution environments so AI agents
            can discover tools, execute code, and complete real-world tasks from natural language
            instructions.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button size="lg" render={<Link href="/sign-up" />} nativeButton={false}>
              Get Started
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="outline" render={<a href="#how-it-works" />} nativeButton={false}>
              See How It Works
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-8">
          <McpVisualization />
        </div>
      </div>
    </section>
  )
}
