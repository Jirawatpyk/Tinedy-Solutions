/**
 * CompactStats Component
 *
 * Inline stats row for Staff Profile page:
 * - Jobs count
 * - Completion rate
 * - Earnings
 * - No card wrapper - inline horizontal display
 */

import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { StaffStats } from '@/lib/queries/staff-bookings-queries'

interface CompactStatsProps {
  stats: StaffStats | undefined
  loading: boolean
}

export function CompactStats({ stats, loading }: CompactStatsProps) {
  if (loading) {
    return (
      <div className="flex justify-around py-4 border-y">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-1" />
            <Skeleton className="h-3 w-12 mx-auto" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex justify-around py-4 border-y">
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">
          {stats?.totalTasks6Months ?? 0}
        </div>
        <div className="text-xs text-muted-foreground">Jobs</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">
          {stats?.completionRate ?? 0}%
        </div>
        <div className="text-xs text-muted-foreground">Rate</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">
          {formatCurrency(stats?.totalEarnings ?? 0)}
        </div>
        <div className="text-xs text-muted-foreground">Earned</div>
      </div>
    </div>
  )
}
