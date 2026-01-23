/**
 * Booking Handlers Verification Tests
 *
 * Story: 3.2 - Create Mock Handlers for Core Entities
 *
 * This test file verifies that booking handlers correctly mock Supabase API:
 * - GET: Fetch bookings with query parameters (eq, in, is, gte, lte, or)
 * - POST: Create new bookings with validation
 * - PATCH: Update bookings
 * - DELETE: Hard delete bookings
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { server } from '../server'
import { resetBookingsStore } from '../handlers'
import { mockBookings } from '../data/bookings'
import { http, HttpResponse } from 'msw'

// Mock Supabase URL for testing
const MOCK_SUPABASE_URL = 'https://test.supabase.co'

describe('Booking Handlers', () => {
  beforeEach(() => {
    resetBookingsStore()
  })

  afterEach(() => {
    resetBookingsStore()
  })

  describe('GET /rest/v1/bookings', () => {
    it('should fetch all bookings', async () => {
      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/bookings?select=*`)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toBeInstanceOf(Array)
      expect(data.length).toBeGreaterThan(0)
    })

    it('should filter by status (eq operator)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/bookings?status=eq.pending`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((booking: any) => {
        expect(booking.status).toBe('pending')
      })
    })

    it('should filter by multiple statuses (in operator)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/bookings?status=in.(pending,confirmed)`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((booking: any) => {
        expect(['pending', 'confirmed']).toContain(booking.status)
      })
    })

    it('should filter active bookings (deleted_at is null)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/bookings?deleted_at=is.null`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((booking: any) => {
        expect(booking.deleted_at).toBeNull()
      })
    })

    it('should filter by date range (gte and lte)', async () => {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/bookings?booking_date=gte.${today}`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((booking: any) => {
        expect(booking.booking_date >= today).toBe(true)
      })
    })

    it('should filter by staff or team (or operator)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/bookings?or=(staff_id.eq.staff-001,team_id.in.(team-001))`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((booking: any) => {
        const matchesStaff = booking.staff_id === 'staff-001'
        const matchesTeam = booking.team_id === 'team-001'
        expect(matchesStaff || matchesTeam).toBe(true)
      })
    })
  })

  describe('POST /rest/v1/bookings', () => {
    it('should create a new booking', async () => {
      const newBooking = {
        customer_id: 'customer-001',
        service_package_id: 'service-001',
        staff_id: 'staff-001',
        booking_date: '2025-02-01',
        start_time: '10:00:00',
        end_time: '12:00:00',
        status: 'pending',
        address: 'Test Address',
        city: 'Bangkok',
        price: 2000,
      }

      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toBeInstanceOf(Array)
      expect(data[0]).toMatchObject(newBooking)
      expect(data[0].id).toBeDefined()
      expect(data[0].created_at).toBeDefined()
    })

    it('should reject booking without required fields', async () => {
      const invalidBooking = {
        staff_id: 'staff-001',
      }

      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidBooking),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should reject booking with both staff_id and team_id', async () => {
      const invalidBooking = {
        customer_id: 'customer-001',
        service_package_id: 'service-001',
        staff_id: 'staff-001',
        team_id: 'team-001', // Invalid: cannot have both
        booking_date: '2025-02-01',
        start_time: '10:00:00',
        end_time: '12:00:00',
        status: 'pending',
      }

      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidBooking),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('staff_id and team_id')
    })
  })

  describe('PATCH /rest/v1/bookings', () => {
    it('should update booking status', async () => {
      const bookingId = mockBookings[0].id
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'confirmed' }),
        }
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data[0].status).toBe('confirmed')
      expect(data[0].updated_at).toBeDefined()
    })

    it('should return empty array when no bookings match', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/bookings?id=eq.nonexistent-id`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'confirmed' }),
        }
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toEqual([])
    })
  })

  describe('DELETE /rest/v1/bookings', () => {
    it('should hard delete a booking', async () => {
      const bookingId = mockBookings[0].id
      const deleteResponse = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`,
        {
          method: 'DELETE',
        }
      )
      const deletedData = await deleteResponse.json()

      expect(deleteResponse.ok).toBe(true)
      expect(deletedData[0].id).toBe(bookingId)

      // Verify it's deleted
      const getResponse = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`
      )
      const getData = await getResponse.json()
      expect(getData).toEqual([])
    })

    it('should return empty array when no bookings match', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/bookings?id=eq.nonexistent-id`,
        {
          method: 'DELETE',
        }
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toEqual([])
    })
  })

  describe('Advanced Query Features', () => {
    it('should support ORDER BY (sorting)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/bookings?deleted_at=is.null&order=booking_date.desc`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      // Verify descending order
      for (let i = 0; i < data.length - 1; i++) {
        expect(data[i].booking_date >= data[i + 1].booking_date).toBe(true)
      }
    })

    it('should support LIMIT (pagination)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/bookings?deleted_at=is.null&limit=2`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.length).toBeLessThanOrEqual(2)
    })

    it('should support OFFSET with LIMIT', async () => {
      // Get all bookings first
      const allResponse = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/bookings?deleted_at=is.null`
      )
      const allData = await allResponse.json()

      // Get with offset
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/bookings?deleted_at=is.null&limit=1&offset=1`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.length).toBe(1)
      // Second item should match all[1]
      if (allData.length > 1) {
        expect(data[0].id).toBe(allData[1].id)
      }
    })
  })

  describe('Error Scenarios', () => {
    it('should handle 500 server error', async () => {
      // Override handler to return 500
      server.use(
        http.get('*/rest/v1/bookings', () => {
          return HttpResponse.json(
            { error: 'Internal Server Error', code: '500' },
            { status: 500 }
          )
        })
      )

      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/bookings`)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should handle network timeout simulation', async () => {
      // Override handler to simulate timeout
      server.use(
        http.get('*/rest/v1/bookings', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return HttpResponse.json({ error: 'Timeout' }, { status: 504 })
        })
      )

      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/bookings`)

      expect(response.status).toBe(504)
    })
  })
})
