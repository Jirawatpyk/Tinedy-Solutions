import { BookingStatusPieChart, RevenueLineChart } from '@/components/charts'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { BookingStatus, DailyRevenue } from '@/types/dashboard'

interface DashboardChartsProps {
  bookingsByStatus: BookingStatus[]
  dailyRevenue: DailyRevenue[]
  loading: boolean
}

export function DashboardCharts({
  bookingsByStatus,
  dailyRevenue,
  loading,
}: DashboardChartsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <BookingStatusPieChart data={bookingsByStatus} />
      <RevenueLineChart data={dailyRevenue} />
    </div>
  )
}
