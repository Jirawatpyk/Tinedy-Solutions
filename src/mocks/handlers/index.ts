/**
 * MSW Request Handlers
 *
 * Story: 3.2 - Create Mock Handlers for Core Entities
 *
 * This file exports all mock API handlers for testing.
 * Handlers intercept Supabase API calls during tests.
 *
 * Usage:
 * - Import { handlers } in server.ts
 * - Handlers mock Supabase PostgREST API endpoints
 * - Supports query parameters: eq, in, is, gte, lte, ilike, cs, or
 * - Each entity has GET, POST, PATCH, DELETE handlers
 *
 * Test helpers:
 * - resetBookingsStore() - Reset bookings to initial state
 * - resetCustomersStore() - Reset customers to initial state
 * - resetProfilesStore() - Reset profiles to initial state
 */

import type { RequestHandler } from 'msw'
import { bookingHandlers, resetBookingsStore } from './bookings'
import { customerHandlers, resetCustomersStore } from './customers'
import { staffHandlers, resetProfilesStore } from './staff'

/**
 * Combined handlers for all entities
 *
 * Order matters - more specific patterns should come first
 */
export const handlers: RequestHandler[] = [
  ...bookingHandlers,
  ...customerHandlers,
  ...staffHandlers,
]

/**
 * Test helper: Reset all stores to initial state
 *
 * Usage in tests:
 * ```ts
 * import { resetAllStores } from '@/mocks/handlers'
 *
 * afterEach(() => {
 *   resetAllStores()
 * })
 * ```
 */
export function resetAllStores() {
  resetBookingsStore()
  resetCustomersStore()
  resetProfilesStore()
}

// Re-export individual reset functions for granular control
export { resetBookingsStore, resetCustomersStore, resetProfilesStore }
