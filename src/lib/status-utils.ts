// StatusBadge variant type
type StatusBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

/**
 * Status Badge Helper Functions
 *
 * These utility functions provide consistent status-to-variant mapping
 * and label formatting for booking and payment statuses throughout the application.
 *
 * Extracted from StatusBadge component to comply with React Fast Refresh rules
 * which prevent exporting non-component functions from component files.
 */

/**
 * Get variant for booking status
 * @param status - Booking status string
 * @returns Appropriate badge variant
 */
export function getBookingStatusVariant(status: string): StatusBadgeVariant {
  const statusMap: Record<string, StatusBadgeVariant> = {
    completed: 'success',
    confirmed: 'info',
    pending: 'warning',
    cancelled: 'danger',
    in_progress: 'purple',
    no_show: 'default',
  }
  return statusMap[status] || 'default'
}

/**
 * Get variant for payment status
 * @param status - Payment status string
 * @returns Appropriate badge variant
 */
export function getPaymentStatusVariant(status: string): StatusBadgeVariant {
  const statusMap: Record<string, StatusBadgeVariant> = {
    paid: 'success',
    unpaid: 'danger',
    pending_verification: 'warning',
    partial: 'warning',
    refund_pending: 'purple',
    refunded: 'purple',
  }
  return statusMap[status] || 'default'
}

/**
 * Format booking status label
 * @param status - Booking status string
 * @returns Human-readable label
 */
export function getBookingStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
  }
  return labelMap[status] || status
}

/**
 * Format payment status label
 * @param status - Payment status string
 * @returns Human-readable label
 */
export function getPaymentStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    paid: 'Paid',
    unpaid: 'Unpaid',
    pending_verification: 'Verifying',
    partial: 'Partial',
    refund_pending: 'Refunding',
    refunded: 'Refunded',
  }
  return labelMap[status] || status
}
