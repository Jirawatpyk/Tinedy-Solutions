/**
 * BookingCreateFlow — Thin wrapper around BookingFormContainer
 *
 * Replaces old BookingCreateModal with new wizard-based BookingFormContainer.
 * All form state, packages, staff, teams fetched internally.
 */

import { memo } from 'react'
import { BookingFormContainer } from '@/components/booking/BookingFormContainer'

interface BookingCreateFlowProps {
  isDialogOpen: boolean
  onCloseDialog: () => void
  onSuccess: () => void
  userId?: string
}

function BookingCreateFlowComponent({
  isDialogOpen,
  onCloseDialog,
  onSuccess,
  userId,
}: BookingCreateFlowProps) {
  return (
    <BookingFormContainer
      open={isDialogOpen}
      onOpenChange={(open) => { if (!open) onCloseDialog() }}
      userId={userId}
      onSuccess={onSuccess}
    />
  )
}

export const BookingCreateFlow = memo(BookingCreateFlowComponent)
BookingCreateFlow.displayName = 'BookingCreateFlow'
