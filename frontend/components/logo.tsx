import { cn } from '@/lib/utils'

export function Logo({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-[11px] font-bold text-background"
        aria-hidden="true"
      >
        M
      </span>
      {!iconOnly && <span className="text-[15px] font-semibold tracking-tight text-foreground">MCPier</span>}
    </span>
  )
}
