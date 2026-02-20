import { memo } from 'react'
import { TrendingUp, CalendarCheck, Clock, UserCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatCurrency } from '@/lib/utils'

export interface CustomerStats {
  total_bookings: number
  lifetime_value: number
  avg_booking_value: number
  last_booking_date: string | null
  first_booking_date: string | null
  completed_bookings: number
  cancelled_bookings: number
  no_show_bookings: number
  pending_bookings: number
  days_since_last_booking: number | null
  customer_tenure_days: number
}

interface CustomerMetricsSectionProps {
  stats: CustomerStats | null
  customerCreatedAt: string
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatTenure(days: number): string {
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  return months > 0 ? `${years}y ${months}mo` : `${years}y`
}

function formatLastBooking(days: number | null | undefined): string {
  if (days == null) return 'No service yet'
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.floor(days / 30)} mo ago`
  return `${Math.floor(days / 365)} yr ago`
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

interface MetricCardProps {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  iconBg: string
}

function MetricCard({ label, value, sub, icon, iconBg }: MetricCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            {icon}
          </div>
        </div>
        <p className="text-2xl font-bold text-tinedy-dark leading-none mb-1">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CustomerMetricsSection = memo(function CustomerMetricsSection({
  stats,
  customerCreatedAt,
}: CustomerMetricsSectionProps) {
  const completionRate =
    stats && stats.total_bookings > 0
      ? Math.round((stats.completed_bookings / stats.total_bookings) * 100)
      : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Lifetime Value"
        value={formatCurrency(stats?.lifetime_value || 0)}
        sub={`Avg ${formatCurrency(stats?.avg_booking_value || 0)} / booking`}
        iconBg="bg-emerald-100"
        icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
      />

      <MetricCard
        label="Total Bookings"
        value={String(stats?.total_bookings || 0)}
        sub={`${completionRate}% completion rate`}
        iconBg="bg-blue-100"
        icon={<CalendarCheck className="h-4 w-4 text-tinedy-blue" />}
      />

      <MetricCard
        label="Last Booking"
        value={formatLastBooking(stats?.days_since_last_booking)}
        sub={
          stats?.last_booking_date
            ? formatDate(stats.last_booking_date)
            : 'No booking yet'
        }
        iconBg="bg-purple-100"
        icon={<Clock className="h-4 w-4 text-purple-600" />}
      />

      <MetricCard
        label="Customer Since"
        value={formatTenure(stats?.customer_tenure_days || 0)}
        sub={formatDate(customerCreatedAt)}
        iconBg="bg-amber-100"
        icon={<UserCheck className="h-4 w-4 text-amber-600" />}
      />
    </div>
  )
})

CustomerMetricsSection.displayName = 'CustomerMetricsSection'

export default CustomerMetricsSection
