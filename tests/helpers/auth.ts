/**
 * E2E Test Authentication Helpers
 *
 * Story: 3.3 - Setup Playwright for E2E Testing (Re-opened)
 *
 * Provides helper functions for authentication in Playwright E2E tests.
 * These helpers work with mocked Supabase auth to simulate login flows.
 *
 * Usage in E2E tests:
 * ```ts
 * import { loginAs } from '@/tests/helpers/auth'
 * import { testUsers } from '@/tests/fixtures/users'
 *
 * await loginAs(page, testUsers.admin)
 * ```
 */

import type { Page } from '@playwright/test'
import type { TestUser } from '../fixtures/users'

/**
 * Login as a specific user
 *
 * Navigates to login page, fills credentials, submits form.
 * Waits for successful redirect to appropriate portal.
 *
 * @param page - Playwright page object
 * @param user - Test user credentials
 * @param options - Login options
 */
export async function loginAs(
  page: Page,
  user: TestUser,
  options: { timeout?: number } = {}
) {
  const { timeout = 30000 } = options

  // Navigate to login page
  await page.goto('/login')

  // Fill login form
  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="password"]', user.password)

  // Submit form
  await page.click('button[type="submit"]')

  // Wait for redirect based on role
  const expectedPath = user.role === 'staff' ? '/staff' : '/admin'
  await page.waitForURL(`**${expectedPath}`, { timeout })
}

/**
 * Login as admin user
 *
 * Convenience function for logging in as admin.
 *
 * @param page - Playwright page object
 */
export async function loginAsAdmin(page: Page) {
  const { testUsers } = await import('../fixtures/users')
  await loginAs(page, testUsers.admin)
}

/**
 * Login as manager user
 *
 * Convenience function for logging in as manager.
 *
 * @param page - Playwright page object
 */
export async function loginAsManager(page: Page) {
  const { testUsers } = await import('../fixtures/users')
  await loginAs(page, testUsers.manager)
}

/**
 * Login as staff user
 *
 * Convenience function for logging in as staff (uses staff1).
 *
 * @param page - Playwright page object
 */
export async function loginAsStaff(page: Page) {
  const { testUsers } = await import('../fixtures/users')
  await loginAs(page, testUsers.staff1)
}

/**
 * Logout current user
 *
 * Clicks user menu and selects logout option.
 *
 * @param page - Playwright page object
 */
export async function logout(page: Page) {
  // Click user menu
  await page.click('[data-testid="user-menu"]')

  // Click logout button
  await page.click('[data-testid="logout-button"]')

  // Wait for redirect to login page
  await page.waitForURL('**/login')
}

/**
 * Check if user is authenticated
 *
 * Verifies user is logged in by checking for user menu.
 *
 * @param page - Playwright page object
 * @returns True if authenticated, false otherwise
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 })
    return true
  } catch {
    return false
  }
}

/**
 * Get current user role from UI
 *
 * Extracts role from user menu or page URL.
 *
 * @param page - Playwright page object
 * @returns User role or null if not authenticated
 */
export async function getCurrentRole(page: Page): Promise<'admin' | 'manager' | 'staff' | null> {
  const url = page.url()

  if (url.includes('/admin')) {
    return 'admin' // Could be admin or manager
  }

  if (url.includes('/staff')) {
    return 'staff'
  }

  return null
}

/**
 * Wait for authentication to complete
 *
 * Waits for user menu to appear (sign of successful auth).
 *
 * @param page - Playwright page object
 * @param timeout - Max wait time in ms
 */
export async function waitForAuth(page: Page, timeout: number = 10000) {
  await page.waitForSelector('[data-testid="user-menu"]', { timeout })
}
