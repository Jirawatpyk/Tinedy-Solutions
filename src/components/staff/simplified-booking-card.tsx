/**
 * SimplifiedBookingCard Component
 *
 * Mobile-optimized booking card:
 * - Larger fonts for readability
 * - Clear time and status header
 * - Customer info with address
 * - 2 small buttons (Call, Map) + 1 primary action
 * - Swipe gesture support
 */

import { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Phone, MapPin, Play, CheckCircle2, Loader2, Users, User, Briefcase } from 'lucide-react'
import { type StaffBooking } from '@/lib/queries/staff-bookings-queries'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/auth-context'
import { formatTime } from '@/lib/booking-utils'
import { StatusBadge, getBookingStatusVariant, getBookingStatusLabel } from '@/components/common/StatusBadge'
import { SwipeableCard } from './swipeable-card'

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
  const [showSuccess, setShowSuccess] = useState(false)
  const [wasJustSwiped, setWasJustSwiped] = useState(false)
  const [isCardRevealed, setIsCardRevealed] = useState(false)
  const swipeTimeoutRef = useRef<NodeJS.Timeout>()

  // Track previous loading states to detect completion
  const prevIsStartingRef = useRef(isStartingProgress)
  const prevIsCompletingRef = useRef(isCompletingProgress)
  const prevStatusRef = useRef(booking.status)

  // Detect when action completes successfully
  useEffect(() => {
    const wasStarting = prevIsStartingRef.current
    const wasCompleting = prevIsCompletingRef.current
    const previousStatus = prevStatusRef.current

    prevIsStartingRef.current = isStartingProgress
    prevIsCompletingRef.current = isCompletingProgress
    prevStatusRef.current = booking.status

    const startSucceeded = wasStarting && !isStartingProgress && previousStatus === 'confirmed' && booking.status === 'in_progress'
    const completeSucceeded = wasCompleting && !isCompletingProgress && previousStatus === 'in_progress' && booking.status === 'completed'

    if (startSucceeded || completeSucceeded) {
      setShowSuccess(true)
      const timeout = setTimeout(() => setShowSuccess(false), 1000)
      return () => clearTimeout(timeout)
    }
  }, [isStartingProgress, isCompletingProgress, booking.status])

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

  const canSwipe = (canStartProgress || canMarkCompleted) && !isStartingProgress && !isCompletingProgress && !showSuccess

  const handleCardClick = useCallback(() => {
    if (wasJustSwiped) return
    setIsCardRevealed(false)
    onViewDetails(booking)
  }, [wasJustSwiped, booking, onViewDetails])

  const handleSwipeReveal = useCallback(() => {
    setWasJustSwiped(true)
    swipeTimeoutRef.current = setTimeout(() => setWasJustSwiped(false), 100)
  }, [])

  const handleSwipeReset = useCallback(() => {
    setIsCardRevealed(false)
  }, [])

  const handleRevealChange = useCallback((revealed: boolean) => {
    setIsCardRevealed(revealed)
  }, [])

  useEffect(() => {
    return () => {
      if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current)
    }
  }, [])

  const formattedDate = useMemo(
    () => showDate ? format(new Date(booking.booking_date), 'dd MMM yyyy') : null,
    [showDate, booking.booking_date]
  )

  // Format full address
  const fullAddress = useMemo(() => {
    return [booking.address, booking.city, booking.state, booking.zip_code]
      .filter(Boolean)
      .join(', ')
  }, [booking.address, booking.city, booking.state, booking.zip_code])

  return (
    <SwipeableCard
      disabled={!canSwipe}
      onSwipeReveal={handleSwipeReveal}
      onSwipeReset={handleSwipeReset}
      isRevealed={isCardRevealed}
      onRevealChange={handleRevealChange}
      revealedContent={canSwipe ? (
        <div className="flex gap-2 bg-muted/80 rounded-lg p-2">
          {canStartProgress && onStartProgress && (
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10"
              onClick={(e) => {
                e.stopPropagation()
                onStartProgress(booking.id)
              }}
              disabled={isStartingProgress}
            >
              {isStartingProgress ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
          )}
          {canMarkCompleted && onMarkCompleted && (
            <Button
              size="icon"
              className="h-10 w-10 bg-green-600 hover:bg-green-700"
              onClick={(e) => {
                e.stopPropagation()
                onMarkCompleted(booking.id)
              }}
              disabled={isCompletingProgress}
            >
              {isCompletingProgress ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
      ) : undefined}
    >
      <Card
        className={`relative overflow-hidden rounded-xl bg-card border shadow-sm transition-all duration-300 hover:shadow-md active:scale-[0.98] cursor-pointer ${
          showSuccess ? 'ring-4 ring-green-500 dark:ring-green-400' : ''
        }`}
        onClick={handleCardClick}
      >
        {/* Success overlay */}
        {showSuccess && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="bg-tinedy-green/90 rounded-full p-3 animate-bounce-once">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
          </div>
        )}

        <CardContent className="p-3 sm:p-5">
          {/* Header Row: Time + Status */}
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="min-w-0">
              <div className="text-base sm:text-xl font-bold text-foreground whitespace-nowrap">
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </div>
              {formattedDate && (
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {formattedDate}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <StatusBadge
                variant={getBookingStatusVariant(booking.status)}
                className="text-xs"
              >
                {getBookingStatusLabel(booking.status)}
              </StatusBadge>
              {isTeamBooking && (
                <Badge
                  variant="outline"
                  className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs px-1.5"
                >
                  <Users className="h-3 w-3" />
                </Badge>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="my-2 border-t border-border/50" />

          {/* Info Section */}
          <div className="space-y-1.5">
            {/* Customer */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm sm:text-lg font-semibold truncate">
                {booking.customers?.full_name || 'Unknown Customer'}
              </span>
            </div>

            {/* Service */}
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs sm:text-base text-muted-foreground truncate">
                {booking.service_packages?.name || 'Unknown Service'}
              </span>
            </div>

            {/* Address */}
            {fullAddress && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {fullAddress}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            {/* Call Button */}
            <Button
              onClick={(e) => {
                e.stopPropagation()
                if (booking.customers?.phone) {
                  window.open(`tel:${booking.customers.phone}`)
                }
              }}
              variant="outline"
              size="sm"
              className="w-[72px] min-h-[44px]"
              disabled={!booking.customers?.phone}
            >
              <Phone className="h-4 w-4 mr-1" />
              Call
            </Button>

            {/* Map Button */}
            <Button
              onClick={(e) => {
                e.stopPropagation()
                if (fullAddress) {
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
                    '_blank'
                  )
                }
              }}
              variant="outline"
              size="sm"
              className="w-[72px] min-h-[44px]"
              disabled={!fullAddress}
            >
              <MapPin className="h-4 w-4 mr-1" />
              Map
            </Button>

            {/* Primary Action */}
            {canStartProgress && onStartProgress && (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onStartProgress(booking.id)
                }}
                disabled={isStartingProgress}
                className="flex-1 min-h-[44px]"
                size="sm"
              >
                {isStartingProgress ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </>
                )}
              </Button>
            )}

            {canMarkCompleted && onMarkCompleted && (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkCompleted(booking.id)
                }}
                disabled={isCompletingProgress}
                className="flex-1 min-h-[44px] bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {isCompletingProgress ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Complete
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </SwipeableCard>
  )
})
