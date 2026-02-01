import React from 'react'
import { BarChart3, CheckCircle, DollarSign, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'

/**
 * Statistics data for a service package
 */
export interface PackageStats {
  total_bookings: number
  completed_bookings: number
  pending_bookings: number
  cancelled_bookings: number
  total_revenue: number
  last_booking_date: string | null
}

/**
 * Props for PackageStatsCards component
 */
interface PackageStatsCardsProps {
  stats: PackageStats
}

/**
 * PackageStatsCards Component
 *
 * Displays a grid of 4 statistic cards for a service package:
 * - Total Bookings: All-time booking count
 * - Completed: Successfully completed bookings
 * - Total Revenue: Revenue from completed bookings
 * - Last Booking: Most recent booking date
 *
 * Responsive grid layout:
 * - Mobile: 1 column
 * - Small screens (sm): 2 columns
 * - Large screens (lg): 4 columns
 *
 * @param props - Component props
 * @param props.stats - Package statistics data
 */
const PackageStatsCards = React.memo(function PackageStatsCards({
  stats
}: PackageStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Total Bookings
          </CardTitle>
          <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">{stats.total_bookings}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            All-time bookings
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Completed
          </CardTitle>
          <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.completed_bookings}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            Successfully completed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Total Revenue
          </CardTitle>
          <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-tinedy-yellow" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-tinedy-dark">
            {formatCurrency(stats.total_revenue)}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            From completed bookings
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Last Booking
          </CardTitle>
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-base sm:text-lg font-bold">
            {stats.last_booking_date ? formatDate(stats.last_booking_date) : 'N/A'}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            Most recent booking
          </p>
        </CardContent>
      </Card>
    </div>
  )
})

export { PackageStatsCards }
export type { PackageStatsCardsProps }
