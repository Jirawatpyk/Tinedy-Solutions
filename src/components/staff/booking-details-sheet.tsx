/**
 * BookingDetailsSheet Component
 *
 * Bottom sheet variant for booking details on mobile.
 * Uses shared BookingDetailContent with hero layout.
 */

import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'
import { BookingDetailContent } from './booking-detail-content'
import { type StaffBooking } from '@/lib/queries/staff-bookings-queries'

interface BookingDetailsSheetProps {
  booking: StaffBooking | null
  open: boolean
  onClose: () => void
  onStartProgress?: (bookingId: string) => Promise<void>
  onMarkCompleted?: (bookingId: string) => Promise<void>
  onAddNotes?: (bookingId: string, notes: string) => Promise<void>
}

export function BookingDetailsSheet({
  booking,
  open,
  onClose,
  ...actions
}: BookingDetailsSheetProps) {
  if (!booking) return null

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="h-[95vh] flex flex-col rounded-t-xl p-0"
        data-testid="booking-details-sheet"
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-1 flex-shrink-0"
          data-testid="drag-handle"
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {/* Content with Hero - Hero has time/status, no need for separate header */}
        <BookingDetailContent
          booking={booking}
          onClose={onClose}
          stickyFooter={true}
          {...actions}
        />
      </SheetContent>
    </Sheet>
  )
}
