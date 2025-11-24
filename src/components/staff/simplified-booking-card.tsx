import { memo, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Phone, MapPin, Play, CheckCircle2, Loader2, Users } from 'lucide-react'
import { type StaffBooking } from '@/lib/queries/staff-bookings-queries'
import { format } from 'date-fns'
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback'
import { useAuth } from '@/contexts/auth-context'
import { formatTime } from '@/lib/booking-utils'
import { StatusBadge, getBookingStatusVariant, getBookingStatusLabel } from '@/components/common/StatusBadge'

interface SimplifiedBookingCardProps {
  booking: StaffBooking
  onViewDetails: (booking: StaffBooking) => void
  onStartProgress?: (bookingId: string) => void
  onMarkCompleted?: (bookingId: string) => void
  showDate?: boolean
  isStartingProgress?: boolean
  isCompletingProgress?: boolean
}

export const SimplifiedBookingCard = memo(function SimplifiedBookingCard({
  booking,
  onViewDetails,
  onStartProgress,
  onMarkCompleted,
  showDate = false,
  isStartingProgress = false,
  isCompletingProgress = false
}: SimplifiedBookingCardProps) {
  const { user } = useAuth()

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

  const formattedDate = useMemo(
    () => showDate ? format(new Date(booking.booking_date), 'dd MMM yyyy') : null,
    [showDate, booking.booking_date]
  )

  return (
    <Card
      className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 active:scale-[0.98] cursor-pointer"
      onClick={() => onViewDetails(booking)}
    >
      {/* Status accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        booking.status === 'confirmed' ? 'bg-gradient-to-r from-blue-500 via-blue-400 to-transparent' :
        booking.status === 'in_progress' ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-transparent' :
        booking.status === 'completed' ? 'bg-gradient-to-r from-green-500 via-green-400 to-transparent' :
        'bg-gradient-to-r from-gray-500 via-gray-400 to-transparent'
      }`} />

      <CardContent className="relative p-3 sm:p-4">
        {/* Header - Time and Status */}
        <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="rounded-md bg-primary/10 p-1.5">
              <Clock className="h-4 w-4 text-primary flex-shrink-0" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-base sm:text-lg text-foreground/90">
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </div>
              {formattedDate && (
                <div className="text-xs text-muted-foreground">
                  {formattedDate}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end shrink-0">
            <StatusBadge variant={getBookingStatusVariant(booking.status)} className="text-xs">
              {getBookingStatusLabel(booking.status)}
            </StatusBadge>
            {isTeamBooking && (
              <Badge className="bg-gradient-to-r from-indigo-100 to-indigo-50 text-indigo-700 border-indigo-200 dark:from-indigo-900/30 dark:to-indigo-900/20 dark:text-indigo-300 text-xs" variant="outline">
                <Users className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Team</span>
                <span className="sm:hidden">T</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Customer Info - Compact */}
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 p-2 rounded-lg bg-muted/30">
          <AvatarWithFallback
            src={booking.customers?.avatar_url}
            alt={booking.customers?.full_name || 'Unknown'}
            size="sm"
            className="ring-2 ring-primary/10"
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm sm:text-base line-clamp-1">
              {booking.customers?.full_name || 'Unknown Customer'}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
              {booking.service_packages?.name || 'Unknown Service'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* Quick Call */}
          <Button
            onClick={(e) => {
              e.stopPropagation()
              window.open(`tel:${booking.customers?.phone}`)
            }}
            variant="outline"
            size="sm"
            className="flex-1 min-h-[40px] sm:min-h-[44px]"
            disabled={!booking.customers?.phone}
          >
            <Phone className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline text-xs">Call</span>
          </Button>

          {/* Quick Map */}
          <Button
            onClick={(e) => {
              e.stopPropagation()
              if (booking.address) {
                const address = `${booking.address}, ${booking.city}, ${booking.state} ${booking.zip_code}`
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
              }
            }}
            variant="outline"
            size="sm"
            className="flex-1 min-h-[40px] sm:min-h-[44px]"
            disabled={!booking.address}
          >
            <MapPin className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline text-xs">Map</span>
          </Button>

          {/* Main Action */}
          {canStartProgress && onStartProgress && (
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onStartProgress(booking.id)
              }}
              disabled={isStartingProgress}
              variant="default"
              className="flex-1 min-h-[40px] sm:min-h-[44px]"
              size="sm"
            >
              {isStartingProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs">Starting...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs">Start</span>
                </>
              )}
            </Button>
          )}

          {canMarkCompleted && onMarkCompleted && (
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onMarkCompleted(booking.id)
              }}
              disabled={isCompletingProgress}
              variant="default"
              className="flex-1 min-h-[40px] sm:min-h-[44px] bg-green-600 hover:bg-green-700"
              size="sm"
            >
              {isCompletingProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs">Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs">Done</span>
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
