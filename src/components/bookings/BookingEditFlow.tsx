/**
 * BookingEditFlow — Thin wrapper around new BookingEditModal
 *
 * Replaces old BookingEditModal (50+ props) with new simplified version.
 * Staff/Teams/Packages fetched internally by BookingEditModal.
 */

import { memo } from 'react'
import { BookingEditModal } from '@/components/booking/BookingEditModal'
import type { Booking } from '@/types/booking'

interface BookingEditFlowProps {
  isEditOpen: boolean
  onCloseEdit: () => void
  onSuccess: () => void
  selectedBooking: Booking | null
}

function BookingEditFlowComponent({
  isEditOpen,
  onCloseEdit,
  onSuccess,
  selectedBooking,
}: BookingEditFlowProps) {
  return (
    <BookingEditModal
      open={isEditOpen}
      onOpenChange={(open) => { if (!open) onCloseEdit() }}
      booking={selectedBooking}
      onSuccess={onSuccess}
    />
  )
}

export const BookingEditFlow = memo(BookingEditFlowComponent)
BookingEditFlow.displayName = 'BookingEditFlow'
export default BookingEditFlow
