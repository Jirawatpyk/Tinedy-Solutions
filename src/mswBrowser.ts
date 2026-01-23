/**
 * MSW Browser Worker for E2E Tests
 *
 * Story: 3.3 - Setup Playwright for E2E Testing (Re-opened)
 *
 * Initializes MSW in the browser for E2E testing.
 * Only runs when VITE_USE_MSW environment variable is true.
 *
 * This file is imported conditionally in main.tsx when in test mode.
 */

import { setupWorker } from 'msw/browser'
import { http, HttpResponse } from 'msw'

/**
 * Test user credentials (matches tests/fixtures/users.ts)
 */
const testUsers = {
  'admin@tinedy.com': {
    id: 'admin-001',
    email: 'admin@tinedy.com',
    full_name: 'ผู้ดูแลระบบ',
    role: 'admin',
    password: 'TestAdmin123!',
    staff_number: 'ADM0001',
  },
  'manager@tinedy.com': {
    id: 'manager-001',
    email: 'manager@tinedy.com',
    full_name: 'ผู้จัดการประจำ',
    role: 'manager',
    password: 'TestManager123!',
    staff_number: 'MGR0001',
  },
  'staff001@tinedy.com': {
    id: 'staff-001',
    email: 'staff001@tinedy.com',
    full_name: 'สมหญิง ขยัน',
    role: 'staff',
    password: 'TestStaff123!',
    staff_number: 'STF0001',
  },
}

/**
 * Mock Supabase Auth handlers for E2E tests
 */
const authHandlers = [
  /**
   * POST /auth/v1/token - Login with password
   */
  http.post('*/auth/v1/token', async ({ request }) => {
    try {
      const body = (await request.json()) as any
      const { email, password } = body

      console.log('[MSW] Auth request received:', { email, passwordLength: password?.length })

      const user = testUsers[email as keyof typeof testUsers]

      if (!user || password !== user.password) {
        console.log('[MSW] Auth failed: Invalid credentials')
        return HttpResponse.json(
          {
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
          },
          { status: 400 }
        )
      }

      console.log('[MSW] Auth successful for:', user.role)
      // Return successful auth response
      return HttpResponse.json({
        access_token: `mock-access-token-${user.id}`,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: `mock-refresh-token-${user.id}`,
        user: {
          id: user.id,
          aud: 'authenticated',
          role: 'authenticated',
          email: user.email,
          email_confirmed_at: new Date().toISOString(),
          phone: '',
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: {},
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('[MSW] Auth error:', error)
      return HttpResponse.json(
        { error: 'server_error', error_description: 'Internal server error' },
        { status: 500 }
      )
    }
  }),

  /**
   * GET /auth/v1/user - Get current user
   */
  http.get('*/auth/v1/user', ({ request }) => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return HttpResponse.json(
        { error: 'unauthorized', error_description: 'No authorization header' },
        { status: 401 }
      )
    }

    // Extract user ID from mock token
    const userId = authHeader.replace('Bearer mock-access-token-', '')
    const user = Object.values(testUsers).find((u) => u.id === userId)

    if (!user) {
      return HttpResponse.json(
        { error: 'user_not_found', error_description: 'User not found' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }),

  /**
   * POST /auth/v1/logout - Logout
   */
  http.post('*/auth/v1/logout', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

/**
 * Mock Supabase PostgREST handlers for profiles table
 */
const profileHandlers = [
  /**
   * GET /rest/v1/profiles - Fetch profiles
   */
  http.get('*/rest/v1/profiles', ({ request }) => {
    const url = new URL(request.url)
    const idFilter = url.searchParams.get('id')

    const profiles = Object.values(testUsers).map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      phone: null,
      role: u.role,
      staff_number: u.staff_number,
      skills: [],
      rating: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      deleted_by: null,
    }))

    // Filter by ID if provided
    if (idFilter && idFilter.startsWith('eq.')) {
      const targetId = idFilter.replace('eq.', '')
      const profile = profiles.find((p) => p.id === targetId)

      if (!profile) {
        return HttpResponse.json(
          { error: 'not_found', message: 'Profile not found' },
          { status: 404 }
        )
      }

      return HttpResponse.json(profile)
    }

    return HttpResponse.json(profiles)
  }),
]

/**
 * Initialize MSW browser worker
 *
 * Starts the service worker to intercept requests in the browser.
 */
export async function initializeMSW() {
  console.log('[MSW] Initializing MSW browser worker...')

  const worker = setupWorker(...authHandlers, ...profileHandlers)

  await worker.start({
    onUnhandledRequest: 'bypass', // Allow unhandled requests to pass through
    quiet: false, // Log intercepted requests (helpful for debugging)
  })

  console.log('[MSW] ✅ Browser worker started successfully for E2E testing')
  console.log('[MSW] Registered handlers:', authHandlers.length + profileHandlers.length)

  return worker
}
