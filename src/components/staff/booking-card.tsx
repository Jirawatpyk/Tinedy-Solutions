import { memo, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Package, Phone, CheckCircle2, StickyNote, MapPin, Play, Users, Loader2 } from 'lucide-react'
import { type StaffBooking } from '@/lib/queries/staff-bookings-queries'
import { format } from 'date-fns'
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback'
import { useAuth } from '@/contexts/auth-context'
import { formatTime, formatFullAddress } from '@/lib/booking-utils'
import { StatusBadge, getBookingStatusVariant, getBookingStatusLabel } from '@/components/common/StatusBadge'
import { BookingStatus } from '@/types/booking'

interface BookingCardProps {
  booking: StaffBooking
  onViewDetails: (booking: StaffBooking) => void
  onStartProgress?: (bookingId: string) => void
  onMarkCompleted?: (bookingId: string) => void
  showDate?: boolean
  isStartingProgress?: boolean
  isCompletingProgress?: boolean
}

export const BookingCard = memo(function BookingCard({
  booking,
  onViewDetails,
  onStartProgress,
  onMarkCompleted,
  showDate = false,
  isStartingProgress = false,
  isCompletingProgress = false
}: BookingCardProps) {
  const { user } = useAuth()

  // Memoize expensive calculations
  const isTeamBooking = useMemo(
    () => booking.staff_id !== user?.id && booking.team_id,
    [booking.staff_id, booking.team_id, user?.id]
  )

  const canStartProgress = useMemo(
    () => booking.status === BookingStatus.Confirmed,
    [booking.status]
  )

  const canMarkCompleted = useMemo(
    () => booking.status === BookingStatus.InProgress,
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
      className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 active:scale-[0.98] cursor-pointer animate-in fade-in-50 slide-in-from-bottom-4"
      onClick={() => onViewDetails(booking)}
    >
      {/* Modern gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />

      <CardContent className="relative p-2 xs:p-3 sm:p-4 md:p-5">
        {/* Header - Status and Date/Time */}
        <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
              <span className="font-bold text-base sm:text-lg text-foreground/90">
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </span>
            </div>
            {formattedDate && (
              <div className="text-xs sm:text-sm text-muted-foreground ml-8 sm:ml-9">
                {formattedDate}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5 items-end shrink-0">
            <StatusBadge variant={getBookingStatusVariant(booking.status)} className="text-xs">
              {getBookingStatusLabel(booking.status)}
            </StatusBadge>
            {isTeamBooking && (
              <Badge className="bg-gradient-to-r from-indigo-100 to-indigo-50 text-indigo-700 border-indigo-200 dark:from-indigo-900/30 dark:to-indigo-900/20 dark:text-indigo-300 text-xs" variant="outline">
                <Users className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Team Task</span>
                <span className="sm:hidden">Team</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div className="space-y-1.5 sm:space-y-2.5 mb-2 sm:mb-3">
          {/* Customer Name with Avatar */}
          <div className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg bg-muted/30 transition-colors">
            <AvatarWithFallback
              src={booking.customers?.avatar_url}
              alt={booking.customers?.full_name || 'Unknown Customer'}
              size="md"
              className="ring-2 ring-primary/10"
            />
            <span className="font-semibold text-sm sm:text-base line-clamp-1 flex-1">
              {booking.customers?.full_name || 'Unknown Customer'}
            </span>
          </div>

          {/* Info Grid */}
          <div className="grid gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="rounded-md bg-muted/50 p-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </div>
              <span className="text-muted-foreground text-xs sm:text-sm">
                {booking.customers?.phone || 'No phone'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <div className="rounded-md bg-primary/10 p-1.5">
                <Package className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              </div>
              <span className="font-medium text-xs sm:text-sm line-clamp-1 flex-1">
                {booking.service_packages?.name || 'Unknown Service'}
              </span>
            </div>

            {booking.service_packages?.duration_minutes && (
              <div className="flex items-center gap-2 text-sm">
                <div className="rounded-md bg-muted/50 p-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                </div>
                <span className="text-muted-foreground text-xs sm:text-sm">
                  {booking.service_packages.duration_minutes} minutes
                </span>
              </div>
            )}

            {fullAddress && (
              <div className="flex items-start gap-2 text-sm">
                <div className="rounded-md bg-muted/50 p-1.5 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                </div>
                <span className="text-muted-foreground text-xs sm:text-sm break-words line-clamp-2 flex-1">
                  {fullAddress}
                </span>
              </div>
            )}

            {booking.notes && (
              <div className="flex items-start gap-2 text-sm p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30">
                <div className="rounded-md bg-amber-100 dark:bg-amber-900/30 p-1.5 mt-0.5">
                  <StickyNote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                </div>
                <span className="text-amber-900 dark:text-amber-200 text-xs sm:text-sm line-clamp-2 flex-1">
                  {booking.notes}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-1.5 sm:gap-2 mb-2 sm:mb-3">
          <Button
            onClick={(e) => {
              e.stopPropagation()
              window.open(`tel:${booking.customers?.phone}`)
            }}
            variant="outline"
            size="sm"
            className="flex-1 min-h-[44px] transition-all duration-200 active:scale-95"
            disabled={!booking.customers?.phone}
          >
            <Phone className="h-4 w-4 mr-1.5 sm:mr-2" />
            <span className="text-xs sm:text-sm">Call</span>
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
            className="flex-1 min-h-[44px] transition-all duration-200 active:scale-95"
            disabled={!fullAddress}
          >
            <MapPin className="h-4 w-4 mr-1.5 sm:mr-2" />
            <span className="text-xs sm:text-sm">Map</span>
          </Button>
        </div>

        {/* Main Actions */}
        {(canStartProgress || canMarkCompleted) && (
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
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
                className="flex-1 min-w-[120px] min-h-[44px] transition-all duration-200 active:scale-95"
                size="sm"
              >
                {isStartingProgress ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 sm:mr-2 animate-spin" />
                    <span className="text-xs sm:text-sm">Starting...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1.5 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Start Task</span>
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
                className="flex-1 min-w-[120px] min-h-[44px] transition-all duration-200 active:scale-95"
                size="sm"
              >
                {isCompletingProgress ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 sm:mr-2 animate-spin" />
                    <span className="text-xs sm:text-sm">Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Complete</span>
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
