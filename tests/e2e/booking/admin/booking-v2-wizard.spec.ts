/**
 * Admin: Booking V2 Wizard & Quick Mode Tests
 *
 * Covers S-03/S-05 acceptance criteria via navigation + smoke testing:
 * - Open Wizard → verify Step 1 loads
 * - Switch Wizard ↔ Quick Mode
 * - Multi-day UI elements visible in Quick Mode
 *
 * Pattern: navigation tests (no data-testid in Wizard components).
 * Complex form submission skipped — requires MSW customer/package mocks.
 */
import { test, expect, type Page } from '@playwright/test'
import { testUsers } from '../../../fixtures/users'

async function loginAsAdmin(page: Page) {
  const admin = testUsers.admin
  await page.goto('/login')
  await page.fill('input[name="email"]', admin.email)
  await page.fill('input[name="password"]', admin.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/admin/)
}

test.describe('Admin: Booking V2 Wizard', () => {
  test('should open booking sheet and show wizard Step 1', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to bookings page
    await page.goto('/admin/bookings')
    await expect(page).toHaveURL(/\/admin\/bookings/)
    await expect(page.getByText(/New Booking/i).first()).toBeVisible()

    // Open new booking form
    await page.getByRole('button', { name: /New Booking/i }).click()

    // AppSheet title
    await expect(page.getByText('สร้างการจอง').first()).toBeVisible()

    // Wizard Step 1 heading (AC3.1: wizard UI)
    await expect(page.getByText('ขั้นตอนที่ 1: เลือกลูกค้า').first()).toBeVisible()
  })

  test('should switch from Wizard to Quick Mode', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto('/admin/bookings')
    await page.getByRole('button', { name: /New Booking/i }).click()
    await expect(page.getByText('ขั้นตอนที่ 1: เลือกลูกค้า').first()).toBeVisible()

    // Click Quick Mode toggle (Zap icon + "Quick" label in wizard nav)
    await page.getByRole('button', { name: 'Quick' }).click()

    // Quick Mode header visible (AC3.2: Quick Mode UI)
    await expect(page.getByText('Quick Mode').first()).toBeVisible()
  })

  test('should switch back from Quick Mode to Guided wizard', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto('/admin/bookings')
    await page.getByRole('button', { name: /New Booking/i }).click()

    // Switch to Quick Mode first
    await page.getByRole('button', { name: 'Quick' }).click()
    await expect(page.getByText('Quick Mode').first()).toBeVisible()

    // Switch back to Guided wizard
    await page.getByRole('button', { name: 'Guided' }).click()

    // Step 1 heading restored
    await expect(page.getByText('ขั้นตอนที่ 1: เลือกลูกค้า').first()).toBeVisible()
  })

  test('should show multi-day toggle in Quick Mode', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto('/admin/bookings')
    await page.getByRole('button', { name: /New Booking/i }).click()

    // Switch to Quick Mode
    await page.getByRole('button', { name: 'Quick' }).click()
    await expect(page.getByText('Quick Mode').first()).toBeVisible()

    // DateRangePicker "หลายวัน" label visible (AC3.3 / AC3.4: multi-day UI)
    await expect(page.getByText('หลายวัน').first()).toBeVisible()

    // Date section label visible
    await expect(page.getByText('วันและเวลา').first()).toBeVisible()
  })

  test.skip('should create multi-day booking via wizard (end-to-end)', async () => {
    // TODO: Requires MSW to mock:
    //   - GET /service_packages_v2 → returns packages with pricing
    //   - GET /customers → returns customer list for Combobox
    //   - POST /bookings → returns created booking
    // Then:
    //   Step 1: select existing customer from Combobox
    //   Step 2: select package, toggle หลายวัน, set booking_date + end_date
    //   Step 3: skip assignment (assignmentType = 'none')
    //   Step 4: verify "X วัน" badge, click สร้างการจอง
    //   Assert: toast "สร้างการจองสำเร็จ" visible
  })

  test.skip('should create custom pricing booking via Quick Mode (end-to-end)', async () => {
    // TODO: Requires MSW for packages + customer mocks
    // Then: switch to Quick Mode → SmartPriceField Custom Job toggle
    //   Fill job_name "โรงงาน ABC", price 18000
    //   Submit → verify ฿18,000 displayed in confirmation
  })
})
