/**
 * MSW Handlers for Staff (Profiles) API
 *
 * Story: 3.2 - Create Mock Handlers for Core Entities
 *
 * This file provides MSW request handlers for mocking Supabase profiles API.
 * Supports Supabase PostgREST query parameters and operations.
 */

import { http, HttpResponse } from 'msw'
import {
  mockProfiles,
  createMockProfile,
} from '../data/staff'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Profile = any

// In-memory storage for test mutations
let profilesStore = [...mockProfiles]

/**
 * Reset profiles store to initial state (for tests)
 */
export function resetProfilesStore() {
  profilesStore = [...mockProfiles]
}

/**
 * Parse Supabase query parameters from URL
 */
function parseSupabaseQuery(url: URL) {
  const filters: Record<string, string> = {}

  // Note: 'select' parameter ignored - mock handlers return full objects
  url.searchParams.forEach((value, key) => {
    if (key !== 'select') {
      filters[key] = value
    }
  })

  return { filters }
}

/**
 * Apply Supabase filters to profiles array
 */
function applyFilters(profiles: Profile[], filters: Record<string, string>): Profile[] {
  let result = [...profiles]

  Object.entries(filters).forEach(([key, value]) => {
    // Handle eq. operator
    if (value.startsWith('eq.')) {
      const filterValue = value.substring(3)
      result = result.filter((p) => String(p[key as keyof Profile]) === filterValue)
    }
    // Handle in. operator
    else if (value.startsWith('in.(') && value.endsWith(')')) {
      const values = value.substring(4, value.length - 1).split(',')
      result = result.filter((p) => values.includes(String(p[key as keyof Profile])))
    }
    // Handle is. operator
    else if (value.startsWith('is.')) {
      const isNull = value === 'is.null'
      result = result.filter((p) =>
        isNull ? p[key as keyof Profile] === null : p[key as keyof Profile] !== null
      )
    }
    // Handle gte. operator (for rating >= threshold)
    else if (value.startsWith('gte.')) {
      const filterValue = parseFloat(value.substring(4))
      result = result.filter((p) => {
        const fieldValue = p[key as keyof Profile]
        return fieldValue !== null && Number(fieldValue) >= filterValue
      })
    }
    // Handle lte. operator
    else if (value.startsWith('lte.')) {
      const filterValue = parseFloat(value.substring(4))
      result = result.filter((p) => {
        const fieldValue = p[key as keyof Profile]
        return fieldValue !== null && Number(fieldValue) <= filterValue
      })
    }
    // Handle ilike. operator (case-insensitive search)
    else if (value.startsWith('ilike.')) {
      const searchValue = value.substring(6).replace(/%/g, '').toLowerCase()
      result = result.filter((p) => {
        const fieldValue = String(p[key as keyof Profile] || '').toLowerCase()
        return fieldValue.includes(searchValue)
      })
    }
    // Handle cs. operator (contains - for array fields like skills)
    else if (value.startsWith('cs.')) {
      const arrayValue = value.substring(3)
      // Handle JSON array syntax: cs.{"skill1","skill2"}
      const skills = arrayValue.replace(/[{}"]/g, '').split(',')
      result = result.filter((p) => {
        const profileSkills = p.skills || []
        return skills.some((skill) => profileSkills.includes(skill))
      })
    }
  })

  return result
}

/**
 * GET /rest/v1/profiles
 * Fetch profiles with Supabase query parameters
 * Supports: filters, order, limit, offset, team_members relationships
 */
export const getProfilesHandler = http.get('*/rest/v1/profiles', ({ request }) => {
  const url = new URL(request.url)
  const { filters } = parseSupabaseQuery(url)
  const order = url.searchParams.get('order')
  const limit = url.searchParams.get('limit')
  const offset = url.searchParams.get('offset')

  // Apply filters
  let results = applyFilters(profilesStore, filters)

  // Apply sorting if specified
  if (order) {
    const [field, direction] = order.split('.')
    const sortDirection = direction === 'desc' ? -1 : 1
    results = [...results].sort((a, b) => {
      const aVal = a[field as keyof Profile]
      const bVal = b[field as keyof Profile]
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1
      if (aVal < bVal) return -1 * sortDirection
      if (aVal > bVal) return 1 * sortDirection
      return 0
    })
  }

  // Apply pagination
  const offsetNum = offset ? parseInt(offset) : 0
  const limitNum = limit ? parseInt(limit) : undefined
  const totalCount = results.length
  const paginatedResults = limitNum ? results.slice(offsetNum, offsetNum + limitNum) : results.slice(offsetNum)

  // Return with Supabase headers
  return HttpResponse.json(paginatedResults, {
    headers: {
      'Content-Range': `0-${paginatedResults.length - 1}/${totalCount}`,
    },
  })
})

/**
 * POST /rest/v1/profiles
 * Create a new profile
 */
export const createProfileHandler = http.post('*/rest/v1/profiles', async ({ request }) => {
  const body = (await request.json()) as Partial<Profile>

  // Validate required fields
  if (!body.email || !body.full_name) {
    return HttpResponse.json(
      { error: 'Missing required fields (email, full_name)', code: 'PGRST301' },
      { status: 400 }
    )
  }

  // Check for duplicate email (business rule)
  const existingProfile = profilesStore.find(
    (p) => p.email === body.email && p.deleted_at === null
  )
  if (existingProfile) {
    return HttpResponse.json(
      { error: 'Profile with this email already exists', code: 'PGRST409' },
      { status: 409 }
    )
  }

  // Auto-generate staff_number if not provided
  let staffNumber = body.staff_number
  if (!staffNumber) {
    const rolePrefix = body.role === 'admin' ? 'ADM' : body.role === 'manager' ? 'MGR' : 'STF'
    const maxNumber = profilesStore
      .filter((p) => p.staff_number?.startsWith(rolePrefix))
      .map((p) => parseInt(p.staff_number?.substring(3) || '0'))
      .reduce((max, num) => Math.max(max, num), 0)
    staffNumber = `${rolePrefix}${String(maxNumber + 1).padStart(4, '0')}`
  }

  // Create new profile
  const newProfile = createMockProfile({
    ...body,
    id: `profile-${Date.now()}`,
    staff_number: staffNumber,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  profilesStore.push(newProfile)

  return HttpResponse.json([newProfile], { status: 201 })
})

/**
 * PATCH /rest/v1/profiles
 * Update profile(s) with query parameters
 */
export const updateProfileHandler = http.patch('*/rest/v1/profiles', async ({ request }) => {
  const url = new URL(request.url)
  const { filters } = parseSupabaseQuery(url)
  const updates = (await request.json()) as Partial<Profile>

  // Find profiles to update
  const toUpdate = applyFilters(profilesStore, filters)

  if (toUpdate.length === 0) {
    return HttpResponse.json([], { status: 200 })
  }

  // Apply updates
  const updatedProfiles = toUpdate.map((profile) => {
    const updated = {
      ...profile,
      ...updates,
      updated_at: new Date().toISOString(),
    }
    // Replace in store
    const index = profilesStore.findIndex((p) => p.id === profile.id)
    if (index !== -1) {
      profilesStore[index] = updated
    }
    return updated
  })

  return HttpResponse.json(updatedProfiles, { status: 200 })
})

/**
 * DELETE /rest/v1/profiles
 * Delete (hard delete) profile(s) with query parameters
 */
export const deleteProfileHandler = http.delete('*/rest/v1/profiles', ({ request }) => {
  const url = new URL(request.url)
  const { filters } = parseSupabaseQuery(url)

  // Find profiles to delete
  const toDelete = applyFilters(profilesStore, filters)

  if (toDelete.length === 0) {
    return HttpResponse.json([], { status: 200 })
  }

  // Remove from store
  profilesStore = profilesStore.filter(
    (p) => !toDelete.some((d) => d.id === p.id)
  )

  return HttpResponse.json(toDelete, { status: 200 })
})

/**
 * All staff/profile handlers
 */
export const staffHandlers = [
  getProfilesHandler,
  createProfileHandler,
  updateProfileHandler,
  deleteProfileHandler,
]
