/**
 * Customer Handlers Verification Tests
 *
 * Story: 3.2 - Create Mock Handlers for Core Entities
 *
 * This test file verifies that customer handlers correctly mock Supabase API:
 * - GET: Fetch customers with query parameters
 * - POST: Create new customers with validation
 * - PATCH: Update customers
 * - DELETE: Hard delete customers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resetCustomersStore } from '../handlers'
import { mockCustomers } from '../data/customers'

// Mock Supabase URL for testing
const MOCK_SUPABASE_URL = 'https://test.supabase.co'

describe('Customer Handlers', () => {
  beforeEach(() => {
    resetCustomersStore()
  })

  afterEach(() => {
    resetCustomersStore()
  })

  describe('GET /rest/v1/customers', () => {
    it('should fetch all customers', async () => {
      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/customers?select=*`)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toBeInstanceOf(Array)
      expect(data.length).toBeGreaterThan(0)
    })

    it('should filter active customers (deleted_at is null)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/customers?deleted_at=is.null`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((customer: any) => {
        expect(customer.deleted_at).toBeNull()
      })
    })

    it('should filter by city', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/customers?city=eq.กรุงเทพมหานคร`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((customer: any) => {
        expect(customer.city).toBe('กรุงเทพมหานคร')
      })
    })

    it('should search by name (ilike operator)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/customers?name=ilike.%สมชาย%`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((customer: any) => {
        expect(customer.name.toLowerCase()).toContain('สมชาย'.toLowerCase())
      })
    })

    it('should filter by tag (cs operator)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/customers?tags=cs.{"VIP"}`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((customer: any) => {
        expect(customer.tags).toContain('VIP')
      })
    })

    it('should filter by total_spent (gte operator)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/customers?total_spent=gte.5000`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((customer: any) => {
        expect(customer.total_spent).toBeGreaterThanOrEqual(5000)
      })
    })
  })

  describe('POST /rest/v1/customers', () => {
    it('should create a new customer', async () => {
      const newCustomer = {
        name: 'ลูกค้าทดสอบ',
        phone: '080-000-0000',
        email: 'test@example.com',
        address: '123 ถนนทดสอบ',
        city: 'กรุงเทพมหานคร',
        state: 'กรุงเทพมหานคร',
        zip_code: '10000',
        tags: ['ลูกค้าใหม่'],
      }

      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toBeInstanceOf(Array)
      expect(data[0]).toMatchObject(newCustomer)
      expect(data[0].id).toBeDefined()
      expect(data[0].created_at).toBeDefined()
    })

    it('should reject customer without required fields', async () => {
      const invalidCustomer = {
        email: 'test@example.com',
      }

      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidCustomer),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should reject duplicate phone number', async () => {
      const existingPhone = mockCustomers[0].phone
      const duplicateCustomer = {
        name: 'ลูกค้าซ้ำ',
        phone: existingPhone,
      }

      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateCustomer),
      })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error).toContain('already exists')
    })
  })

  describe('PATCH /rest/v1/customers', () => {
    it('should update customer information', async () => {
      const customerId = mockCustomers[0].id
      const updates = {
        tags: ['VIP', 'ลูกค้าประจำ', 'Updated'],
        notes: 'Updated notes',
      }

      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data[0].tags).toEqual(updates.tags)
      expect(data[0].notes).toBe(updates.notes)
      expect(data[0].updated_at).toBeDefined()
    })

    it('should return empty array when no customers match', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/customers?id=eq.nonexistent-id`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: 'test' }),
        }
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toEqual([])
    })
  })

  describe('DELETE /rest/v1/customers', () => {
    it('should hard delete a customer', async () => {
      const customerId = mockCustomers[0].id
      const deleteResponse = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}`,
        {
          method: 'DELETE',
        }
      )
      const deletedData = await deleteResponse.json()

      expect(deleteResponse.ok).toBe(true)
      expect(deletedData[0].id).toBe(customerId)

      // Verify it's deleted
      const getResponse = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}`
      )
      const getData = await getResponse.json()
      expect(getData).toEqual([])
    })

    it('should return empty array when no customers match', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/customers?id=eq.nonexistent-id`,
        {
          method: 'DELETE',
        }
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toEqual([])
    })
  })
})
