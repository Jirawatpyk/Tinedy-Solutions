/**
 * Shared test fixtures for Staff components
 */

import type { StaffBooking } from '@/lib/queries/staff-bookings-queries'

export const createMockBooking = (
  overrides: Partial<StaffBooking> = {}
): StaffBooking => ({
  id: 'test-booking-123',
  booking_date: '2026-01-30',
  start_time: '09:00:00',
  end_time: '11:00:00',
  status: 'confirmed',
  payment_status: 'pending',
  total_price: 1500,
  notes: null,
  address: '123 Test St',
  city: 'Bangkok',
  state: 'BKK',
  zip_code: '10110',
  customer_id: 'customer-123',
  staff_id: 'staff-123',
  team_id: null,
  package_v2_id: null,
  created_at: '2026-01-29T10:00:00Z',
  area_sqm: null,
  frequency: null,
  recurring_sequence: null,
  recurring_total: null,
  customers: {
    id: 'customer-123',
    full_name: 'Test Customer',
    phone: '0812345678',
    avatar_url: null,
  },
  service_packages: {
    id: 'package-123',
    name: 'Deep Cleaning',
    service_type: 'cleaning',
    duration_minutes: 120,
    price: 1500,
  },
  service_packages_v2: null,
  teams: null,
  ...overrides,
})

export const createMockTeamBooking = (
  overrides: Partial<StaffBooking> = {}
): StaffBooking =>
  createMockBooking({
    team_id: 'team-123',
    staff_id: null,
    teams: {
      id: 'team-123',
      name: 'Cleaning Team A',
      team_lead_id: 'lead-123',
      team_lead: {
        id: 'lead-123',
        full_name: 'Team Lead Name',
      },
      team_members: [],
    },
    ...overrides,
  })
