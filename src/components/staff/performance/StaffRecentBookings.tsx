import { memo, useState, useEffect } from 'react'
import type { Booking } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatTime } from '@/lib/booking-utils'
import { useBookingDetailModal } from '@/hooks/useBookingDetailModal'
import { BookingDetailModal } from '@/pages/admin/booking-detail-modal'
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, type BookingStatus } from '@/constants/booking-status'

interface StaffRecentBookingsProps {
  bookings: Booking[]
  onRefresh?: () => void
}

const ITEMS_PER_PAGE = 5

export const StaffRecentBookings = memo(function StaffRecentBookings({
  bookings,
  onRefresh = () => {},
}: StaffRecentBookingsProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const modal = useBookingDetailModal({ refresh: onRefresh, bookings })

  // Filter bookings by booking status only
  const filteredBookings = bookings.filter(b => {
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter
    return matchesStatus
  })

  const totalBookings = filteredBookings.length
  const totalPages = Math.ceil(totalBookings / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex)

  // Reset to page 1 when status filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  const getStatusBadge = (status: string) => {
    const colorClass = BOOKING_STATUS_COLORS[status as BookingStatus] || BOOKING_STATUS_COLORS.pending
    const label = BOOKING_STATUS_LABELS[status as BookingStatus] || 'Unknown'

    return (
      <Badge variant="outline" className={`${colorClass} text-[10px] sm:text-xs`}>
        {label}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-tinedy-blue" />
            <CardTitle className="text-base sm:text-lg">Recent Bookings</CardTitle>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{totalBookings}</Badge>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-full sm:w-[140px] text-xs">
                <SelectValue placeholder="Booking" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Booking</SelectItem>
                {Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 sm:h-9"
                >
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 sm:h-9"
                >
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {paginatedBookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm sm:text-base">No bookings yet</p>
            <p className="text-xs sm:text-sm mt-1">Bookings will appear here</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {paginatedBookings.map((booking) => (
              <div
                key={booking.id}
                onClick={() => modal.openDetail(booking)}
                className="flex flex-col sm:flex-row items-start justify-between p-3 sm:p-4 rounded-md border hover:bg-accent/50 transition-colors cursor-pointer gap-3 sm:gap-4"
              >
                <div className="flex-1 min-w-0 w-full">
                  <p className="font-medium mb-1 text-sm sm:text-base">
                    {booking.customers?.full_name || 'Unknown Customer'}
                    <span className="ml-2 text-xs sm:text-sm font-mono text-muted-foreground font-normal">
                      #{booking.id.slice(0, 8)}
                    </span>
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {booking.service_packages?.name || 'Unknown Service'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] sm:text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>{booking.booking_date}</span>
                    <span>•</span>
                    <span>
                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </span>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto flex-shrink-0 gap-2 sm:gap-1">
                  <p className="font-semibold text-tinedy-dark text-sm sm:text-base">
                    ฿{booking.total_price.toLocaleString()}
                  </p>
                  {getStatusBadge(booking.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Booking Detail Modal */}
      <BookingDetailModal {...modal.modalProps} />
    </Card>
  )
})
