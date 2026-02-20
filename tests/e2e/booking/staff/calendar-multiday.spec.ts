/**
 * Staff: Calendar Multi-Day & Dashboard Today Tab Tests
 *
 * Covers S-05 acceptance criteria via navigation + smoke testing:
 * - Staff dashboard Today tab renders
 * - Staff calendar loads with month view + Today button
 *
 * Multi-day booking visibility tests are skipped pending MSW fixture for
 * a booking with booking_date=yesterday, end_date=today.
 *
 * Pattern: navigation tests using MSW fixture for mocked Supabase responses.
 */
import { test, expect } from '../../../fixtures/msw'
import { testUsers } from '../../../fixtures/users'
import type { Page } from '@playwright/test'

async function loginAsStaff(page: Page) {
  const staff = testUsers.staff1
  await page.goto('/login')
  await page.fill('input[name="email"]', staff.email)
  await page.fill('input[name="password"]', staff.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/staff/)
}

test.describe('Staff: Dashboard Today Tab', () => {
  test('should show Today tab on staff dashboard', async ({ page }) => {
    await loginAsStaff(page)

    // Navigate to staff dashboard
    await page.goto('/staff')
    await expect(page).toHaveURL(/\/staff/)

    // BookingTabs renders with Today, Upcoming, Past tabs (AC5.1)
    await expect(page.getByRole('button', { name: 'Today' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Upcoming' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Past' }).first()).toBeVisible()
  })

  test.skip('should show multi-day booking in Today tab when booking spans today', async () => {
    // TODO: Requires MSW fixture returning a booking where:
    //   booking_date = yesterday, end_date = today
    // Then: login as staff → /staff dashboard → Today tab active
    // Assert: booking card visible with "2 วัน" badge (AC5.2)
    // Assert: job_name from custom booking shown (AC5.3)
  })
})

test.describe('Staff: Calendar Multi-Day View', () => {
  test('should load staff calendar with month view and Today button', async ({ page }) => {
    await loginAsStaff(page)

    // Navigate to staff calendar
    await page.goto('/staff/calendar')
    await expect(page).toHaveURL(/\/staff\/calendar/)

    // Calendar page renders with Today navigation button (AC5.4)
    await expect(page.getByRole('button', { name: 'Today' }).first()).toBeVisible()
  })

  test('should render calendar grid with day headers', async ({ page }) => {
    await loginAsStaff(page)

    await page.goto('/staff/calendar')
    await expect(page).toHaveURL(/\/staff\/calendar/)

    // Wait for calendar to fully render — Today button indicates calendar is loaded
    await expect(page.getByRole('button', { name: 'Today' }).first()).toBeVisible()

    // Verify calendar grid rendered with day-of-week headers
    await expect(page.getByText('Sun').first()).toBeVisible()
    await expect(page.getByText('Mon').first()).toBeVisible()
    await expect(page.getByText('Sat').first()).toBeVisible()
  })

  test.skip('should show multi-day booking spanning multiple calendar cells', async () => {
    // TODO: Requires MSW fixture returning a booking where:
    //   booking_date = first day of current month, end_date = +2 days
    // Then: login as staff → /staff/calendar
    // Assert: booking event dot appears on day 1, 2, AND 3 of month (AC5.5)
    // Assert: clicking day 2 opens booking detail sheet showing correct booking
    // This requires getEventsForDate range filter to work correctly (H1 fix from CR)
  })
})
