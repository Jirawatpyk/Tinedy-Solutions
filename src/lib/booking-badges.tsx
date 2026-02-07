import { StatusBadge } from '@/components/common/StatusBadge'
import { getBookingStatusVariant, getBookingStatusLabel, getPaymentStatusVariant, getPaymentStatusLabel } from '@/lib/status-utils'
// Re-export from centralized utilities for backwards compatibility
export { getAvailableStatuses, getStatusLabel } from '@/lib/booking-utils'

/**
 * Get Badge component for booking status
 */
export function getStatusBadge(status: string): JSX.Element {
  return (
    <StatusBadge variant={getBookingStatusVariant(status)}>
      {getBookingStatusLabel(status)}
    </StatusBadge>
  )
}

/**
 * Get Badge component for payment status
 */
export function getPaymentStatusBadge(status?: string): JSX.Element {
  const paymentStatus = status || 'unpaid'
  return (
    <StatusBadge variant={getPaymentStatusVariant(paymentStatus)}>
      {getPaymentStatusLabel(paymentStatus)}
    </StatusBadge>
  )
}

// getAvailableStatuses and getStatusLabel are re-exported from @/lib/booking-utils at the top of this file
