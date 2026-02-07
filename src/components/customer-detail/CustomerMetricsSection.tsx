import { memo } from 'react'
import { DollarSign, FileText, Clock, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const CustomerMetricsSection = memo(function CustomerMetricsSection({
  stats,
  customerCreatedAt,
}: CustomerMetricsSectionProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lifetime Value</CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-tinedy-dark">
            {formatCurrency(stats?.lifetime_value || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Avg: {formatCurrency(stats?.avg_booking_value || 0)} per booking
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-tinedy-blue">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          <FileText className="h-4 w-4 text-tinedy-blue" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-tinedy-dark">
            {stats?.total_bookings || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.completed_bookings || 0} completed, {stats?.cancelled_bookings || 0} cancelled
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Booking</CardTitle>
          <Clock className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-tinedy-dark">
            {stats?.days_since_last_booking !== null && stats?.days_since_last_booking !== undefined
              ? stats.days_since_last_booking === 0
                ? 'Today'
                : stats.days_since_last_booking === 1
                ? '1 day ago'
                : `${stats.days_since_last_booking} days ago`
              : 'No service yet'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.last_booking_date
              ? formatDate(stats.last_booking_date)
              : 'No completed booking'}
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Customer Since</CardTitle>
          <Users className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-tinedy-dark">
            {stats?.customer_tenure_days || 0}d
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDate(customerCreatedAt)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
})

CustomerMetricsSection.displayName = 'CustomerMetricsSection'

export default CustomerMetricsSection
