/**
 * BookingCreateFlow — Thin wrapper around BookingFormContainer
 *
 * Replaces old BookingCreateModal with new wizard-based BookingFormContainer.
 * All form state, packages, staff, teams fetched internally.
 */

import { memo } from 'react'
import { BookingFormContainer } from '@/components/booking/BookingFormContainer'
import type { WizardState } from '@/hooks/use-booking-wizard'

interface BookingCreateFlowProps {
  isDialogOpen: boolean
  onCloseDialog: () => void
  onSuccess: () => void
  userId?: string
  /** Pre-seed wizard state (e.g. from AvailabilityCheckSheet after-select) */
  initialState?: Partial<WizardState>
}

function BookingCreateFlowComponent({
  isDialogOpen,
  onCloseDialog,
  onSuccess,
  userId,
  initialState,
}: BookingCreateFlowProps) {
  return (
    <BookingFormContainer
      open={isDialogOpen}
      onOpenChange={(open) => { if (!open) onCloseDialog() }}
      userId={userId}
      onSuccess={onSuccess}
      initialState={initialState}
    />
  )
}

export const BookingCreateFlow = memo(BookingCreateFlowComponent)
BookingCreateFlow.displayName = 'BookingCreateFlow'
