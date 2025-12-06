/**
 * Calendar Filters Types
 *
 * Type definitions for the new calendar filter system
 * Supports multi-select filters, date ranges, search, and presets
 */

// Filter preset types
export type CalendarFilterPreset =
  | 'today'
  | 'week'
  | 'month'
  | 'upcoming'
  | 'pending'
  | 'confirmed'
  | null

// Main calendar filters interface
export interface CalendarFilters {
  // Date Range Filter
  dateRange: {
    start: Date
    end: Date
  } | null

  // Multi-Select Filters (arrays for multiple selection)
  staffIds: string[]        // ['staff-id-1', 'staff-id-2']
  teamIds: string[]         // ['team-id-1', 'team-id-2']
  statuses: string[]        // ['pending', 'confirmed', 'in_progress']
  paymentStatuses: string[] // ['unpaid', 'paid', 'verifying']

  // Search Query
  searchQuery: string       // 'John Doe' or 'Cleaning' or phone number

  // Active Preset (mutually exclusive with manual filters)
  preset: CalendarFilterPreset
}

// Initial/Default filter state
export const INITIAL_CALENDAR_FILTERS: CalendarFilters = {
  dateRange: null,
  staffIds: [],
  teamIds: [],
  statuses: [],
  paymentStatuses: [],
  searchQuery: '',
  preset: null,
}

// Filter action types for reducer
export type CalendarFilterAction =
  // Date Range Actions
  | { type: 'SET_DATE_RANGE'; payload: { start: Date; end: Date } | null }
  | { type: 'CLEAR_DATE_RANGE' }

  // Staff Filter Actions
  | { type: 'TOGGLE_STAFF'; payload: string }
  | { type: 'SET_STAFF'; payload: string[] }
  | { type: 'CLEAR_STAFF' }

  // Team Filter Actions
  | { type: 'TOGGLE_TEAM'; payload: string }
  | { type: 'SET_TEAM'; payload: string[] }
  | { type: 'CLEAR_TEAM' }

  // Status Filter Actions
  | { type: 'TOGGLE_STATUS'; payload: string }
  | { type: 'SET_STATUS'; payload: string[] }
  | { type: 'CLEAR_STATUS' }

  // Payment Status Filter Actions
  | { type: 'TOGGLE_PAYMENT_STATUS'; payload: string }
  | { type: 'SET_PAYMENT_STATUS'; payload: string[] }
  | { type: 'CLEAR_PAYMENT_STATUS' }

  // Search Actions
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'CLEAR_SEARCH' }

  // Preset Actions
  | { type: 'SET_PRESET'; payload: CalendarFilterPreset }

  // Global Actions
  | { type: 'CLEAR_ALL' }
  | { type: 'RESTORE_FILTERS'; payload: CalendarFilters }

// Booking status constants (for status filter options)
export const BOOKING_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'text-blue-800' },
  { value: 'in_progress', label: 'In Progress', color: 'text-purple-800' },
  { value: 'completed', label: 'Completed', color: 'text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-red-800' },
  { value: 'no_show', label: 'No Show', color: 'text-gray-800' },
] as const

// Payment status constants (for payment filter options)
export const PAYMENT_STATUSES = [
  { value: 'unpaid', label: 'Unpaid', color: 'text-orange-800' },
  { value: 'paid', label: 'Paid', color: 'text-emerald-800' },
  { value: 'pending_verification', label: 'Verifying', color: 'text-blue-800' },
] as const

// Helper type for booking status values
export type BookingStatusValue = typeof BOOKING_STATUSES[number]['value']

// Helper type for payment status values
export type PaymentStatusValue = typeof PAYMENT_STATUSES[number]['value']
