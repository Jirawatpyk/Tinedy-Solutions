/**
 * Bookings Components
 *
 * Centralized exports for booking-related components extracted from
 * src/pages/admin/bookings.tsx to reduce god component complexity.
 *
 * @module components/bookings
 */

// Create/Edit/Detail flow components
export { BookingCreateFlow } from './BookingCreateFlow'
export { BookingEditFlow } from './BookingEditFlow'
export { BookingDetailFlow } from './BookingDetailFlow'
export type { BookingDetailFlowProps } from './BookingDetailFlow'

// List and container components
export { BookingListContainer } from './BookingListContainer'

// Recurring booking management
export { RecurringBookingManager } from './RecurringBookingManager'
