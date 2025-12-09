import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { BookingTimeline } from './booking-timeline'
import { StatusBadge, getBookingStatusVariant, getBookingStatusLabel } from '@/components/common/StatusBadge'
import { CollapsibleSection } from '@/components/common/CollapsibleSection'
import { supabase } from '@/lib/supabase'

interface Review {
  id: string
  booking_id: string
  rating: number
  created_at: string
}

interface TeamMember {
  id: string
  is_active: boolean
  staff_id: string
  full_name: string
  joined_at: string | null
  left_at: string | null
}

interface BookingDetailsModalProps {
  booking: StaffBooking | null
  open: boolean
  onClose: () => void
  onStartProgress?: (bookingId: string) => Promise<void>
  onMarkCompleted?: (bookingId: string) => Promise<void>
  onAddNotes?: (bookingId: string, notes: string) => Promise<void>
}

export function BookingDetailsModal({
  booking,
  open,
  onClose,
  onStartProgress,
  onMarkCompleted,
  onAddNotes,
}: BookingDetailsModalProps) {
  const [notes, setNotes] = useState('')
  const [currentBooking, setCurrentBooking] = useState(booking)
  const [isSaving, setIsSaving] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isMarking, setIsMarking] = useState(false)
  const [review, setReview] = useState<Review | null>(null)
  const [_loadingReview, setLoadingReview] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const { toast } = useToast()

  // Update currentBooking when booking prop changes (from optimistic update or real-time)
  useEffect(() => {
    if (booking) {
      setCurrentBooking(booking)
    }
  }, [booking])

  // Initialize notes with current booking notes when modal opens
  useEffect(() => {
    if (open && booking) {
      setNotes(booking.notes || '')
    }
  }, [open, booking])

  // Fetch review data when modal opens
  useEffect(() => {
    const fetchReview = async () => {
      if (!open || !booking) return

      try {
        setLoadingReview(true)
        const { data, error } = await supabase
          .from('reviews')
          .select('id, booking_id, rating, created_at')
          .eq('booking_id', booking.id)
          .maybeSingle()

        if (error) throw error

        setReview(data)
      } catch (error) {
        console.error('[BookingDetails] Error fetching review:', error)
        setReview(null)
      } finally {
        setLoadingReview(false)
      }
    }

    fetchReview()
  }, [open, booking])

  // Fetch team members who were active at booking creation time
  // This shows the correct team composition when the booking was made
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!open || !booking?.team_id) {
        setTeamMembers([])
        return
      }

      try {
        // Use RPC function to get ALL team members (including former) with their join/leave dates
        // This is separate from get_team_members_by_team_id which only returns active members
        const { data, error } = await supabase
          .rpc('get_all_team_members_with_dates', { p_team_id: booking.team_id })

        if (error) throw error

        // Filter members who were active at booking creation time
        const bookingCreatedAt = new Date(booking.created_at)

        const membersAtBookingTime: TeamMember[] = (data || [])
          .filter((m: { joined_at: string | null; left_at: string | null }) => {
            // Member had joined before or at booking creation
            const joinedAt = m.joined_at ? new Date(m.joined_at) : null
            if (joinedAt && joinedAt > bookingCreatedAt) {
              return false // Joined after booking was created
            }

            // Member hadn't left yet at booking creation
            // Use < (not <=) because if staff left at exactly the same time as booking creation,
            // they were still a member at that moment
            const leftAt = m.left_at ? new Date(m.left_at) : null
            if (leftAt && leftAt < bookingCreatedAt) {
              return false // Already left before booking was created
            }

            return true
          })
          .map((m: { id: string; is_active: boolean; staff_id: string; full_name: string; joined_at: string | null; left_at: string | null }) => ({
            id: m.id,
            is_active: m.is_active,
            staff_id: m.staff_id,
            full_name: m.full_name || 'Unknown',
            joined_at: m.joined_at,
            left_at: m.left_at,
          }))

        setTeamMembers(membersAtBookingTime)
      } catch (error) {
        console.error('[BookingDetails] Error fetching team members:', error)
        setTeamMembers([])
      }
    }

    fetchTeamMembers()
  }, [open, booking?.team_id, booking?.created_at])

  if (!currentBooking) return null

  const handleSaveNotes = async () => {
    if (!onAddNotes) return

    try {
      setIsSaving(true)
      await onAddNotes(currentBooking.id, notes.trim())
      toast({
        title: 'Saved Successfully',
        description: 'Notes saved successfully',
      })
      // Update currentBooking to reflect the saved notes
      setCurrentBooking(prev => prev ? { ...prev, notes: notes.trim() || null } : prev)
    } catch {
      toast({
        title: 'Error',
        description: 'Could not save notes',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartProgress = async () => {
    if (!onStartProgress) return

    try {
      setIsStarting(true)
      await onStartProgress(currentBooking.id)
      toast({
        title: 'Started',
        description: 'Task started successfully',
      })
      onClose()
    } catch {
      toast({
        title: 'Error',
        description: 'Could not start task',
        variant: 'destructive',
      })
    } finally {
      setIsStarting(false)
    }
  }

  const handleMarkCompleted = async () => {
    if (!onMarkCompleted) return

    try {
      setIsMarking(true)
      await onMarkCompleted(currentBooking.id)
      toast({
        title: 'Completed',
        description: 'Task marked as completed successfully',
      })
      onClose()
    } catch {
      toast({
        title: 'Error',
        description: 'Could not mark task as completed',
        variant: 'destructive',
      })
    } finally {
      setIsMarking(false)
    }
  }

  const canStartProgress = currentBooking.status === 'confirmed'
  const canMarkCompleted = currentBooking.status === 'in_progress'


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Booking Details</span>
            <StatusBadge variant={getBookingStatusVariant(currentBooking.status)}>
              {getBookingStatusLabel(currentBooking.status)}
            </StatusBadge>
          </DialogTitle>
          <DialogDescription>
            Booking ID: {currentBooking.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

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
                  {format(new Date(currentBooking.booking_date), 'dd MMM yyyy', { locale: enUS })}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Time</span>
                </div>
                <p className="font-medium">{formatTime(currentBooking.start_time)} - {formatTime(currentBooking.end_time)}</p>
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
                  {currentBooking.customers?.full_name || 'Unknown Customer'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  {currentBooking.customers?.phone || 'No data'}
                </p>
              </div>
              {currentBooking.address && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium flex items-start gap-2">
                    <MapPin className="h-3 w-3 mt-1 flex-shrink-0" />
                    <span>{formatFullAddress(currentBooking)}</span>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const fullAddress = formatFullAddress(currentBooking)
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
                    {currentBooking.service_packages?.name || 'Unknown Service'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {(() => {
                      // Calculate duration from start_time and end_time
                      if (currentBooking.start_time && currentBooking.end_time) {
                        const [startHours, startMinutes] = currentBooking.start_time.split(':').map(Number)
                        const [endHours, endMinutes] = currentBooking.end_time.split(':').map(Number)
                        const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)
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
              {(currentBooking.area_sqm || currentBooking.frequency) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentBooking.area_sqm && (
                    <div>
                      <p className="text-sm text-muted-foreground">Area Size</p>
                      <p className="font-medium">{currentBooking.area_sqm} sqm</p>
                    </div>
                  )}
                  {currentBooking.frequency && (
                    <div>
                      <p className="text-sm text-muted-foreground">Frequency</p>
                      <p className="font-medium">
                        {getFrequencyLabel(currentBooking.frequency)}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {(currentBooking.service_packages?.price ?? 0) > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-medium flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(currentBooking.service_packages?.price ?? 0)}
                  </p>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Team Assignment (only show for team bookings) */}
          {currentBooking.team_id && currentBooking.teams && (
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
                  {/* Team Name */}
                  <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                    <p className="text-sm text-muted-foreground">Team</p>
                    <p className="font-medium">{currentBooking.teams.name}</p>
                  </div>

                  {/* Team Lead */}
                  {currentBooking.teams.team_lead && (
                    <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                      <p className="text-sm text-muted-foreground">Lead</p>
                      <p className="font-medium flex items-center gap-1.5">
                        <Crown className="h-3.5 w-3.5 text-amber-500" />
                        {currentBooking.teams.team_lead.full_name}
                      </p>
                    </div>
                  )}

                  {/* Team Members - fetched separately for complete data */}
                  {teamMembers.length > 0 && (
                    <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                      <p className="text-sm text-muted-foreground">Members</p>
                      <p className="font-medium">
                        {teamMembers.map(m => m.full_name).join(', ')}
                        {' '}
                        <span className="text-muted-foreground text-sm">
                          ({teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'})
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            </>
          )}


          {/* Service Rating - Read Only */}
          {review && (currentBooking.staff_id || currentBooking.team_id) && currentBooking.status === 'completed' && (
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
                  {/* Read-only Star Display */}
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

                  {/* Last Updated */}
                  <p className="text-xs text-muted-foreground">
                    Last updated: {format(new Date(review.created_at), 'dd MMM yyyy', { locale: enUS })}
                  </p>
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* Timeline */}
          <Separator />
          <BookingTimeline bookingId={currentBooking.id} />

          {/* Notes Section - Editable */}
          {onAddNotes && currentBooking.status !== 'cancelled' && (
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
                  {notes !== (currentBooking.notes || '') && (
                    <p className="text-xs text-muted-foreground">
                      * You have unsaved changes
                    </p>
                  )}
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Close
            </Button>
            {notes !== (currentBooking.notes || '') && onAddNotes && (
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
