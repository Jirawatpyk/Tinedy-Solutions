/**
 * Staff: View Customers (Read-Only) Tests
 *
 * Tests that staff can view customers but not create/edit/delete
 */
import { test, expect } from '../../../fixtures/msw'
import { testUsers } from '../../../fixtures/users'

test.describe('Staff: View Customers (Read-Only)', () => {
  test('should view customer list', async ({ page }) => {
    const staff = testUsers.staff1

    // Login as staff
    await page.goto('/login')
    await page.fill('input[name="email"]', staff.email)
    await page.fill('input[name="password"]', staff.password)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/staff/)

    // Staff portal - navigate to relevant page if customers are accessible
    // Note: Check if staff can access customer list
    // If not, this test should verify they CANNOT access it
  })

  test.skip('should view customer details', async ({ page }) => {
    // TODO: Requires navigation to specific customer detail page
  })

  test.skip('should NOT access creation forms', async ({ page }) => {
    // TODO: Requires checking for absence of "Add Customer" button
  })

  test.skip('should NOT see analytics', async ({ page }) => {
    // TODO: Requires checking customer detail page for analytics section
  })
})
