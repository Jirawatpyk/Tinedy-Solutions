/**
 * Booking Status Constants
 *
 * Centralized status colors and dots for consistency across the application
 * Separated into Booking Status (for booking state) and Payment Status (for payment state)
 */

// ============================================================================
// BOOKING STATUS (for booking.status field)
// ============================================================================

// For Badge components (more saturated)
export const BOOKING_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  no_show: 'bg-gray-100 text-gray-800 border-gray-300',
} as const

// For Card backgrounds (lighter/softer)
export const BOOKING_STATUS_CARD_COLORS = {
  pending: 'bg-yellow-50 border-yellow-200',
  confirmed: 'bg-blue-50 border-blue-200',
  in_progress: 'bg-purple-50 border-purple-200',
  completed: 'bg-green-50 border-green-200',
  cancelled: 'bg-red-50 border-red-200',
  no_show: 'bg-gray-50 border-gray-200',
} as const

export const BOOKING_STATUS_DOTS = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  in_progress: 'bg-purple-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
  no_show: 'bg-gray-500',
} as const

export const BOOKING_STATUS_COLORS_TIMELINE = {
  pending: 'bg-yellow-400 hover:bg-yellow-500',
  confirmed: 'bg-tinedy-blue hover:bg-tinedy-blue/90',
  in_progress: 'bg-purple-500 hover:bg-purple-600',
  completed: 'bg-green-500 hover:bg-green-600',
  cancelled: 'bg-red-500 hover:bg-red-600',
  no_show: 'bg-gray-500 hover:bg-gray-600',
} as const

// For Calendar Event Component (solid background with border-left)
export const BOOKING_STATUS_COLORS_CALENDAR = {
  pending: 'bg-yellow-500 border-yellow-600',
  confirmed: 'bg-blue-500 border-blue-600',
  in_progress: 'bg-purple-500 border-purple-600',
  completed: 'bg-green-500 border-green-600',
  cancelled: 'bg-red-500 border-red-600',
  no_show: 'bg-gray-500 border-gray-600',
} as const

export const BOOKING_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
} as const

// ============================================================================
// PAYMENT STATUS (for booking.payment_status field)
// ============================================================================

export const PAYMENT_STATUS_COLORS = {
  unpaid: 'bg-orange-100 text-orange-800 border-orange-300',
  pending_verification: 'bg-amber-100 text-amber-800 border-amber-300',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  refund_pending: 'bg-purple-100 text-purple-800 border-purple-300',
  refunded: 'bg-gray-100 text-gray-800 border-gray-300',
} as const

export const PAYMENT_STATUS_DOTS = {
  unpaid: 'bg-orange-500',
  pending_verification: 'bg-amber-500',
  paid: 'bg-emerald-500',
  refund_pending: 'bg-purple-500',
  refunded: 'bg-gray-500',
} as const

export const PAYMENT_STATUS_LABELS = {
  unpaid: 'Unpaid',
  pending_verification: 'Verifying',
  paid: 'Paid',
  refund_pending: 'Refund Pending',
  refunded: 'Refunded',
} as const

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

// Combined for components that still use old naming
export const STATUS_COLORS = {
  ...BOOKING_STATUS_COLORS,
  ...PAYMENT_STATUS_COLORS,
} as const

export const STATUS_DOTS = {
  ...BOOKING_STATUS_DOTS,
  ...PAYMENT_STATUS_DOTS,
} as const

export const STATUS_COLORS_TIMELINE = {
  ...BOOKING_STATUS_COLORS_TIMELINE,
  unpaid: 'bg-orange-500 hover:bg-orange-600',
  pending_verification: 'bg-amber-500 hover:bg-amber-600',
  paid: 'bg-emerald-500 hover:bg-emerald-600',
  refund_pending: 'bg-purple-500 hover:bg-purple-600',
  refunded: 'bg-gray-500 hover:bg-gray-600',
} as const

export const STATUS_LABELS = {
  ...BOOKING_STATUS_LABELS,
  ...PAYMENT_STATUS_LABELS,
} as const

export type BookingStatus = keyof typeof BOOKING_STATUS_COLORS
export type PaymentStatus = keyof typeof PAYMENT_STATUS_COLORS

// ============================================================================
// FILTER OPTIONS (for calendar filters, dropdowns, etc.)
// ============================================================================

// Text colors for filter options (extracted from badge colors)
const BOOKING_STATUS_TEXT_COLORS: Record<BookingStatus, string> = {
  pending: 'text-yellow-800',
  confirmed: 'text-blue-800',
  in_progress: 'text-purple-800',
  completed: 'text-green-800',
  cancelled: 'text-red-800',
  no_show: 'text-gray-800',
}

const PAYMENT_STATUS_TEXT_COLORS: Record<PaymentStatus, string> = {
  unpaid: 'text-orange-800',
  pending_verification: 'text-amber-800',
  paid: 'text-emerald-800',
  refund_pending: 'text-purple-800',
  refunded: 'text-gray-800',
}

/** Filter options for booking status (used in calendar filters, dropdowns) */
export const BOOKING_STATUS_OPTIONS = (Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map(
  (status) => ({
    value: status,
    label: BOOKING_STATUS_LABELS[status],
    color: BOOKING_STATUS_TEXT_COLORS[status],
  })
)

/** Filter options for payment status (used in calendar filters, dropdowns) */
export const PAYMENT_STATUS_OPTIONS = (Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map(
  (status) => ({
    value: status,
    label: PAYMENT_STATUS_LABELS[status],
    color: PAYMENT_STATUS_TEXT_COLORS[status],
  })
)
