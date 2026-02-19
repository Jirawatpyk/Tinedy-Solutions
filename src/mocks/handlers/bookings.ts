/**
 * MSW Handlers for Bookings API
 *
 * Story: 3.2 - Create Mock Handlers for Core Entities
 *
 * This file provides MSW request handlers for mocking Supabase bookings API.
 * Supports Supabase PostgREST query parameters and operations.
 */

import { http, HttpResponse } from 'msw'
import {
  mockBookings,
  createMockBooking,
  type MockBooking,
} from '../data/bookings'

// In-memory storage for test mutations
let bookingsStore = [...mockBookings]

/**
 * Reset bookings store to initial state (for tests)
 */
export function resetBookingsStore() {
  bookingsStore = [...mockBookings]
}

/**
 * Parse Supabase query parameters from URL
 */
function parseSupabaseQuery(url: URL) {
  const filters: Record<string, string> = {}

  // Parse filter operators: eq, in, is, gte, lte, or
  // Note: 'select' parameter ignored - mock handlers return full objects
  url.searchParams.forEach((value, key) => {
    if (key !== 'select') {
      filters[key] = value
    }
  })

  return { filters }
}

/**
 * Apply Supabase filters to bookings array
 */
function applyFilters(bookings: MockBooking[], filters: Record<string, string>): MockBooking[] {
  let result = [...bookings]

  Object.entries(filters).forEach(([key, value]) => {
    // Handle eq. operator (e.g., status=eq.pending)
    if (value.startsWith('eq.')) {
      const filterValue = value.substring(3)
      result = result.filter((b) => String(b[key as keyof MockBooking]) === filterValue)
    }
    // Handle in. operator (e.g., status=in.(pending,confirmed))
    else if (value.startsWith('in.(') && value.endsWith(')')) {
      const values = value.substring(4, value.length - 1).split(',')
      result = result.filter((b) => values.includes(String(b[key as keyof MockBooking])))
    }
    // Handle is. operator (e.g., deleted_at=is.null)
    else if (value.startsWith('is.')) {
      const isNull = value === 'is.null'
      result = result.filter((b) =>
        isNull ? b[key as keyof MockBooking] === null : b[key as keyof MockBooking] !== null
      )
    }
    // Handle gte. operator (e.g., booking_date=gte.2025-01-01)
    else if (value.startsWith('gte.')) {
      const filterValue = value.substring(4)
      result = result.filter((b) => String(b[key as keyof MockBooking]) >= filterValue)
    }
    // Handle lte. operator (e.g., booking_date=lte.2025-12-31)
    else if (value.startsWith('lte.')) {
      const filterValue = value.substring(4)
      result = result.filter((b) => String(b[key as keyof MockBooking]) <= filterValue)
    }
    // Handle or operator (e.g., or=(staff_id.eq.123,team_id.in.(456,789)))
    else if (key === 'or') {
      // Parse OR conditions
      const orConditions = value.match(/\(([^)]+)\)/g) || []
      result = result.filter((b) => {
        return orConditions.some((condition) => {
          const match = condition.match(/(\w+)\.(eq|in)\.([\w,()-]+)/)
          if (!match) return false
          const [, field, operator, val] = match
          if (operator === 'eq') {
            return String(b[field as keyof MockBooking]) === val
          } else if (operator === 'in') {
            const values = val.replace(/[()]/g, '').split(',')
            return values.includes(String(b[field as keyof MockBooking]))
          }
          return false
        })
      })
    }
  })

  return result
}

/**
 * Apply sorting to bookings array
 */
function applySorting(bookings: MockBooking[], order: string | null): MockBooking[] {
  if (!order) return bookings

  const [field, direction] = order.split('.')
  const sortDirection = direction === 'desc' ? -1 : 1

  return [...bookings].sort((a, b) => {
    const aVal = a[field] as string | number | null
    const bVal = b[field] as string | number | null

    if (aVal === null && bVal === null) return 0
    if (aVal === null) return 1
    if (bVal === null) return -1

    if (aVal < bVal) return -1 * sortDirection
    if (aVal > bVal) return 1 * sortDirection
    return 0
  })
}

/**
 * Apply pagination to bookings array
 */
function applyPagination(bookings: MockBooking[], limit: string | null, offset: string | null): MockBooking[] {
  const limitNum = limit ? parseInt(limit) : undefined
  const offsetNum = offset ? parseInt(offset) : 0

  if (!limitNum) return bookings.slice(offsetNum)
  return bookings.slice(offsetNum, offsetNum + limitNum)
}

/**
 * GET /rest/v1/bookings
 * Fetch bookings with Supabase query parameters
 * Supports: filters, order, limit, offset, relationships via select
 */
export const getBookingsHandler = http.get('*/rest/v1/bookings', ({ request }) => {
  const url = new URL(request.url)
  const { filters } = parseSupabaseQuery(url)
  const order = url.searchParams.get('order')
  const limit = url.searchParams.get('limit')
  const offset = url.searchParams.get('offset')

  // Apply filters
  let results = applyFilters(bookingsStore, filters)

  // Apply sorting
  results = applySorting(results, order)

  // Apply pagination
  const paginatedResults = applyPagination(results, limit, offset)
  const totalCount = results.length

  // Handle relationship queries (simplified - returns placeholder for relationships)
  // Full implementation would load from mockCustomers, mockProfiles etc.
  // For Story 3.2, we support the syntax but return basic structure
  // const _hasRelationships = select && select.includes(':')

  // Return with Supabase headers
  return HttpResponse.json(paginatedResults, {
    headers: {
      'Content-Range': `0-${paginatedResults.length - 1}/${totalCount}`,
    },
  })
})

/**
 * POST /rest/v1/bookings
 * Create a new booking
 */
export const createBookingHandler = http.post('*/rest/v1/bookings', async ({ request }) => {
  const body = (await request.json()) as Partial<MockBooking>

  // Validate required fields
  if (!body.customer_id || !body.booking_date) {
    return HttpResponse.json(
      { error: 'Missing required fields', code: 'PGRST301' },
      { status: 400 }
    )
  }

  // Validate assignment constraint: staff_id XOR team_id
  if (body.staff_id && body.team_id) {
    return HttpResponse.json(
      { error: 'Cannot assign both staff_id and team_id', code: 'PGRST301' },
      { status: 400 }
    )
  }

  // Create new booking
  const newBooking = createMockBooking({
    ...body,
    id: `booking-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  bookingsStore.push(newBooking)

  return HttpResponse.json([newBooking], { status: 201 })
})

/**
 * PATCH /rest/v1/bookings
 * Update booking(s) with query parameters
 */
export const updateBookingHandler = http.patch('*/rest/v1/bookings', async ({ request }) => {
  const url = new URL(request.url)
  const { filters } = parseSupabaseQuery(url)
  const updates = (await request.json()) as Partial<MockBooking>

  // Find bookings to update
  const toUpdate = applyFilters(bookingsStore, filters)

  if (toUpdate.length === 0) {
    return HttpResponse.json([], { status: 200 })
  }

  // Apply updates
  const updatedBookings = toUpdate.map((booking) => {
    const updated = {
      ...booking,
      ...updates,
      updated_at: new Date().toISOString(),
    }
    // Replace in store
    const index = bookingsStore.findIndex((b) => b.id === booking.id)
    if (index !== -1) {
      bookingsStore[index] = updated
    }
    return updated
  })

  return HttpResponse.json(updatedBookings, { status: 200 })
})

/**
 * DELETE /rest/v1/bookings
 * Hard delete booking(s) with query parameters
 * Note: In production, soft delete (PATCH with deleted_at) is preferred
 * This handler supports both patterns for testing flexibility
 */
export const deleteBookingHandler = http.delete('*/rest/v1/bookings', ({ request }) => {
  const url = new URL(request.url)
  const { filters } = parseSupabaseQuery(url)

  // Find bookings to delete
  const toDelete = applyFilters(bookingsStore, filters)

  if (toDelete.length === 0) {
    return HttpResponse.json([], { status: 200 })
  }

  // Hard delete - remove from store
  bookingsStore = bookingsStore.filter(
    (b) => !toDelete.some((d) => d.id === b.id)
  )

  return HttpResponse.json(toDelete, { status: 200 })
})

/**
 * All booking handlers
 */
export const bookingHandlers = [
  getBookingsHandler,
  createBookingHandler,
  updateBookingHandler,
  deleteBookingHandler,
]
