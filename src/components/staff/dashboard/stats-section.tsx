import { StatsCard } from '@/components/staff/stats-card'
import { PerformanceChart } from '@/components/staff/performance-chart'
import { Skeleton } from '@/components/ui/skeleton'
import { Briefcase, Calendar, TrendingUp, DollarSign, Award, Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { StaffStats } from '@/lib/queries/staff-bookings-queries'

interface StatsSectionProps {
  stats: StaffStats | undefined
  loading: boolean
}

export function StatsSection({ stats, loading }: StatsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 tablet-landscape:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-28 sm:h-32 rounded-2xl" />
            ))}
          </>
        ) : (
          <>
            <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '0ms' }}>
              <StatsCard
                title="Today's Tasks"
                value={stats?.jobsToday ?? 0}
                icon={Briefcase}
                description="Tasks to do today"
              />
            </div>
            <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '50ms' }}>
              <StatsCard
                title="This Week"
                value={stats?.jobsThisWeek ?? 0}
                icon={Calendar}
                description="All tasks this week"
              />
            </div>
            <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
              <StatsCard
                title="Total Tasks"
                value={stats?.totalTasks6Months ?? 0}
                icon={Award}
                description="Last 6 months"
              />
            </div>
            <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '150ms' }}>
              <StatsCard
                title="Completion"
                value={`${stats?.completionRate ?? 0}%`}
                icon={TrendingUp}
                description="Last 30 days"
              />
            </div>
            <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
              <StatsCard
                title="Rating"
                value={stats?.averageRating && stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                icon={Star}
                description={stats?.reviewCount && stats.reviewCount > 0 ? `From ${stats.reviewCount} review${stats.reviewCount > 1 ? 's' : ''}` : 'No reviews yet'}
              />
            </div>
            <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '250ms' }}>
              <StatsCard
                title="Earnings"
                value={formatCurrency(stats?.totalEarnings ?? 0)}
                icon={DollarSign}
                description="This month"
              />
            </div>
          </>
        )}
      </div>

      {/* Performance Chart */}
      {!loading && stats?.monthlyData && stats.monthlyData.length > 0 && (
        <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
          <PerformanceChart
            stats={{
              totalJobs: stats.totalTasks6Months,
              completedJobs: Math.round((stats.totalTasks6Months * stats.completionRate) / 100),
              completionRate: stats.completionRate,
              averageRating: stats.averageRating,
              totalRevenue: stats.totalEarnings,
              monthlyData: stats.monthlyData,
            }}
          />
        </div>
      )}
    </div>
  )
}
