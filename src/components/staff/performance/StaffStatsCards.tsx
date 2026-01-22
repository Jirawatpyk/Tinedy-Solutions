import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, CheckCircle2, DollarSign, Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface StaffPerformanceStats {
  totalBookings: number
  completedBookings: number
  pendingBookings: number
  cancelledRate: number
  totalRevenue: number
  averageRating: number
  reviewCount: number
}

interface StaffStatsCardsProps {
  stats: StaffPerformanceStats
}

export const StaffStatsCards = memo(function StaffStatsCards({ stats }: StaffStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Bookings</CardTitle>
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">{stats.totalBookings}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">All time bookings</p>
        </CardContent>
      </Card>

      {/* Completed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>
          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.completedBookings}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            {stats.totalBookings > 0
              ? `${((stats.completedBookings / stats.totalBookings) * 100).toFixed(1)}% completion rate`
              : 'No bookings'}
          </p>
        </CardContent>
      </Card>

      {/* Total Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Revenue generated</p>
        </CardContent>
      </Card>

      {/* Average Rating */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Average Rating</CardTitle>
          <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500 fill-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-yellow-600 flex items-center gap-1">
            {stats.averageRating > 0 ? stats.averageRating : '-'}
            {stats.averageRating > 0 && <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 fill-yellow-500" />}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            {stats.reviewCount > 0
              ? `From ${stats.reviewCount} review${stats.reviewCount > 1 ? 's' : ''}`
              : 'No reviews yet'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
})
