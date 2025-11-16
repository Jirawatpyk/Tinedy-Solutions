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
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  User,
  Package,
  Phone,
  Calendar,
  DollarSign,
  StickyNote,
  CheckCircle2,
  Save,
  MapPin,
  Play,
} from 'lucide-react'
import { type StaffBooking } from '@/hooks/use-staff-bookings'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { formatFullAddress } from '@/lib/booking-utils'
import { formatTime } from '@/lib/booking-utils'
import { BookingTimeline } from './booking-timeline'
import { StatusBadge, getBookingStatusVariant, getBookingStatusLabel } from '@/components/common/StatusBadge'

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
  const { toast } = useToast()

  // Update currentBooking when booking prop changes (from optimistic update or real-time)
  useEffect(() => {
    if (booking) {
      setCurrentBooking(booking)
    }
  }, [booking])

  // Reset notes field when modal opens or booking changes
  useEffect(() => {
    if (open && booking) {
      setNotes('')
    }
  }, [open, booking])

  if (!currentBooking) return null

  const handleSaveNotes = async () => {
    if (!onAddNotes || !notes.trim()) return

    try {
      setIsSaving(true)
      await onAddNotes(currentBooking.id, notes.trim())
      toast({
        title: 'Saved Successfully',
        description: 'Notes saved successfully',
      })
      setNotes('')
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <Separator />

          {/* Customer Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </h3>
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
          </div>

          <Separator />

          {/* Service Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Service Information
            </h3>
            <div className="ml-6 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {((currentBooking as any).area_sqm || (currentBooking as any).frequency) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(currentBooking as any).area_sqm && (
                    <div>
                      <p className="text-sm text-muted-foreground">Area Size</p>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <p className="font-medium">{(currentBooking as any).area_sqm} sqm</p>
                    </div>
                  )}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(currentBooking as any).frequency && (
                    <div>
                      <p className="text-sm text-muted-foreground">Frequency</p>
                      <p className="font-medium">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(currentBooking as any).frequency === 1 && 'Once'}
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(currentBooking as any).frequency === 2 && 'Twice a month'}
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(currentBooking as any).frequency === 4 && 'Weekly'}
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(currentBooking as any).frequency === 8 && 'Twice a week'}
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
                    ฿{currentBooking.service_packages?.price?.toLocaleString() ?? '0'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Existing Notes */}
          {currentBooking.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Current Notes
                </h3>
                <div className="ml-6 p-3 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{currentBooking.notes}</p>
                </div>
              </div>
            </>
          )}

          {/* Timeline */}
          <Separator />
          <BookingTimeline bookingId={currentBooking.id} />

          {/* Add/Update Notes */}
          {onAddNotes && currentBooking.status !== 'cancelled' && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  {currentBooking.notes ? 'Update Notes' : 'Add Notes'}
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this booking..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Close
            </Button>
            {notes.trim() && onAddNotes && (
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
