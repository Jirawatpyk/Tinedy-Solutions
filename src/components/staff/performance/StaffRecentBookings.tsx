import { memo, useState, useEffect, useCallback } from 'react'
import type { Booking } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatTime, TEAMS_WITH_LEAD_ALIASED_QUERY } from '@/lib/booking-utils'
import { formatDate, formatCurrency } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { useBookingDetailModal } from '@/hooks/useBookingDetailModal'
import { BookingDetailModal } from '@/pages/admin/booking-detail-modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { BOOKING_STATUS_LABELS } from '@/constants/booking-status'
import { supabase } from '@/lib/supabase'

const logger = createLogger('StaffRecentBookings')

interface StaffRecentBookingsProps {
  staffId: string
}

interface MembershipPeriod {
  teamId: string
  joinedAt: string
  leftAt: string | null
}

const ITEMS_PER_PAGE = 5

/**
 * Filter bookings by membership periods
 * Staff should only see team bookings created during their membership period(s)
 * Same logic as staff-bookings-queries.ts filterBookingsByMembershipPeriods()
 */
function filterBookingsByMembershipPeriods<T extends { staff_id?: string | null; team_id?: string | null; created_at?: string }>(
  bookings: T[],
  staffId: string,
  allMembershipPeriods: MembershipPeriod[]
): T[] {
  return bookings.filter(booking => {
    // Direct staff assignment - always show
    if (booking.staff_id === staffId) {
      return true
    }

    // Team booking - check if staff was a member when booking was created
    if (booking.team_id && !booking.staff_id) {
      // Get ALL membership periods for this team (may have multiple after re-join)
      const periodsForTeam = allMembershipPeriods.filter(p => p.teamId === booking.team_id)

      if (periodsForTeam.length === 0) {
        // Staff is not in this team - shouldn't happen but exclude just in case
        return false
      }

      // Use booking.created_at for filtering
      if (!booking.created_at) return false
      const bookingCreatedAt = new Date(booking.created_at)

      // Check if booking falls within ANY of the membership periods
      return periodsForTeam.some(period => {
        const staffJoinedAt = new Date(period.joinedAt)
        const staffLeftAt = period.leftAt ? new Date(period.leftAt) : null

        // Booking must be created AFTER staff joined
        if (bookingCreatedAt < staffJoinedAt) {
          return false
        }

        // Booking must be created BEFORE staff left (if they left)
        if (staffLeftAt && bookingCreatedAt > staffLeftAt) {
          return false
        }

        return true
      })
    }

    return true
  })
}

export const StaffRecentBookings = memo(function StaffRecentBookings({
  staffId,
}: StaffRecentBookingsProps) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isVisible, setIsVisible] = useState(false)

  const loadRecentBookings = useCallback(async () => {
    try {
      // Get ALL team memberships for this staff (with date ranges for filtering)
      // Include both active AND former memberships to support multiple periods per team
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id, joined_at, left_at')
        .eq('staff_id', staffId)

      // Build membership periods array for filtering
      const allMembershipPeriods: MembershipPeriod[] = (teamMemberships || []).map(tm => ({
        teamId: tm.team_id,
        joinedAt: tm.joined_at || '2020-01-01T00:00:00Z',
        leftAt: tm.left_at || null
      }))

      // Get unique team IDs (all teams, including former - for querying bookings)
      const allTeamIds = [...new Set((teamMemberships || []).map(tm => tm.team_id))]

      // Build OR condition: staff_id = id OR (team_id IN teamIds AND staff_id IS NULL)
      let orCondition = `staff_id.eq.${staffId}`
      if (allTeamIds.length > 0) {
        orCondition = `staff_id.eq.${staffId},and(team_id.in.(${allTeamIds.join(',')}),staff_id.is.null)`
      }

      // Get ALL matching bookings (we'll filter by membership periods client-side)
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
        .or(orCondition)
        .is('deleted_at', null)

      // Apply status filter
      if (statusFilter !== 'all') {
        dataQuery = dataQuery.eq('status', statusFilter)
      }

      const { data, error } = await dataQuery
        .order('booking_date', { ascending: false })

      if (error) throw error

      // Filter bookings by membership periods (same logic as Staff Portal)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filteredData = filterBookingsByMembershipPeriods(data || [], staffId, allMembershipPeriods)

      // Update total count after filtering
      setTotalCount(filteredData.length)

      // Apply pagination client-side
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE
      const paginatedData = filteredData.slice(from, to)

      // Merge V1 and V2 package data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processedData = paginatedData.map((booking: any) => ({
        ...booking,
        service_packages: booking.service_packages || booking.service_packages_v2
      }))

      setBookings(processedData as unknown as Booking[] || [])

      // Trigger fade-in animation after data is loaded
      setTimeout(() => setIsVisible(true), 50)
    } catch (error) {
      console.error('Error loading recent bookings:', error)
    }
  }, [staffId, currentPage, statusFilter])

  const modal = useBookingDetailModal({ refresh: loadRecentBookings, bookings })

  useEffect(() => {
    loadRecentBookings()
  }, [loadRecentBookings])

  // Realtime subscription for booking changes
  useEffect(() => {
    // Get ALL team IDs for this staff (including former teams for proper filtering)
    const getTeamIds = async () => {
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('staff_id', staffId)

      return teamMemberships?.map(tm => tm.team_id) || []
    }

    // Set up subscription
    const setupSubscription = async () => {
      const teamIds = await getTeamIds()

      const channel = supabase
        .channel('staff-bookings-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
          },
          (payload) => {
            logger.debug('Booking changed', { eventType: payload.eventType })

            // Check if this booking is relevant to this staff
            const booking = payload.new as { staff_id?: string | null; team_id?: string | null }
            const oldBooking = payload.old as { staff_id?: string | null; team_id?: string | null }

            // Simplified check - full filtering happens in loadRecentBookings
            const isRelevant =
              booking?.staff_id === staffId ||
              oldBooking?.staff_id === staffId ||
              (booking?.team_id && teamIds.includes(booking.team_id) && !booking.staff_id) ||
              (oldBooking?.team_id && teamIds.includes(oldBooking.team_id) && !oldBooking.staff_id)

            if (isRelevant) {
              logger.debug('Relevant change, refreshing data...')
              loadRecentBookings()
            }
          }
        )
        .subscribe()

      return channel
    }

    const channelPromise = setupSubscription()

    return () => {
      channelPromise.then((channel) => {
        supabase.removeChannel(channel)
      })
    }
  }, [staffId, loadRecentBookings])

  // Reset to page 1 when status filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  // No need for client-side filtering anymore - it's done server-side
  const filteredBookings = bookings

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

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
})
