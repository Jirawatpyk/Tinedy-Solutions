/**
 * Settings Management Tests
 *
 * Tests admin-only settings functionality
 *
 * NOTE: Uses static test users from fixtures/users.ts (works with MSW mocking)
 */
import { test, expect } from '@playwright/test';
import { testUsers } from '../../fixtures/users';

test.describe('Settings Management', () => {
  test('admin should access settings page', async ({ page }) => {
    const admin = testUsers.admin;

    await page.goto('/login');
    await page.fill('input[name="email"]', admin.email);
    await page.fill('input[name="password"]', admin.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/admin/);

    // Navigate to settings
    await page.goto('/admin/settings');
    await expect(page).toHaveURL(/\/admin\/settings/);

    // Just verify URL - don't check specific elements
  });

  test.skip('manager should NOT access settings page', async ({ page }) => {
    // TODO: MSW doesn't implement RLS - skip until RBAC mocking added
    const manager = testUsers.manager;

    await page.goto('/login');
    await page.fill('input[name="email"]', manager.email);
    await page.fill('input[name="password"]', manager.password);
    await page.click('button[type="submit"]');

    await page.goto('/admin/settings');

    await expect(page).not.toHaveURL(/\/admin\/settings/);
    await expect(page).toHaveURL(/\/(admin|unauthorized)/);
  });
});
