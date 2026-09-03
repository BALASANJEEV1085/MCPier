import { KpiCards } from '@/components/dashboard/kpi-cards'
import { ExecutionChart } from '@/components/dashboard/execution-chart'
import { LiveActivity } from '@/components/dashboard/live-activity'
import { OperatorPanel } from '@/components/dashboard/operator-panel'

export default function DashboardOverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <KpiCards />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ExecutionChart />
        <LiveActivity />
      </div>
      <OperatorPanel />
    </div>
  )
}
