import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, DollarSign, Users, Clock, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Stats, StatsChange } from '@/types/dashboard'

interface DashboardStatsProps {
  stats: Stats
  statsChange: StatsChange
  loading: boolean
}

export function DashboardStats({ stats, statsChange, loading }: DashboardStatsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          <Calendar className="h-4 w-4 text-tinedy-blue" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-tinedy-dark">
            {stats.totalBookings}
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">All time bookings</p>
            <div
              className={`flex items-center gap-1 text-xs font-semibold ${
                statsChange.bookingsChange > 0 ? 'text-green-600' : 'text-gray-600'
              }`}
            >
              {statsChange.bookingsChange > 0 && <TrendingUp className="h-3 w-3" />}
              <span>+{statsChange.bookingsChange} today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-tinedy-green" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-tinedy-dark">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">From paid bookings</p>
            <div
              className={`flex items-center gap-1 text-xs font-semibold ${
                statsChange.revenueChange > 0 ? 'text-green-600' : 'text-gray-600'
              }`}
            >
              {statsChange.revenueChange > 0 && <TrendingUp className="h-3 w-3" />}
              <span>+{formatCurrency(statsChange.revenueChange)} today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Customers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          <Users className="h-4 w-4 text-tinedy-yellow" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-tinedy-dark">
            {stats.totalCustomers}
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">Active customers</p>
            <div
              className={`flex items-center gap-1 text-xs font-semibold ${
                statsChange.customersChange > 0 ? 'text-green-600' : 'text-gray-600'
              }`}
            >
              {statsChange.customersChange > 0 && <TrendingUp className="h-3 w-3" />}
              <span>+{statsChange.customersChange} today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-tinedy-dark">
            {stats.pendingBookings}
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
            <div
              className={`flex items-center gap-1 text-xs font-semibold ${
                statsChange.pendingChange > 0 ? 'text-orange-600' : 'text-gray-600'
              }`}
            >
              {statsChange.pendingChange > 0 && <TrendingUp className="h-3 w-3" />}
              <span>+{statsChange.pendingChange} today</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
