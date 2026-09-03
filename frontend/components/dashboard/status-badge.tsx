import { CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ExecutionStatus } from '@/lib/mock-data'

const config: Record<ExecutionStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  running: { label: 'Running', icon: Loader2, className: 'text-chart-4' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'text-chart-1' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-destructive' },
  pending: { label: 'Pending', icon: CircleDashed, className: 'text-muted-foreground' },
}

export function StatusBadge({ status, className }: { status: ExecutionStatus; className?: string }) {
  const { label, icon: Icon, className: colorClass } = config[status]
  return (
    <Badge variant="outline" className={cn(colorClass, className)}>
      <Icon data-icon="inline-start" className={status === 'running' ? 'animate-spin' : ''} />
      {label}
    </Badge>
  )
}
