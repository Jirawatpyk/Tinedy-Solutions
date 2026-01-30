/**
 * BookingDetailContent Component
 *
 * Shared content component for booking details.
 * Used by both BookingDetailsModal (Dialog) and BookingDetailsSheet (Sheet).
 */

import { useState, useEffect, lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  User,
  Users,
  Package,
  Phone,
  Calendar,
  DollarSign,
  StickyNote,
  CheckCircle2,
  Save,
  MapPin,
  Play,
  Star,
  Crown,
} from 'lucide-react'
import { type StaffBooking } from '@/lib/queries/staff-bookings-queries'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { formatFullAddress } from '@/lib/booking-utils'
import { getFrequencyLabel } from '@/types/service-package-v2'
import { formatTime } from '@/lib/booking-utils'
import { formatCurrency } from '@/lib/utils'
import { BookingTimelineSkeleton } from '@/components/staff/skeletons'
import { CollapsibleSection } from '@/components/common/CollapsibleSection'
import { useBookingReview, useBookingTeamMembers } from '@/hooks/use-booking-details'

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
  const { toast } = useToast()

  // F12 fix: Sync notes state when booking.notes changes (e.g., from realtime updates)
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

  const canStartProgress = booking.status === 'confirmed'
  const canMarkCompleted = booking.status === 'in_progress'

  return (
    <>
      {/* Content sections */}
      <div className="space-y-6">
        {/* Date and Time */}
        <CollapsibleSection
          title={
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </h3>
          }
          className="space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Date</span>
              </div>
              <p className="font-medium">
                {format(new Date(booking.booking_date), 'dd MMM yyyy', {
                  locale: enUS,
                })}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Time</span>
              </div>
              <p className="font-medium">
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </p>
            </div>
          </div>
        </CollapsibleSection>

        <Separator />

        {/* Customer Information */}
        <CollapsibleSection
          title={
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </h3>
          }
          className="space-y-3"
        >
          <div className="space-y-2 ml-6">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">
                {booking.customers?.full_name || 'Unknown Customer'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium flex items-center gap-2">
                <Phone className="h-3 w-3" />
                {booking.customers?.phone || 'No data'}
              </p>
            </div>
            {booking.address && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium flex items-start gap-2">
                  <MapPin className="h-3 w-3 mt-1 flex-shrink-0" />
                  <span>{formatFullAddress(booking)}</span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const fullAddress = formatFullAddress(booking)
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
                      '_blank'
                    )
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Open Map
                </Button>
              </div>
            )}
          </div>
        </CollapsibleSection>

        <Separator />

        {/* Service Information */}
        <CollapsibleSection
          title={
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Service Information
            </h3>
          }
          className="space-y-3"
        >
          <div className="ml-6 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Service Name</p>
                <p className="font-medium">
                  {booking.service_packages?.name || 'Unknown Service'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">
                  {(() => {
                    if (booking.start_time && booking.end_time) {
                      const [startHours, startMinutes] = booking.start_time
                        .split(':')
                        .map(Number)
                      const [endHours, endMinutes] = booking.end_time
                        .split(':')
                        .map(Number)
                      const durationMinutes =
                        endHours * 60 +
                        endMinutes -
                        (startHours * 60 + startMinutes)
                      const hours = Math.floor(durationMinutes / 60)
                      const minutes = durationMinutes % 60

                      if (hours > 0 && minutes > 0) {
                        return `${hours} hours ${minutes} minutes`
                      } else if (hours > 0) {
                        return `${hours} hours`
                      } else {
                        return `${minutes} minutes`
                      }
                    }
                    return 'N/A'
                  })()}
                </p>
              </div>
            </div>
            {(booking.area_sqm || booking.frequency) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {booking.area_sqm && (
                  <div>
                    <p className="text-sm text-muted-foreground">Area Size</p>
                    <p className="font-medium">{booking.area_sqm} sqm</p>
                  </div>
                )}
                {booking.frequency && (
                  <div>
                    <p className="text-sm text-muted-foreground">Frequency</p>
                    <p className="font-medium">
                      {(() => {
                        const freq = booking.frequency!
                        const seq = booking.recurring_sequence
                        const total = booking.recurring_total
                        const hasValidRecurring =
                          seq && total && total > 1 && seq > 0 && seq <= total
                        return hasValidRecurring
                          ? `${seq}/${total} (${getFrequencyLabel(freq)})`
                          : getFrequencyLabel(freq)
                      })()}
                    </p>
                  </div>
                )}
              </div>
            )}
            {(booking.service_packages?.price ?? 0) > 0 && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="font-medium flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(booking.service_packages?.price ?? 0)}
                </p>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Team Assignment (only show for team bookings) */}
        {booking.team_id && booking.teams && (
          <>
            <Separator />
            <CollapsibleSection
              title={
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Assignment
                </h3>
              }
              className="space-y-3"
            >
              <div className="ml-6 space-y-3">
                <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                  <p className="text-sm text-muted-foreground">Team</p>
                  <p className="font-medium">{booking.teams.name}</p>
                </div>
                {booking.teams.team_lead && (
                  <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                    <p className="text-sm text-muted-foreground">Lead</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                      {booking.teams.team_lead.full_name}
                    </p>
                  </div>
                )}
                {teamMembers.length > 0 && (
                  <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                    <p className="text-sm text-muted-foreground">Members</p>
                    <p className="font-medium">
                      {teamMembers.map((m) => m.full_name).join(', ')}{' '}
                      <span className="text-muted-foreground text-sm">
                        ({teamMembers.length}{' '}
                        {teamMembers.length === 1 ? 'member' : 'members'})
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </>
        )}

        {/* Service Rating - Read Only */}
        {review &&
          (booking.staff_id || booking.team_id) &&
          booking.status === 'completed' && (
            <>
              <Separator />
              <CollapsibleSection
                title={
                  <h3 className="font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Service Rating
                  </h3>
                }
                className="space-y-3"
              >
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-medium">
                      {review.rating}/5
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last updated:{' '}
                    {format(new Date(review.created_at), 'dd MMM yyyy', {
                      locale: enUS,
                    })}
                  </p>
                </div>
              </CollapsibleSection>
            </>
          )}

        {/* Timeline */}
        <Separator />
        <Suspense fallback={<BookingTimelineSkeleton />}>
          <BookingTimelineLazy bookingId={booking.id} />
        </Suspense>

        {/* Notes Section - Editable */}
        {onAddNotes && booking.status !== 'cancelled' && (
          <>
            <Separator />
            <CollapsibleSection
              title={
                <h3 className="font-semibold flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Notes
                </h3>
              }
              className="space-y-3"
            >
              <div className="ml-6 space-y-2">
                <Textarea
                  id="notes"
                  placeholder="Add notes about this booking..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                {notes !== (booking.notes || '') && (
                  <p className="text-xs text-muted-foreground">
                    * You have unsaved changes
                  </p>
                )}
              </div>
            </CollapsibleSection>
          </>
        )}
      </div>

      {/* S2+S3 fix: Actions with role="group" and actual button code */}
      {showActions && (
        <div
          role="group"
          aria-label="Booking actions"
          className={
            stickyFooter
              ? 'sticky bottom-0 bg-background border-t p-4 pb-[env(safe-area-inset-bottom)] mt-4'
              : 'flex flex-col sm:flex-row gap-2 md:gap-3 pt-4'
          }
        >
          {stickyFooter ? (
            // Sticky footer layout for Sheet
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={onClose} variant="outline" className="flex-1">
                Close
              </Button>
              {notes !== (booking.notes || '') && onAddNotes && (
                <Button
                  onClick={handleSaveNotes}
                  disabled={isSaving}
                  variant="secondary"
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Notes'}
                </Button>
              )}
              {canStartProgress && onStartProgress && (
                <Button
                  onClick={handleStartProgress}
                  disabled={isStarting}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isStarting ? 'Starting...' : 'Start Task'}
                </Button>
              )}
              {canMarkCompleted && onMarkCompleted && (
                <Button
                  onClick={handleMarkCompleted}
                  disabled={isMarking}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isMarking ? 'Saving...' : 'Mark as Completed'}
                </Button>
              )}
            </div>
          ) : (
            // Inline layout for Dialog
            <>
              <Button onClick={onClose} variant="outline" className="flex-1">
                Close
              </Button>
              {notes !== (booking.notes || '') && onAddNotes && (
                <Button
                  onClick={handleSaveNotes}
                  disabled={isSaving}
                  variant="secondary"
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Notes'}
                </Button>
              )}
              {canStartProgress && onStartProgress && (
                <Button
                  onClick={handleStartProgress}
                  disabled={isStarting}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isStarting ? 'Starting...' : 'Start Task'}
                </Button>
              )}
              {canMarkCompleted && onMarkCompleted && (
                <Button
                  onClick={handleMarkCompleted}
                  disabled={isMarking}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isMarking ? 'Saving...' : 'Mark as Completed'}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
