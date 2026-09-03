import { Boxes, Cpu, Network, Search, ShieldCheck, Workflow } from 'lucide-react'

const features = [
  {
    icon: Network,
    title: 'Universal MCP Connectivity',
    desc: 'Connect existing MCP servers and tools.',
  },
  {
    icon: Search,
    title: 'Capability Discovery',
    desc: 'Automatically determine which connected MCP tools can perform a requested task.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Sandbox',
    desc: 'Run generated code and processes inside isolated environments.',
  },
  {
    icon: Workflow,
    title: 'Autonomous Execution',
    desc: 'Plan, execute, observe, retry, and complete.',
  },
  {
    icon: Cpu,
    title: 'Model Flexibility',
    desc: 'Use supported models or connect your own model endpoint.',
  },
  {
    icon: Boxes,
    title: 'Custom MCP Servers',
    desc: 'Connect private and internally developed MCP servers.',
  },
]

export function Features() {
  return (
    <section id="mcp-servers" className="border-b border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-[26px]">
            Built for real execution
          </h2>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Every layer of MCPier is designed for reliable, observable, and secure agent
            execution.
          </p>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-3 bg-card p-5">
              <feature.icon className="size-4 text-accent" strokeWidth={1.75} />
              <h3 className="text-[14px] font-semibold text-foreground">{feature.title}</h3>
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
