import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, CheckCircle, Star, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface TeamStats {
  totalBookings: number
  completedBookings: number
  averageRating: number
  totalRevenue: number
}

interface TeamDetailStatsProps {
  stats: TeamStats
}

export function TeamDetailStats({ stats }: TeamDetailStatsProps) {
  const completionRate = stats.totalBookings > 0
    ? Math.round((stats.completedBookings / stats.totalBookings) * 100)
    : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <p className="text-xs text-muted-foreground mt-1">
            All time bookings
          </p>
        </CardContent>
      </Card>

      {/* Completed Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.completedBookings}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {completionRate}% completion rate
          </p>
        </CardContent>
      </Card>

      {/* Average Rating */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-tinedy-dark">
            {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.averageRating > 0 ? 'Out of 5.0' : 'No ratings yet'}
          </p>
        </CardContent>
      </Card>

      {/* Total Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-tinedy-yellow" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-tinedy-dark">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            From all bookings
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
