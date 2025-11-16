import { memo, useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Package, Phone, CheckCircle2, StickyNote, MapPin, Play, Users, Loader2 } from 'lucide-react'
import { type StaffBooking } from '@/hooks/use-staff-bookings'
import { format } from 'date-fns'
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback'
import { useAuth } from '@/contexts/auth-context'
import { formatTime, formatFullAddress } from '@/lib/booking-utils'
import { StatusBadge, getBookingStatusVariant, getBookingStatusLabel } from '@/components/common/StatusBadge'

interface BookingCardProps {
  booking: StaffBooking
  onViewDetails: (booking: StaffBooking) => void
  onStartProgress?: (bookingId: string) => void
  onMarkCompleted?: (bookingId: string) => void
  showDate?: boolean
}

export const BookingCard = memo(function BookingCard({
  booking,
  onViewDetails,
  onStartProgress,
  onMarkCompleted,
  showDate = false
}: BookingCardProps) {
  const { user } = useAuth()
  const [isStarting, setIsStarting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  // Memoize expensive calculations
  const isTeamBooking = useMemo(
    () => booking.staff_id !== user?.id && booking.team_id,
    [booking.staff_id, booking.team_id, user?.id]
  )

  const canStartProgress = useMemo(
    () => booking.status === 'confirmed',
    [booking.status]
  )

  const canMarkCompleted = useMemo(
    () => booking.status === 'in_progress',
    [booking.status]
  )

  const fullAddress = useMemo(
    () => booking.address ? formatFullAddress({
      address: booking.address,
      city: booking.city,
      state: booking.state,
      zip_code: booking.zip_code
    }) : null,
    [booking.address, booking.city, booking.state, booking.zip_code]
  )

  const formattedDate = useMemo(
    () => showDate ? format(new Date(booking.booking_date), 'dd MMM yyyy') : null,
    [showDate, booking.booking_date]
  )

  return (
    <Card
      className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 ease-in-out animate-in fade-in-50 slide-in-from-bottom-4 cursor-pointer"
      onClick={() => onViewDetails(booking)}
    >
      <CardContent className="p-4 sm:p-6">
        {/* Header - Status and Date/Time */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-semibold text-lg">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
            </div>
            {formattedDate && (
              <div className="text-sm text-muted-foreground ml-6">
                {formattedDate}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            <StatusBadge variant={getBookingStatusVariant(booking.status)}>
              {getBookingStatusLabel(booking.status)}
            </StatusBadge>
            {isTeamBooking && (
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200" variant="outline">
                <Users className="h-3 w-3 mr-1" />
                Team Task
              </Badge>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3">
            <AvatarWithFallback
              src={booking.customers?.avatar_url}
              alt={booking.customers?.full_name || 'Unknown Customer'}
              size="md"
            />
            <span className="font-medium">
              {booking.customers?.full_name || 'Unknown Customer'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">
              {booking.customers?.phone || 'No phone'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">
              {booking.service_packages?.name || 'Unknown Service'}
            </span>
          </div>

          {booking.service_packages?.duration_minutes && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">
                {booking.service_packages.duration_minutes} minutes
              </span>
            </div>
          )}

          {fullAddress && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground break-words">
                {fullAddress}
              </span>
            </div>
          )}

          {booking.notes && (
            <div className="flex items-start gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground line-clamp-2">
                {booking.notes}
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-3">
          <Button
            onClick={(e) => {
              e.stopPropagation()
              window.open(`tel:${booking.customers?.phone}`)
            }}
            variant="outline"
            size="sm"
            className="flex-1 transition-all duration-200 hover:scale-105 active:scale-95"
            disabled={!booking.customers?.phone}
          >
            <Phone className="h-3 w-3 mr-1" />
            Call
          </Button>
          <Button
            onClick={useCallback((e: React.MouseEvent) => {
              e.stopPropagation()
              if (fullAddress) {
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`, '_blank')
              }
            }, [fullAddress])}
            variant="outline"
            size="sm"
            className="flex-1 transition-all duration-200 hover:scale-105 active:scale-95"
            disabled={!fullAddress}
          >
            <MapPin className="h-3 w-3 mr-1" />
            Map
          </Button>
        </div>

        {/* Main Actions */}
        {(canStartProgress || canMarkCompleted) && (
          <div className="flex gap-2 flex-wrap">
            {canStartProgress && onStartProgress && (
              <Button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  setIsStarting(true)
                  try {
                    await onStartProgress(booking.id)
                  } finally {
                    setIsStarting(false)
                  }
                }}
                disabled={isStarting}
                variant="default"
                className="flex-1 min-w-[120px] bg-purple-600 hover:bg-purple-700 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg"
                size="sm"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1 transition-transform duration-200 group-hover:rotate-12" />
                    Start Task
                  </>
                )}
              </Button>
            )}
            {canMarkCompleted && onMarkCompleted && (
              <Button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  setIsCompleting(true)
                  try {
                    await onMarkCompleted(booking.id)
                  } finally {
                    setIsCompleting(false)
                  }
                }}
                disabled={isCompleting}
                variant="default"
                className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg"
                size="sm"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1 transition-transform duration-200 group-hover:scale-110" />
                    Complete
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
