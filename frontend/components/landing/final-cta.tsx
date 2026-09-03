import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function FinalCta() {
  return (
    <section id="pricing" className="border-b border-border">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center md:px-6">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Stop asking AI for answers.
          <br />
          Let it do the work.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-pretty text-[15px] leading-relaxed text-muted-foreground">
          Connect your MCPs, give MCPier a goal, and let your AI agent execute the task.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" render={<Link href="/sign-up" />} nativeButton={false}>
            Get Started
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/sign-in" />} nativeButton={false}>
            Explore MCPier
          </Button>
        </div>
      </div>
    </section>
  )
}
