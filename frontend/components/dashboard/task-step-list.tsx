import { CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react'
import type { TaskStep } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const icons = {
  completed: CheckCircle2,
  running: Loader2,
  pending: CircleDashed,
  failed: XCircle,
}

const iconStyles = {
  completed: 'text-chart-1',
  running: 'text-chart-4 animate-spin',
  pending: 'text-muted-foreground/40',
  failed: 'text-destructive',
}

export function TaskStepList({ steps }: { steps: TaskStep[] }) {
  return (
    <ol className="flex flex-col gap-0.5">
      {steps.map((step, i) => {
        const Icon = icons[step.status]
        const isLast = i === steps.length - 1
        return (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon className={cn('size-4 shrink-0', iconStyles[step.status])} />
              {!isLast && <div className="my-1 w-px flex-1 bg-border" />}
            </div>
            <div className={cn('pb-4 text-[13px]', step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground')}>
              {step.label}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
