const steps = [
  { n: '01', title: 'Prompt', desc: 'User describes the goal.' },
  { n: '02', title: 'Understand', desc: 'AI analyzes the request.' },
  { n: '03', title: 'Discover', desc: 'MCPier discovers available MCP capabilities.' },
  { n: '04', title: 'Plan', desc: 'The agent creates an execution plan.' },
  { n: '05', title: 'Execute', desc: 'Code runs in the sandbox and external actions use MCP.' },
  { n: '06', title: 'Verify', desc: 'MCPier checks the result and completes the task.' },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-[26px]">
            How MCPier works
          </h2>
          <p className="mt-2 text-[14px] text-muted-foreground">
            A single mental model connects every task, from prompt to verified result.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3 lg:grid-cols-6">
          {steps.map((step) => (
            <div key={step.n} className="flex flex-col gap-2 bg-card p-4">
              <span className="font-mono text-[11px] text-muted-foreground">{step.n}</span>
              <span className="text-[13px] font-semibold text-foreground">{step.title}</span>
              <span className="text-[12px] leading-relaxed text-muted-foreground">{step.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
