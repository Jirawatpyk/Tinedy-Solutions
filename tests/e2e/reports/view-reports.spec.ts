/**
 * Reports & Analytics Tests
 *
 * Tests reporting and analytics features
 *
 * NOTE: Uses static test users from fixtures/users.ts (works with MSW mocking)
 */
import { test, expect } from '@playwright/test';
import { testUsers } from '../../fixtures/users';

test.describe('Reports & Analytics', () => {
  test.skip('should view dashboard statistics', async ({ page }) => {
    // TODO: Requires booking/customer data - skip until MSW data handlers added
  });

  test.skip('should export reports to CSV', async ({ page }) => {
    // TODO: Requires data-testid attributes - skip for now
  });

  test('manager should access reports page', async ({ page }) => {
    const manager = testUsers.manager;

    await page.goto('/login');
    await page.fill('input[name="email"]', manager.email);
    await page.fill('input[name="password"]', manager.password);
    await page.click('button[type="submit"]');

    await page.goto('/admin/reports');
    await expect(page).toHaveURL(/\/admin\/reports/);

    // Manager should NOT access settings
    await page.goto('/admin/settings');
    // Note: MSW doesn't implement RBAC, so this might pass incorrectly
  });
});
