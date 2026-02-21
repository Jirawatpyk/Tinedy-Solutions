import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, Phone, MapPin, User, Users, ChevronLeft, ChevronRight, Crown, X } from 'lucide-react'
import { formatCurrency, formatBookingId, getBangkokNowHHMM, timeToMinutes } from '@/lib/utils'
import { formatDateRange } from '@/lib/date-range-utils'
import { EmptyState } from '@/components/common/EmptyState'
import { getStatusBadge, getPaymentStatusBadge, getServiceTypeBadge } from '@/lib/booking-badges'
import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/constants/booking-status'
import type { TodayBooking } from '@/types/dashboard'
import type { AttentionFilter } from './NeedsAttention'

interface TodayAppointmentsListProps {
  bookings: TodayBooking[]
  onBookingClick: (booking: TodayBooking) => void
  loading: boolean
  attentionFilter?: AttentionFilter | null
  onClearAttentionFilter?: () => void
}

const ATTENTION_FILTER_LABELS: Record<AttentionFilter, string> = {
  pending: 'Pending bookings',
  unverified: 'Unverified payments',
  starting_soon: 'Starting soon',
}

/**
 * TodayAppointmentsList Component
 *
 * แสดงรายการ appointments วันนี้พร้อม pagination (paginate เมื่อ > 10 รายการ)
 */
export const TodayAppointmentsList = ({
  bookings,
  onBookingClick,
  loading,
  attentionFilter = null,
  onClearAttentionFilter,
}: TodayAppointmentsListProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')
  const itemsPerPage = 10

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, paymentStatusFilter, attentionFilter])

  // Apply attention pre-filter, then status/payment filters
  const filteredBookings = useMemo(() => {
    const nowMinutes = attentionFilter === 'starting_soon' ? timeToMinutes(getBangkokNowHHMM()) : 0
    return bookings.filter((b) => {
      // Attention pre-filter
      if (attentionFilter === 'pending' && b.status !== 'pending') return false
      if (attentionFilter === 'unverified' && b.payment_status !== 'pending_verification') return false
      if (attentionFilter === 'starting_soon') {
        const diff = timeToMinutes(b.start_time) - nowMinutes
        if (!(diff > 0 && diff <= 60)) return false
      }
      // Status and payment filters
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter
      const matchesPayment = paymentStatusFilter === 'all' || b.payment_status === paymentStatusFilter
      return matchesStatus && matchesPayment
    })
  }, [bookings, statusFilter, paymentStatusFilter, attentionFilter])

  const shouldPaginate = filteredBookings.length > itemsPerPage

  const paginatedBookings = useMemo(() => {
    if (!shouldPaginate) return filteredBookings
    return filteredBookings.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    )
  }, [filteredBookings, currentPage, shouldPaginate])

  const totalPages = useMemo(() => {
    return Math.ceil(filteredBookings.length / itemsPerPage)
  }, [filteredBookings.length])

  const isFiltered = attentionFilter !== null

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Calendar className="h-5 w-5 text-tinedy-blue" />
            Today's Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="p-4 border rounded-lg space-y-3 animate-pulse"
              >
                <div className="h-5 bg-muted rounded w-40" />
                <div className="h-4 bg-muted rounded w-56" />
                <div className="h-4 bg-muted rounded w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="font-display flex items-center gap-2">
            <Calendar className="h-5 w-5 text-tinedy-blue" />
            Today's Appointments
            <Badge variant="secondary" className="text-xs">{filteredBookings.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Attention filter chip */}
            {attentionFilter && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 border-tinedy-blue/30 text-tinedy-blue"
                onClick={onClearAttentionFilter}
              >
                {ATTENTION_FILTER_LABELS[attentionFilter]}
                <X className="h-3 w-3" />
              </Button>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 flex-1 sm:flex-none sm:w-[140px] text-xs">
                <SelectValue placeholder="Booking" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bookings</SelectItem>
                {Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="h-8 flex-1 sm:flex-none sm:w-[140px] text-xs">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment</SelectItem>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={isFiltered ? 'No matching bookings' : 'No bookings today — enjoy the break!'}
              className="py-8"
            />
          ) : (
            <>
              {paginatedBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-4 cursor-pointer"
                  onClick={() => onBookingClick(booking)}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-tinedy-dark">
                          {booking.customers?.full_name || 'Unknown Customer'}
                          <span className="ml-2 text-sm text-muted-foreground font-normal">
                            {formatBookingId(booking.id)}
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.customers?.email || 'No email'}
                        </p>
                      </div>
                      <div className="sm:hidden">
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center">
                        {getServiceTypeBadge(
                          booking.service_packages?.service_type ?? booking.service_packages_v2?.service_type,
                          booking.price_mode,
                          'mr-1.5 sm:mr-2 text-[10px] sm:text-xs'
                        )}
                        {booking.job_name ||
                          booking.service_packages?.name ||
                          booking.service_packages_v2?.name ||
                          'Unknown Service'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {booking.end_date && booking.end_date !== booking.booking_date
                          ? `${formatDateRange(booking.booking_date, booking.end_date)} • `
                          : ''}
                        {booking.start_time.slice(0, 5)} -{' '}
                        {booking.end_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{booking.customers?.phone || 'No phone'}</span>
                    </div>
                    {booking.address && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          {[
                            booking.address,
                            booking.city,
                            booking.state,
                            booking.zip_code,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                    {booking.profiles && (
                      <p className="text-sm text-tinedy-blue flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Staff: {booking.profiles.full_name}
                      </p>
                    )}
                    {booking.teams && (
                      <div className="text-sm text-tinedy-green space-y-1">
                        <p className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Team: {booking.teams.name}
                        </p>
                        {booking.teams.team_lead && (
                          <p className="flex items-center gap-1 ml-4 text-xs text-muted-foreground">
                            <Crown className="h-3 w-3 text-amber-600" />
                            Lead: {booking.teams.team_lead.full_name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Price & Payment Status Section */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    {/* Mobile: Price row with border-top */}
                    <div className="flex items-center justify-between pt-3 border-t sm:hidden">
                      <p className="font-semibold text-tinedy-dark text-lg">
                        {formatCurrency(Number(booking.total_price))}
                      </p>
                      {getPaymentStatusBadge(booking.payment_status)}
                    </div>
                    {/* Desktop: Price and badges */}
                    <div className="hidden sm:flex sm:flex-col sm:gap-2 sm:items-end">
                      <p className="font-semibold text-tinedy-dark text-lg">
                        {formatCurrency(Number(booking.total_price))}
                      </p>
                      {getStatusBadge(booking.status)}
                      {getPaymentStatusBadge(booking.payment_status)}
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination — only shown when > 10 items */}
              {shouldPaginate && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of{' '}
                    {filteredBookings.length} appointments
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
