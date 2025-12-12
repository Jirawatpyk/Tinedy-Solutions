import type { Booking } from '@/types'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { formatTime, TEAMS_WITH_LEAD_ALIASED_QUERY } from '@/lib/booking-utils'
import { useBookingDetailModal } from '@/hooks/useBookingDetailModal'
import { BookingDetailModal } from '@/pages/admin/booking-detail-modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { BOOKING_STATUS_LABELS } from '@/constants/booking-status'

const logger = createLogger('TeamRecentBookings')

interface TeamRecentBookingsProps {
  teamId: string
}

export function TeamRecentBookings({ teamId }: TeamRecentBookingsProps) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const itemsPerPage = 5

  const loadRecentBookings = useCallback(async () => {
    try {
      // Build count query with filters
      let countQuery = supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .is('deleted_at', null)

      // Apply status filter
      if (statusFilter !== 'all') {
        countQuery = countQuery.eq('status', statusFilter)
      }

      const { count } = await countQuery
      setTotalCount(count || 0)

      // Get paginated data with filters
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      let dataQuery = supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_price,
          payment_status,
          payment_slip_url,
          payment_method,
          payment_date,
          address,
          city,
          state,
          zip_code,
          notes,
          staff_id,
          team_id,
          team_member_count,
          created_at,
          area_sqm,
          frequency,
          is_recurring,
          recurring_sequence,
          recurring_total,
          recurring_group_id,
          parent_booking_id,
          customers (id, full_name, email, phone),
          service_packages (name, service_type),
          service_packages_v2:package_v2_id (name, service_type),
          profiles:staff_id (id, full_name, email, avatar_url),
          ${TEAMS_WITH_LEAD_ALIASED_QUERY}
        `)
        .eq('team_id', teamId)
        .is('deleted_at', null)

      // Apply status filter
      if (statusFilter !== 'all') {
        dataQuery = dataQuery.eq('status', statusFilter)
      }

      const { data, error } = await dataQuery
        .order('booking_date', { ascending: false })
        .range(from, to)

      if (error) throw error

      // Merge V1 and V2 package data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processedData = (data || []).map((booking: any) => ({
        ...booking,
        service_packages: booking.service_packages || booking.service_packages_v2
      }))

      setBookings(processedData as unknown as Booking[] || [])

      // Trigger fade-in animation after data is loaded
      setTimeout(() => setIsVisible(true), 50)
    } catch (error) {
      console.error('Error loading recent bookings:', error)
    }
  }, [teamId, currentPage, statusFilter])

  const modal = useBookingDetailModal({ refresh: loadRecentBookings, bookings })

  useEffect(() => {
    loadRecentBookings()
  }, [loadRecentBookings])

  // Realtime subscription for booking changes
  useEffect(() => {
    const channel = supabase
      .channel('team-bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          logger.debug('Booking changed', { eventType: payload.eventType })
          loadRecentBookings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, loadRecentBookings])

  // Reset to page 1 when status filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  // No need for client-side filtering anymore - it's done server-side
  const filteredBookings = bookings

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <Card className={`transition-opacity duration-150 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-tinedy-blue" />
            <CardTitle className="text-base sm:text-lg">Recent Bookings</CardTitle>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{totalCount}</Badge>
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
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
        {filteredBookings.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-50" />
            <p className="text-sm sm:text-base">No bookings yet</p>
            <p className="text-xs sm:text-sm mt-1">Bookings will appear here</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredBookings.map((booking) => (
              <div
                key={booking.id}
                onClick={() => modal.openDetail(booking)}
                className="flex flex-col sm:flex-row items-start sm:justify-between p-3 sm:p-4 rounded-md border hover:bg-accent/50 transition-colors cursor-pointer gap-2 sm:gap-0"
              >
                <div className="flex-1 min-w-0 w-full">
                  <p className="text-xs sm:text-sm font-medium mb-1">
                    {booking.customers?.full_name || 'Unknown Customer'}
                    <span className="ml-2 text-[10px] sm:text-xs font-mono text-muted-foreground font-normal">
                      #{booking.id.slice(0, 8)}
                    </span>
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {booking.service_packages?.name || 'Unknown Service'}
                  </p>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1 text-[10px] sm:text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>{formatDate(booking.booking_date)}</span>
                    <span>•</span>
                    <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-2 sm:gap-1 flex-shrink-0 sm:ml-4">
                  <p className="text-sm sm:text-base font-semibold text-tinedy-dark">
                    {formatCurrency(Number(booking.total_price))}
                  </p>
                  <div className="scale-90 sm:scale-100 origin-right">
                    {modal.modalProps.getStatusBadge(booking.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Booking Detail Modal */}
      <BookingDetailModal {...modal.modalProps} />

      {/* Status Change Confirmation Dialog */}
      {modal.selectedBooking && modal.pendingStatusChange && (
        <ConfirmDialog
          open={modal.showStatusConfirm}
          onOpenChange={(open) => !open && modal.cancelStatusChange()}
          title="Confirm Status Change"
          description={modal.getStatusTransitionMessage(
            modal.pendingStatusChange.currentStatus,
            modal.pendingStatusChange.newStatus
          )}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          onConfirm={modal.confirmStatusChange}
          variant={['cancelled', 'no_show'].includes(modal.pendingStatusChange.newStatus) ? 'destructive' : 'default'}
        />
      )}
    </Card>
  )
}
