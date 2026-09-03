import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ConnectionStatus } from '@/lib/mock-data'

const styles: Record<ConnectionStatus, string> = {
  connected: 'text-chart-1',
  connecting: 'text-amber-400',
  disconnected: 'text-muted-foreground',
  error: 'text-destructive',
}

export function ConnectionBadge({ status, className }: { status: ConnectionStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(styles[status], 'capitalize', className)}>
      <span
        className={cn(
          'mr-1 inline-block size-1.5 rounded-full',
          status === 'connected' && 'bg-chart-1',
          status === 'disconnected' && 'bg-muted-foreground',
          status === 'error' && 'bg-destructive',
        )}
      />
      {status}
    </Badge>
  )
}
