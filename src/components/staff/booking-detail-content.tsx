/**
 * BookingDetailContent Component
 *
 * Redesigned booking details with hero layout:
 * - Hero section: Time, Date, Status (always visible)
 * - Customer card with quick actions (Call, Map, Navigate)
 * - Service summary (compact)
 * - More Details expandable (Team, Rating, Timeline)
 * - Notes section
 * - Sticky action footer
 */

import { useState, useEffect, lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  CheckCircle2,
  Save,
  Play,
  Star,
  Crown,
  Users,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { type StaffBooking } from '@/lib/queries/staff-bookings-queries'
import { BookingStatus } from '@/types/booking'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { formatFullAddress, calculateDuration } from '@/lib/booking-utils'
import { getFrequencyLabel } from '@/types/service-package-v2'
import { BookingTimelineSkeleton } from '@/components/staff/skeletons'
import { useBookingReview, useBookingTeamMembers } from '@/hooks/use-booking-details'
import { BookingDetailHero } from './booking-detail-hero'
import { BookingCustomerCard } from './booking-customer-card'
import { BookingServiceSummary } from './booking-service-summary'
import { cn } from '@/lib/utils'

// Lazy load BookingTimeline to improve modal open performance
const BookingTimelineLazy = lazy(() =>
  import('./booking-timeline').then((m) => ({ default: m.BookingTimeline }))
)

export interface BookingDetailContentProps {
  /** The booking to display - required */
  booking: StaffBooking
  /** Callback when user starts progress (optional - hide button if not provided) */
  onStartProgress?: (bookingId: string) => Promise<void>
  /** Callback when user marks complete (optional - hide button if not provided) */
  onMarkCompleted?: (bookingId: string) => Promise<void>
  /** Callback when user saves notes (optional - hide notes section if not provided) */
  onAddNotes?: (bookingId: string, notes: string) => Promise<void>
  /** Callback to close the parent modal/sheet */
  onClose: () => void
  /** Whether to show action buttons (default: true) */
  showActions?: boolean
  /** Whether to show sticky footer (Sheet) or inline buttons (Dialog) */
  stickyFooter?: boolean
}

export function BookingDetailContent({
  booking,
  onStartProgress,
  onMarkCompleted,
  onAddNotes,
  onClose,
  showActions = true,
  stickyFooter = false,
}: BookingDetailContentProps) {
  // Internal state
  const [notes, setNotes] = useState(booking.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isMarking, setIsMarking] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const { toast } = useToast()

  // Sync notes state when booking.notes changes (e.g., from realtime updates)
  useEffect(() => {
    setNotes(booking.notes || '')
  }, [booking.notes])

  // Data fetching hooks
  const { review } = useBookingReview(booking.id, true)
  const { teamMembers } = useBookingTeamMembers(
    booking.team_id,
    booking.created_at,
    true
  )

  // Handlers
  const handleSaveNotes = async () => {
    if (!onAddNotes) return
    setIsSaving(true)
    try {
      await onAddNotes(booking.id, notes.trim())
      toast({
        title: 'Saved',
        description: 'Notes saved successfully',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartProgress = async () => {
    if (!onStartProgress) return
    setIsStarting(true)
    try {
      await onStartProgress(booking.id)
      onClose()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to start task',
        variant: 'destructive',
      })
    } finally {
      setIsStarting(false)
    }
  }

  const handleMarkCompleted = async () => {
    if (!onMarkCompleted) return
    setIsMarking(true)
    try {
      await onMarkCompleted(booking.id)
      onClose()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to mark as completed',
        variant: 'destructive',
      })
    } finally {
      setIsMarking(false)
    }
  }

  const canStartProgress = booking.status === BookingStatus.Confirmed
  const canMarkCompleted = booking.status === BookingStatus.InProgress
  const hasNotesChanged = notes !== (booking.notes || '')

  // Calculate duration string
  const durationStr = calculateDuration(booking.start_time, booking.end_time)

  // Check if there are more details to show
  const hasTeamInfo = booking.team_id && booking.teams
  const hasRating = review && booking.status === BookingStatus.Completed
  const hasAreaOrFrequency = booking.area_sqm || booking.frequency
  const hasMoreDetails = hasTeamInfo || hasRating || hasAreaOrFrequency

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0">
        {/* Hero Section */}
        <BookingDetailHero
          startTime={booking.start_time}
          endTime={booking.end_time}
          date={booking.booking_date}
          status={booking.status}
        />

        {/* Customer Card with Quick Actions */}
        <BookingCustomerCard
          customer={booking.customers}
          address={formatFullAddress(booking)}
        />

        {/* Service Summary */}
        <BookingServiceSummary
          serviceName={booking.service_packages?.name}
          duration={durationStr}
          price={booking.service_packages?.price}
          teamName={booking.teams?.name}
        />

        {/* More Details - Expandable */}
        {hasMoreDetails && (
          <div className="mx-4">
            <button
              type="button"
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium text-muted-foreground">
                More Details
              </span>
              {isDetailsOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {isDetailsOpen && (
              <div className="mt-2 space-y-4 px-3 py-3 bg-muted/20 rounded-lg">
                {/* Area & Frequency */}
                {hasAreaOrFrequency && (
                  <div className="space-y-2 text-sm">
                    {booking.area_sqm && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Area</span>
                        <span className="font-medium">{booking.area_sqm} sqm</span>
                      </div>
                    )}
                    {booking.frequency && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frequency</span>
                        <span className="font-medium">
                          {(() => {
                            const freq = booking.frequency
                            if (!freq) return 'N/A'
                            const seq = booking.recurring_sequence
                            const total = booking.recurring_total
                            const hasValidRecurring =
                              seq && total && total > 1 && seq > 0 && seq <= total
                            return hasValidRecurring
                              ? `${seq}/${total} (${getFrequencyLabel(freq)})`
                              : getFrequencyLabel(freq)
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Team Details */}
                {hasTeamInfo && (
                  <div className="space-y-2 text-sm border-t pt-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Users className="h-4 w-4" />
                      <span>Team Details</span>
                    </div>
                    <div className="space-y-1.5 ml-6">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Team</span>
                        <span className="font-medium">{booking.teams?.name}</span>
                      </div>
                      {booking.teams?.team_lead && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lead</span>
                          <span className="font-medium flex items-center gap-1">
                            <Crown className="h-3 w-3 text-amber-500" />
                            {booking.teams.team_lead.full_name}
                          </span>
                        </div>
                      )}
                      {teamMembers.length > 0 && (
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">Members</span>
                          <span className="font-medium text-right">
                            {teamMembers.length} {teamMembers.length === 1 ? 'person' : 'people'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rating */}
                {hasRating && (
                  <div className="space-y-2 text-sm border-t pt-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>Service Rating</span>
                    </div>
                    <div className="flex items-center gap-1 ml-6">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            'h-4 w-4',
                            star <= review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-tinedy-dark/20'
                          )}
                        />
                      ))}
                      <span className="ml-1 text-sm font-medium">
                        {review.rating}/5
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      Rated on{' '}
                      {format(new Date(review.created_at), 'dd MMM yyyy', {
                        locale: enUS,
                      })}
                    </p>
                  </div>
                )}

                {/* Timeline */}
                <div className="border-t pt-3">
                  <Suspense fallback={<BookingTimelineSkeleton />}>
                    <BookingTimelineLazy bookingId={booking.id} />
                  </Suspense>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes Section */}
        {onAddNotes && booking.status !== BookingStatus.Cancelled && (
          <div className="mx-4 space-y-2">
            <label
              htmlFor="booking-notes"
              className="text-sm font-medium text-muted-foreground"
            >
              Notes
            </label>
            <Textarea
              id="booking-notes"
              placeholder="Add notes about this booking..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {hasNotesChanged && (
              <p className="text-xs text-amber-600">* Unsaved changes</p>
            )}
          </div>
        )}
      </div>

      {/* Action Footer - flex-shrink-0 keeps it at bottom */}
      {showActions && (
        <div
          role="group"
          aria-label="Booking actions"
          className={cn(
            'flex-shrink-0 bg-background border-t p-4',
            stickyFooter && 'pb-[max(1rem,env(safe-area-inset-bottom))]'
          )}
        >
          <div className="flex flex-col gap-2">
            {/* Primary action button */}
            {canStartProgress && onStartProgress && (
              <Button
                onClick={handleStartProgress}
                disabled={isStarting}
                className="w-full h-12 text-base bg-purple-600 hover:bg-purple-700"
              >
                <Play className="h-5 w-5 mr-2" />
                {isStarting ? 'Starting...' : 'Start Task'}
              </Button>
            )}
            {canMarkCompleted && onMarkCompleted && (
              <Button
                onClick={handleMarkCompleted}
                disabled={isMarking}
                className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {isMarking ? 'Saving...' : 'Mark as Completed'}
              </Button>
            )}

            {/* Secondary actions */}
            {hasNotesChanged && onAddNotes && (
              <Button
                onClick={handleSaveNotes}
                disabled={isSaving}
                variant="outline"
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Notes'}
              </Button>
            )}

            {/* Close button - only show if no primary action */}
            {!canStartProgress && !canMarkCompleted && (
              <Button onClick={onClose} variant="outline" className="w-full">
                Close
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
