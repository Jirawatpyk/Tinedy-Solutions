import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface Booking {
  id: string
  booking_date: string
  start_time: string
  status: string
  total_price: number
  customers: {
    full_name: string
  } | null
  service_packages: {
    name: string
  } | null
}

interface TeamRecentBookingsProps {
  teamId: string
}

export function TeamRecentBookings({ teamId }: TeamRecentBookingsProps) {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const loadRecentBookings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          status,
          total_price,
          customers (full_name),
          service_packages (name)
        `)
        .eq('team_id', teamId)
        .order('booking_date', { ascending: false })
        .limit(10)

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error('Error loading recent bookings:', error)
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    loadRecentBookings()
  }, [loadRecentBookings])

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string; className?: string }> = {
      pending: { variant: 'secondary', label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      confirmed: { variant: 'default', label: 'Confirmed', className: 'bg-blue-100 text-blue-800' },
      'in-progress': { variant: 'default', label: 'In Progress', className: 'bg-purple-100 text-purple-800' },
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-tinedy-blue" />
          <CardTitle>Recent Bookings</CardTitle>
          <Badge variant="secondary">{bookings.length}</Badge>
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
                onClick={() => navigate('/admin/bookings')}
                className="flex items-start justify-between p-3 rounded-md border hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">
                      {booking.customers?.full_name || 'Unknown Customer'}
                    </p>
                    {getStatusBadge(booking.status)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {booking.service_packages?.name || 'Unknown Service'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(booking.booking_date)}</span>
                    <span>•</span>
                    <span>{booking.start_time}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="font-semibold text-tinedy-dark">
                    {formatCurrency(Number(booking.total_price))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
