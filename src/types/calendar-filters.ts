/**
 * Calendar Filters Types
 *
 * Type definitions for the new calendar filter system
 * Supports multi-select filters, date ranges, search, and presets
 */

import {
  BOOKING_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  type BookingStatus,
  type PaymentStatus,
} from '@/constants/booking-status'

// Re-export filter options from single source of truth
export const BOOKING_STATUSES = BOOKING_STATUS_OPTIONS
export const PAYMENT_STATUSES = PAYMENT_STATUS_OPTIONS

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

  // Show Archived (soft-deleted) bookings
  showArchived: boolean

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
  showArchived: false,
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

  // Archived Filter Actions
  | { type: 'TOGGLE_ARCHIVED' }
  | { type: 'SET_ARCHIVED'; payload: boolean }

  // Preset Actions
  | { type: 'SET_PRESET'; payload: CalendarFilterPreset }

  // Global Actions
  | { type: 'CLEAR_ALL' }
  | { type: 'RESTORE_FILTERS'; payload: CalendarFilters }

// Re-export types from single source of truth
export type BookingStatusValue = BookingStatus
export type PaymentStatusValue = PaymentStatus
