import { memo } from 'react'
import { Calendar, DollarSign, Users, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Stats, StatsChange } from '@/types/dashboard'
import { StatCard } from '@/components/common/StatCard/StatCard'

interface DashboardStatsProps {
  stats: Stats
  statsChange: StatsChange
  loading: boolean
}

/**
 * DashboardStats Component
 *
 * แสดง stats cards สำหรับ dashboard (Total Bookings, Revenue, Customers, Pending)
 * ใช้ React.memo เพื่อป้องกัน re-render เมื่อ stats ไม่เปลี่ยน
 *
 * @performance Memoized - re-render เฉพาะเมื่อ stats/statsChange/loading เปลี่ยน
 */
const DashboardStatsComponent = ({ stats, statsChange, loading }: DashboardStatsProps) => {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCard
            key={i}
            title=""
            value={0}
            isLoading={true}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Bookings"
        value={stats.totalBookings}
        description="All time bookings"
        icon={Calendar}
        iconColor="text-tinedy-blue"
        trend={{
          value: `+${statsChange.bookingsChange} today`,
          direction: statsChange.bookingsChange > 0 ? 'up' : 'neutral',
        }}
      />

      <StatCard
        title="Total Revenue"
        value={formatCurrency(stats.totalRevenue)}
        description="From paid bookings"
        icon={DollarSign}
        iconColor="text-tinedy-green"
        trend={{
          value: `+${formatCurrency(statsChange.revenueChange)} today`,
          direction: statsChange.revenueChange > 0 ? 'up' : 'neutral',
        }}
      />

      <StatCard
        title="Total Customers"
        value={stats.totalCustomers}
        description="Active customers"
        icon={Users}
        iconColor="text-tinedy-yellow"
        trend={{
          value: `+${statsChange.customersChange} today`,
          direction: statsChange.customersChange > 0 ? 'up' : 'neutral',
        }}
      />

      <StatCard
        title="Pending"
        value={stats.pendingBookings}
        description="Awaiting confirmation"
        icon={Clock}
        iconColor="text-orange-500"
        trend={{
          value: `+${statsChange.pendingChange} today`,
          direction: statsChange.pendingChange > 0 ? 'up' : 'neutral',
        }}
      />
    </div>
  )
}

/**
 * Memoized DashboardStats
 *
 * Custom comparison เพื่อเทียบ stats และ statsChange objects
 * Re-render เฉพาะเมื่อค่าเปลี่ยนจริงๆ
 */
export const DashboardStats = memo(
  DashboardStatsComponent,
  (prevProps, nextProps) => {
    // If loading state changed, re-render
    if (prevProps.loading !== nextProps.loading) {
      return false
    }

    // If loading, skip other comparisons
    if (nextProps.loading) {
      return true
    }

    // Compare stats object
    const statsEqual =
      prevProps.stats.totalBookings === nextProps.stats.totalBookings &&
      prevProps.stats.totalRevenue === nextProps.stats.totalRevenue &&
      prevProps.stats.totalCustomers === nextProps.stats.totalCustomers &&
      prevProps.stats.pendingBookings === nextProps.stats.pendingBookings

    // Compare statsChange object
    const statsChangeEqual =
      prevProps.statsChange.bookingsChange === nextProps.statsChange.bookingsChange &&
      prevProps.statsChange.revenueChange === nextProps.statsChange.revenueChange &&
      prevProps.statsChange.customersChange === nextProps.statsChange.customersChange &&
      prevProps.statsChange.pendingChange === nextProps.statsChange.pendingChange

    // Return true to skip re-render
    return statsEqual && statsChangeEqual
  }
)
