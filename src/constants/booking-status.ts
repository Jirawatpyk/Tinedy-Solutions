/**
 * Booking Status Constants
 *
 * Centralized status colors and dots for consistency across the application
 */

export const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  unpaid: 'bg-orange-100 text-orange-800 border-orange-300',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
} as const

export const STATUS_DOTS = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  in_progress: 'bg-purple-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
  unpaid: 'bg-orange-500',
  paid: 'bg-emerald-500',
} as const

// Timeline bar colors for Weekly Schedule (solid colors with hover effects)
export const STATUS_COLORS_TIMELINE = {
  pending: 'bg-yellow-400 hover:bg-yellow-500',
  confirmed: 'bg-tinedy-blue hover:bg-tinedy-blue/90',
  in_progress: 'bg-purple-500 hover:bg-purple-600',
  completed: 'bg-green-500 hover:bg-green-600',
  cancelled: 'bg-red-500 hover:bg-red-600',
  unpaid: 'bg-orange-500 hover:bg-orange-600',
  paid: 'bg-emerald-500 hover:bg-emerald-600',
} as const

// Human-readable labels for booking statuses
export const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  unpaid: 'Unpaid',
  paid: 'Paid',
} as const

export type BookingStatus = keyof typeof STATUS_COLORS
