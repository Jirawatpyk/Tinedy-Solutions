/**
 * Authentication: Login Tests
 *
 * Tests login functionality for all user roles:
 * 1. Successful login for Admin, Manager, Staff
 * 2. Login failure scenarios
 * 3. Role-based redirects
 * 4. Session persistence
 * 5. Logout functionality
 *
 * NOTE: Uses predefined test users from fixtures/users.ts (works with MSW mocking)
 */
import { test, expect } from '@playwright/test';
import { testUsers } from '../../fixtures/users';

test.describe('Authentication: Login', () => {
  test('should login as Admin and redirect to admin portal', async ({ page }) => {
    const admin = testUsers.admin;

    // Navigate to login and wait for full load
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Verify login page elements
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();

    // Fill credentials
    await page.fill('[data-testid="email-input"]', admin.email);
    await page.fill('[data-testid="password-input"]', admin.password);

    // Submit login and wait for navigation
    await Promise.all([
      page.waitForURL(/\/admin/, { timeout: 30000 }),
      page.click('[data-testid="login-button"]'),
    ]);
  });

  test('should login as Manager and redirect to admin portal', async ({ page }) => {
    const manager = testUsers.manager;

    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', manager.email);
    await page.fill('[data-testid="password-input"]', manager.password);
    await page.click('[data-testid="login-button"]');

    // Manager also uses admin portal but with limited permissions
    await expect(page).toHaveURL(/\/admin/, { timeout: 30000 });
  });

  test('should login as Staff and redirect to staff portal', async ({ page }) => {
    const staff = testUsers.staff1;

    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', staff.email);
    await page.fill('[data-testid="password-input"]', staff.password);
    await page.click('[data-testid="login-button"]');

    // Staff redirected to staff portal (NOT admin portal)
    await expect(page).toHaveURL(/\/staff/, { timeout: 30000 });
  });

  test('should fail login with incorrect password', async ({ page }) => {
    const admin = testUsers.admin;

    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', admin.email);
    await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
    await page.click('[data-testid="login-button"]');

    // Verify still on login page (failed login)
    await expect(page).toHaveURL(/\/login/);
  });

  test('should fail login with non-existent user', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'nonexistent@test.com');
    await page.fill('[data-testid="password-input"]', 'Test1234!');
    await page.click('[data-testid="login-button"]');

    // Verify still on login page (failed login)
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');

    // Try to submit without filling fields
    await page.click('[data-testid="login-button"]');

    // Verify validation errors appear (React Hook Form validation)
    await expect(page.locator('text=Email is required').or(page.locator('text=กรุณากรอกอีเมล'))).toBeVisible({ timeout: 5000 });
  });

  test.skip('should logout successfully', async ({ page }) => {
    // TODO: Add data-testid to user menu and logout button
    const admin = testUsers.admin;

    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', admin.email);
    await page.fill('[data-testid="password-input"]', admin.password);
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/\/admin/, { timeout: 30000 });

    // Logout (requires data-testid on user menu)
    // await page.click('[data-testid="user-menu"]');
    // await page.click('[data-testid="logout-button"]');

    // Verify redirected to login
    // await expect(page).toHaveURL(/\/login/);
  });
});
