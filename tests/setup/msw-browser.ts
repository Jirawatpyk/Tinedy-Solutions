/**
 * MSW Browser Setup for Playwright E2E Tests
 *
 * Story: 3.3 - Setup Playwright for E2E Testing (Re-opened)
 *
 * Configures MSW (Mock Service Worker) to intercept network requests
 * in the browser during E2E tests. This allows tests to run without
 * a real Supabase backend.
 *
 * Architecture:
 * - MSW worker runs in the browser (not Node.js like unit tests)
 * - Intercepts fetch/XHR requests made by React app
 * - Returns mock responses from handlers
 *
 * Usage:
 * This file is loaded via Playwright global setup.
 */

import { setupWorker } from 'msw/browser'
import { http, HttpResponse } from 'msw'
import { mockProfiles } from '../../src/mocks/data/staff'
import { testUsers } from '../fixtures/users'

/**
 * Mock authentication handlers for E2E tests
 *
 * These handlers intercept Supabase Auth API calls and return
 * mock responses to simulate successful authentication.
 */
const authHandlers = [
  /**
   * POST /auth/v1/token (login with password)
   *
   * Validates test user credentials and returns session.
   */
  http.post('*/auth/v1/token', async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string }
    const { email, password } = body

    // Find matching test user
    const user = Object.values(testUsers).find(u => u.email === email)

    if (!user || password !== user.password) {
      return HttpResponse.json(
        { error: 'Invalid credentials', message: 'Invalid login credentials' },
        { status: 400 }
      )
    }

    // Find matching profile
    const profile = mockProfiles.find(p => p.id === user.id)

    if (!profile) {
      return HttpResponse.json(
        { error: 'Profile not found', message: 'User profile not found' },
        { status: 404 }
      )
    }

    // Return successful auth response
    return HttpResponse.json({
      access_token: `mock-access-token-${user.id}`,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Date.now() / 1000 + 3600,
      refresh_token: `mock-refresh-token-${user.id}`,
      user: {
        id: user.id,
        email: user.email,
        role: 'authenticated',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
    })
  }),

  /**
   * GET /auth/v1/user (get current user)
   *
   * Returns the currently authenticated user.
   */
  http.get('*/auth/v1/user', ({ request }) => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return HttpResponse.json(
        { error: 'Unauthorized', message: 'No authorization header' },
        { status: 401 }
      )
    }

    // Extract user ID from mock token
    const userId = authHeader.replace('Bearer mock-access-token-', '')
    const user = Object.values(testUsers).find(u => u.id === userId)

    if (!user) {
      return HttpResponse.json(
        { error: 'User not found', message: 'User not found' },
        { status: 404 }
      )
    }

    const profile = mockProfiles.find(p => p.id === user.id)

    return HttpResponse.json({
      id: user.id,
      email: user.email,
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: profile?.created_at || new Date().toISOString(),
      updated_at: profile?.updated_at || new Date().toISOString(),
    })
  }),

  /**
   * POST /auth/v1/logout (logout)
   *
   * Simulates successful logout.
   */
  http.post('*/auth/v1/logout', () => {
    return HttpResponse.json({}, { status: 204 })
  }),
]

/**
 * Mock profiles/staff handlers for E2E tests
 *
 * These handlers intercept Supabase PostgREST API calls
 * for the profiles table.
 */
const profileHandlers = [
  /**
   * GET /rest/v1/profiles (fetch profiles with filters)
   *
   * Returns mock profile data matching query filters.
   */
  http.get('*/rest/v1/profiles', ({ request }) => {
    const url = new URL(request.url)
    const _select = url.searchParams.get('select') || '*'
    const idFilter = url.searchParams.get('id')

    let profiles = mockProfiles.filter(p => p.deleted_at === null)

    // Filter by ID if provided (eq.xxx format)
    if (idFilter && idFilter.startsWith('eq.')) {
      const targetId = idFilter.replace('eq.', '')
      profiles = profiles.filter(p => p.id === targetId)
    }

    // If single result expected (from id filter), return as single object
    if (idFilter && profiles.length === 1) {
      return HttpResponse.json(profiles[0])
    }

    return HttpResponse.json(profiles)
  }),
]

/**
 * Create MSW browser worker with all handlers
 *
 * This worker intercepts network requests in the browser.
 */
export const worker = setupWorker(...authHandlers, ...profileHandlers)

/**
 * Start MSW worker
 *
 * Call this before running E2E tests to enable request interception.
 *
 * @returns Promise that resolves when worker is ready
 */
export async function startMockServiceWorker() {
  await worker.start({
    onUnhandledRequest: 'bypass', // Allow unhandled requests to pass through
    quiet: false, // Log intercepted requests for debugging
  })
}

/**
 * Stop MSW worker
 *
 * Call this after tests complete to clean up.
 */
export function stopMockServiceWorker() {
  worker.stop()
}

/**
 * Reset MSW handlers
 *
 * Call this between tests to reset handler state.
 */
export function resetMockServiceWorker() {
  worker.resetHandlers()
}
