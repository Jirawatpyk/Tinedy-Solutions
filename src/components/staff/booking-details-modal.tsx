/**
 * BookingDetailsModal Component
 *
 * Dialog variant for booking details on desktop.
 * Uses shared BookingDetailContent with hero layout.
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { type StaffBooking } from '@/lib/queries/staff-bookings-queries'
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
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-hidden p-0 flex flex-col"
        data-testid="booking-details-modal"
      >
        {/* Content with Hero - Hero has time/status, no need for separate header */}
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
