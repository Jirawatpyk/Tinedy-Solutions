import type { Booking } from '@/types'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { formatTime } from '@/lib/booking-utils'
import { useBookingDetailModal } from '@/hooks/useBookingDetailModal'
import { BookingDetailModal } from '@/pages/admin/booking-detail-modal'

interface TeamRecentBookingsProps {
  teamId: string
}

export function TeamRecentBookings({ teamId }: TeamRecentBookingsProps) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const itemsPerPage = 5

  const loadRecentBookings = useCallback(async () => {
    try {
      // Get total count
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)

      setTotalCount(count || 0)

      // Get paginated data
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_price,
          payment_status,
          address,
          city,
          state,
          zip_code,
          staff_id,
          team_id,
          customers (id, full_name, email, phone),
          service_packages (name, service_type),
          service_packages_v2:package_v2_id (name, service_type)
        `)
        .eq('team_id', teamId)
        .is('deleted_at', null)
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
  }, [teamId, currentPage])

  const modal = useBookingDetailModal({ refresh: loadRecentBookings })

  useEffect(() => {
    loadRecentBookings()
  }, [loadRecentBookings])

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string; className?: string }> = {
      pending: { variant: 'secondary', label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      confirmed: { variant: 'default', label: 'Confirmed', className: 'bg-blue-100 text-blue-800' },
      in_progress: { variant: 'default', label: 'In Progress', className: 'bg-purple-100 text-purple-800' },
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

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <Card className={`transition-opacity duration-150 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-tinedy-blue" />
            <CardTitle>Recent Bookings</CardTitle>
            <Badge variant="secondary">{totalCount}</Badge>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No bookings yet</p>
            <p className="text-sm mt-1">Bookings will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                onClick={() => modal.openDetail(booking)}
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
                    <span>{formatDate(booking.booking_date)}</span>
                    <span>•</span>
                    <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4 space-y-1">
                  <p className="font-semibold text-tinedy-dark">
                    {formatCurrency(Number(booking.total_price))}
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
}
