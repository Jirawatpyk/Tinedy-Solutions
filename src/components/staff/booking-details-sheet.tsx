/**
 * BookingDetailsSheet Component
 *
 * Bottom sheet variant for booking details on mobile.
 * Uses shared BookingDetailContent for consistent UI.
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { BookingDetailContent } from './booking-detail-content'
import { type StaffBooking } from '@/lib/queries/staff-bookings-queries'
import { formatBookingId } from '@/lib/utils'
import {
  StatusBadge,
  getBookingStatusVariant,
  getBookingStatusLabel,
} from '@/components/common/StatusBadge'

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
        className="h-[90vh] flex flex-col rounded-t-xl p-0"
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-2 pb-1"
          data-testid="drag-handle"
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        <SheetHeader className="px-4 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle>Booking Details</SheetTitle>
            <StatusBadge variant={getBookingStatusVariant(booking.status)}>
              {getBookingStatusLabel(booking.status)}
            </StatusBadge>
          </div>
          <SheetDescription>
            ID: {formatBookingId(booking.id)}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable content - R2 fix: pass onClose explicitly */}
        {/* R3 fix: stickyFooter=true so actions render inside content, not duplicated */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <BookingDetailContent
            booking={booking}
            onClose={onClose}
            stickyFooter={true}
            {...actions}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
