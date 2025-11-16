import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Booking } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatTime } from '@/lib/booking-utils'

interface StaffRecentBookingsProps {
  bookings: Booking[]
}

const ITEMS_PER_PAGE = 5

export const StaffRecentBookings = memo(function StaffRecentBookings({
  bookings,
}: StaffRecentBookingsProps) {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)

  const totalBookings = bookings.length
  const totalPages = Math.ceil(totalBookings / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedBookings = bookings.slice(startIndex, endIndex)

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        variant: 'default' | 'secondary' | 'outline' | 'destructive'
        label: string
        className?: string
      }
    > = {
      pending: { variant: 'secondary', label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      confirmed: { variant: 'default', label: 'Confirmed', className: 'bg-blue-100 text-blue-800' },
      'in-progress': {
        variant: 'default',
        label: 'In Progress',
        className: 'bg-purple-100 text-purple-800',
      },
      completed: { variant: 'default', label: 'Completed', className: 'bg-green-100 text-green-800' },
      cancelled: { variant: 'outline', label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
    }

    const config = statusConfig[status] || statusConfig.pending

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-tinedy-blue" />
            <CardTitle className="font-display">Recent Bookings</CardTitle>
            <Badge variant="secondary">{totalBookings}</Badge>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {paginatedBookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No bookings yet</p>
            <p className="text-sm mt-1">Bookings will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedBookings.map((booking) => (
              <div
                key={booking.id}
                onClick={() => navigate('/admin/bookings')}
                className="flex items-start justify-between p-3 rounded-md border hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium mb-1">
                    {booking.customers?.full_name || 'Unknown Customer'}
                    <span className="ml-2 text-sm font-mono text-muted-foreground font-normal">
                      #{booking.id.slice(0, 8)}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {booking.service_packages?.name || 'Unknown Service'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{booking.booking_date}</span>
                    <span>•</span>
                    <span>
                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4 space-y-1">
                  <p className="font-semibold text-tinedy-dark">
                    ฿{booking.total_price.toLocaleString()}
                  </p>
                  {getStatusBadge(booking.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
