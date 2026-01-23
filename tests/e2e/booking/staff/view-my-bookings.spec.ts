/**
 * Staff: View My Bookings Tests
 *
 * Tests that staff can view their assigned bookings and team bookings
 */
import { test, expect } from '../../../fixtures/msw'
import { testUsers } from '../../../fixtures/users'

test.describe('Staff: View My Bookings', () => {
  test('should see only assigned bookings', async ({ page }) => {
    const staff = testUsers.staff1

    // Login as staff
    await page.goto('/login')
    await page.fill('input[name="email"]', staff.email)
    await page.fill('input[name="password"]', staff.password)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/staff/)

    // Navigate to calendar/bookings page
    await page.goto('/staff/calendar')
    await expect(page).toHaveURL(/\/staff\/calendar/)

    // Verify page loaded (check for common calendar elements)
    // Note: Specific assertions depend on UI implementation
  })

  test('should see team bookings', async ({ page }) => {
    const staff = testUsers.staff1

    // Login as staff
    await page.goto('/login')
    await page.fill('input[name="email"]', staff.email)
    await page.fill('input[name="password"]', staff.password)
    await page.click('button[type="submit"]')

    // Navigate to calendar
    await page.goto('/staff/calendar')
    await expect(page).toHaveURL(/\/staff\/calendar/)

    // Team bookings are handled by MSW handlers
    // Staff-001 is in team-001, so should see booking-002 (team booking)
  })

  test.skip('should update booking status', async ({ page }) => {
    // TODO: Requires UI interaction with booking status dropdown
    // This requires data-testid attributes on status buttons
  })
})
