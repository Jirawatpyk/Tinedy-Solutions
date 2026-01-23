/**
 * MSW Infrastructure Test
 *
 * Story: 3.3 - Setup Playwright for E2E Testing (Re-opened)
 * Task 7: Setup Test Database Infrastructure
 *
 * Verifies MSW (Mock Service Worker) is properly configured
 * and can intercept Supabase API requests.
 */

import { test, expect } from '@playwright/test'
import { testUsers } from '../../fixtures/users'
import { loginAs } from '../../helpers/auth'

test.describe('MSW Infrastructure', () => {
  test('should intercept Supabase auth API calls', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')

    // Fill credentials
    await page.fill('input[name="email"]', testUsers.admin.email)
    await page.fill('input[name="password"]', testUsers.admin.password)

    // Submit login form
    await page.click('button[type="submit"]')

    // Should redirect to admin portal (proves MSW intercepted auth)
    await expect(page).toHaveURL(/\/admin/)

    // Should see user menu (proves successful auth)
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should provide mock user data', async ({ page }) => {
    // Login as admin
    await loginAs(page, testUsers.admin)

    // Navigate to profile page
    await page.goto('/admin/profile')

    // Should see admin user data from mocks
    await expect(page.locator('text=ผู้ดูแลระบบ')).toBeVisible()
  })

  test('should work for different roles', async ({ page }) => {
    // Test manager login
    await loginAs(page, testUsers.manager)
    await expect(page).toHaveURL(/\/admin/)

    // Logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')

    // Test staff login
    await loginAs(page, testUsers.staff1)
    await expect(page).toHaveURL(/\/staff/)
  })

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'WrongPassword')

    // Submit form
    await page.click('button[type="submit"]')

    // Should show error (not redirect)
    await expect(page).toHaveURL(/\/login/)

    // Should see error toast or message
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible({
      timeout: 5000,
    })
  })
})
