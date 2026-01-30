import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type StaffBooking } from '@/lib/queries/staff-bookings-queries'
import { formatBookingId } from '@/lib/utils'
import { StatusBadge, getBookingStatusVariant, getBookingStatusLabel } from '@/components/common/StatusBadge'
import { BookingDetailContent } from './booking-detail-content'

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
  const [currentBooking, setCurrentBooking] = useState(booking)

  // Update currentBooking when booking prop changes (from optimistic update or real-time)
  useEffect(() => {
    if (booking) {
      setCurrentBooking(booking)
    }
  }, [booking])

  if (!currentBooking) return null

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
            Booking ID: {formatBookingId(currentBooking.id)}
          </DialogDescription>
        </DialogHeader>

        {/* R8 fix: Use shared BookingDetailContent component */}
        <BookingDetailContent
          booking={currentBooking}
          onClose={onClose}
          onStartProgress={onStartProgress}
          onMarkCompleted={onMarkCompleted}
          onAddNotes={onAddNotes}
          stickyFooter={false}
        />
      </DialogContent>
    </Dialog>
  )
}
