/**
 * Staff (Profiles) Handlers Verification Tests
 *
 * Story: 3.2 - Create Mock Handlers for Core Entities
 *
 * This test file verifies that staff/profile handlers correctly mock Supabase API:
 * - GET: Fetch profiles with query parameters
 * - POST: Create new profiles with validation and auto-generated staff_number
 * - PATCH: Update profiles
 * - DELETE: Hard delete profiles
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resetProfilesStore } from '../handlers'
import { mockProfiles } from '../data/staff'

// Mock Supabase URL for testing
const MOCK_SUPABASE_URL = 'https://test.supabase.co'

describe('Staff (Profiles) Handlers', () => {
  beforeEach(() => {
    resetProfilesStore()
  })

  afterEach(() => {
    resetProfilesStore()
  })

  describe('GET /rest/v1/profiles', () => {
    it('should fetch all profiles', async () => {
      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/profiles?select=*`)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toBeInstanceOf(Array)
      expect(data.length).toBeGreaterThan(0)
    })

    it('should filter active profiles (deleted_at is null)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/profiles?deleted_at=is.null`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((profile: any) => {
        expect(profile.deleted_at).toBeNull()
      })
    })

    it('should filter by role', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/profiles?role=eq.staff`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((profile: any) => {
        expect(profile.role).toBe('staff')
      })
    })

    it('should filter by multiple roles (in operator)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/profiles?role=in.(admin,manager)`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((profile: any) => {
        expect(['admin', 'manager']).toContain(profile.role)
      })
    })

    it('should search by name (ilike operator)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/profiles?full_name=ilike.%สม%`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((profile: any) => {
        expect(profile.full_name?.toLowerCase()).toContain('สม'.toLowerCase())
      })
    })

    it('should filter by rating (gte operator)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/profiles?rating=gte.4.5`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((profile: any) => {
        expect(profile.rating).toBeGreaterThanOrEqual(4.5)
      })
    })

    it('should filter by skill (cs operator)', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/profiles?skills=cs.{"ทำความสะอาดบ้าน"}`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      data.forEach((profile: any) => {
        expect(profile.skills).toContain('ทำความสะอาดบ้าน')
      })
    })
  })

  describe('POST /rest/v1/profiles', () => {
    it('should create a new profile with auto-generated staff_number', async () => {
      const newProfile = {
        email: 'newstaff@tinedy.com',
        full_name: 'พนักงานใหม่',
        phone: '095-555-5555',
        role: 'staff',
        skills: ['ทำความสะอาด'],
      }

      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toBeInstanceOf(Array)
      expect(data[0]).toMatchObject(newProfile)
      expect(data[0].id).toBeDefined()
      expect(data[0].staff_number).toBeDefined()
      expect(data[0].staff_number).toMatch(/^STF\d{4}$/)
      expect(data[0].created_at).toBeDefined()
    })

    it('should create admin profile with ADM prefix', async () => {
      const newAdmin = {
        email: 'newadmin@tinedy.com',
        full_name: 'Admin ใหม่',
        phone: '096-666-6666',
        role: 'admin',
      }

      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data[0].staff_number).toMatch(/^ADM\d{4}$/)
    })

    it('should create manager profile with MGR prefix', async () => {
      const newManager = {
        email: 'newmanager@tinedy.com',
        full_name: 'Manager ใหม่',
        phone: '097-777-7777',
        role: 'manager',
      }

      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newManager),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data[0].staff_number).toMatch(/^MGR\d{4}$/)
    })

    it('should reject profile without required fields', async () => {
      const invalidProfile = {
        phone: '098-888-8888',
      }

      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProfile),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should reject duplicate email', async () => {
      const existingEmail = mockProfiles[0].email
      const duplicateProfile = {
        email: existingEmail,
        full_name: 'ซ้ำ',
      }

      const response = await fetch(`${MOCK_SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateProfile),
      })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error).toContain('already exists')
    })
  })

  describe('PATCH /rest/v1/profiles', () => {
    it('should update profile information', async () => {
      const profileId = mockProfiles.find((p) => p.role === 'staff')?.id
      const updates = {
        skills: ['ทำความสะอาด', 'ซักรีด', 'Updated'],
        rating: 4.9,
      }

      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data[0].skills).toEqual(updates.skills)
      expect(data[0].rating).toBe(updates.rating)
      expect(data[0].updated_at).toBeDefined()
    })

    it('should return empty array when no profiles match', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/profiles?id=eq.nonexistent-id`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: 5.0 }),
        }
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toEqual([])
    })
  })

  describe('DELETE /rest/v1/profiles', () => {
    it('should hard delete a profile', async () => {
      const profileId = mockProfiles[mockProfiles.length - 1].id
      const deleteResponse = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
        {
          method: 'DELETE',
        }
      )
      const deletedData = await deleteResponse.json()

      expect(deleteResponse.ok).toBe(true)
      expect(deletedData[0].id).toBe(profileId)

      // Verify it's deleted
      const getResponse = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`
      )
      const getData = await getResponse.json()
      expect(getData).toEqual([])
    })

    it('should return empty array when no profiles match', async () => {
      const response = await fetch(
        `${MOCK_SUPABASE_URL}/rest/v1/profiles?id=eq.nonexistent-id`,
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
