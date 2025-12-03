/**
 * Booking Status Constants
 *
 * Centralized status colors and dots for consistency across the application
 * Separated into Booking Status (for booking state) and Payment Status (for payment state)
 */

// ============================================================================
// BOOKING STATUS (for booking.status field)
// ============================================================================

export const BOOKING_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  no_show: 'bg-gray-100 text-gray-800 border-gray-300',
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
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  partial: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  refunded: 'bg-gray-100 text-gray-800 border-gray-300',
} as const

export const PAYMENT_STATUS_DOTS = {
  unpaid: 'bg-orange-500',
  paid: 'bg-emerald-500',
  partial: 'bg-yellow-500',
  refunded: 'bg-gray-500',
} as const

export const PAYMENT_STATUS_LABELS = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  partial: 'Partial',
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
  paid: 'bg-emerald-500 hover:bg-emerald-600',
  partial: 'bg-yellow-500 hover:bg-yellow-600',
  refunded: 'bg-gray-500 hover:bg-gray-600',
} as const

export const STATUS_LABELS = {
  ...BOOKING_STATUS_LABELS,
  ...PAYMENT_STATUS_LABELS,
} as const

export type BookingStatus = keyof typeof BOOKING_STATUS_COLORS
export type PaymentStatus = keyof typeof PAYMENT_STATUS_COLORS
