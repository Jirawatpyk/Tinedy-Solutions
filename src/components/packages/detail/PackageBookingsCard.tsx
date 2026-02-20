import React, { useMemo } from 'react'
import { FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { formatTime, getAllStatusOptions } from '@/lib/booking-utils'

// ============================================================================
// Types
// ============================================================================

export interface BookingWithRelations {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  payment_status?: string
  customers: {
    id: string
    full_name: string
    phone: string
  } | null
  profiles: {
    full_name: string
  } | null
  teams: {
    name: string
  } | null
}

export interface PackageBookingsCardProps {
  bookings: BookingWithRelations[]
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  bookingsPage: number
  onPageChange: (page: number) => void
  getStatusBadge: (status: string) => React.ReactNode
  BOOKINGS_PER_PAGE?: number
}

// ============================================================================
// Component
// ============================================================================

const DEFAULT_BOOKINGS_PER_PAGE = 5

function PackageBookingsCardComponent({
  bookings,
  statusFilter,
  onStatusFilterChange,
  bookingsPage,
  onPageChange,
  getStatusBadge,
  BOOKINGS_PER_PAGE = DEFAULT_BOOKINGS_PER_PAGE,
}: PackageBookingsCardProps) {
  // Filter bookings by status
  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings
    return bookings.filter((b) => b.status === statusFilter)
  }, [bookings, statusFilter])

  // Calculate pagination
  const totalPages = Math.ceil(filteredBookings.length / BOOKINGS_PER_PAGE)

  // Get paginated bookings
  const paginatedBookings = useMemo(() => {
    const start = (bookingsPage - 1) * BOOKINGS_PER_PAGE
    const end = start + BOOKINGS_PER_PAGE
    return filteredBookings.slice(start, end)
  }, [filteredBookings, bookingsPage, BOOKINGS_PER_PAGE])

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              Recent Bookings
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Recent bookings using this package
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Booking" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bookings</SelectItem>
                {getAllStatusOptions().map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs sm:text-sm">{filteredBookings.length} total</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {bookings.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">No bookings found for this package</p>
          </div>
        ) : (
          <>
            {/* Mobile: Card View */}
            <div className="sm:hidden space-y-3">
              {paginatedBookings.map((booking) => (
                <div key={booking.id} className="border rounded-lg p-3 bg-tinedy-off-white/30">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{booking.customers?.full_name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{booking.customers?.phone || ''}</p>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">{formatDate(booking.booking_date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Time:</span>
                      <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Assigned:</span>
                      <span>{booking.teams?.name || booking.profiles?.full_name || 'Unassigned'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-2 pt-2 border-t">
                    <span className="font-semibold text-sm">{formatCurrency(booking.total_price)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Customer</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Date & Time</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Assigned To</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Amount</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="whitespace-nowrap">
                          <div>
                            <p className="font-medium text-xs sm:text-sm">{booking.customers?.full_name || 'N/A'}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">{booking.customers?.phone || ''}</p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div>
                            <p className="font-medium text-xs sm:text-sm">{formatDate(booking.booking_date)}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                          {booking.teams?.name || booking.profiles?.full_name || 'Unassigned'}
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                          {formatCurrency(booking.total_price)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{getStatusBadge(booking.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-4">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Showing {(bookingsPage - 1) * BOOKINGS_PER_PAGE + 1} to{' '}
                  {Math.min(bookingsPage * BOOKINGS_PER_PAGE, filteredBookings.length)} of {filteredBookings.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, bookingsPage - 1))}
                    disabled={bookingsPage === 1}
                    className="h-8 sm:h-9"
                  >
                    <span className="text-xs sm:text-sm">Previous</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, bookingsPage + 1))}
                    disabled={bookingsPage === totalPages}
                    className="h-8 sm:h-9"
                  >
                    <span className="text-xs sm:text-sm">Next</span>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export const PackageBookingsCard = React.memo(PackageBookingsCardComponent)
PackageBookingsCard.displayName = 'PackageBookingsCard'
