/**
 * RBAC Enforcement Tests
 *
 * Tests that role-based access control is properly enforced:
 * 1. Staff cannot access admin routes
 * 2. Manager cannot access admin-only features (settings, hard delete)
 * 3. Protected routes redirect unauthorized users
 * 4. UI elements hidden based on permissions
 * 5. API calls respect RLS policies
 *
 * NOTE: Uses static test users from fixtures/users.ts (works with MSW mocking)
 */
import { test, expect } from '@playwright/test';
import { testUsers } from '../../fixtures/users';

test.describe('RBAC: Permission Enforcement', () => {
  test('should block staff from accessing admin routes', async ({ page }) => {
    // Login as staff
    const staff = testUsers.staff1;

    await page.goto('/login');
    await page.fill('input[name="email"]', staff.email);
    await page.fill('input[name="password"]', staff.password);
    await page.click('button[type="submit"]');

    // Verify logged in to staff portal
    await expect(page).toHaveURL(/\/staff/);

    // Try to access admin routes directly
    await page.goto('/admin/bookings');

    // Verify redirected to unauthorized or staff portal
    await expect(page).not.toHaveURL(/\/admin\/bookings/);
    await expect(page).toHaveURL(/\/(staff|unauthorized)/);

    // Try admin customers page
    await page.goto('/admin/customers');
    await expect(page).not.toHaveURL(/\/admin\/customers/);

    // Try admin staff management
    await page.goto('/admin/staff');
    await expect(page).not.toHaveURL(/\/admin\/staff/);

    // Try admin settings
    await page.goto('/admin/settings');
    await expect(page).not.toHaveURL(/\/admin\/settings/);
  });

  test.skip('should block manager from settings page (admin-only)', async ({ page }) => {
    // TODO: MSW doesn't implement RBAC/permissions - skip until RBAC mocking added
    // Login as manager
    const manager = testUsers.manager;

    await page.goto('/login');
    await page.fill('input[name="email"]', manager.email);
    await page.fill('input[name="password"]', manager.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/admin/);

    // Manager can access most admin routes
    await page.goto('/admin/bookings');
    await expect(page).toHaveURL(/\/admin\/bookings/);

    // But NOT settings (admin-only)
    await page.goto('/admin/settings');
    await expect(page).not.toHaveURL(/\/admin\/settings/);
    await expect(page).toHaveURL(/\/(admin|unauthorized)/);

    // Verify settings nav item hidden for managers
    await page.goto('/admin');
    await expect(page.locator('[data-testid="nav-settings"]')).not.toBeVisible();
  });

  test.skip('should hide delete buttons for managers (soft delete only)', async ({ page }) => {
    // TODO: Re-enable after adding customer data MSW handlers
    // Login as manager
    const manager = testUsers.manager;

    await page.goto('/login');
    await page.fill('input[name="email"]', manager.email);
    await page.fill('input[name="password"]', manager.password);
    await page.click('button[type="submit"]');

    // Navigate to customers
    await page.goto('/admin/customers');

    // Open customer menu
    await page.click(`[data-testid="customer-menu-${customer.id}"]`);

    // Verify soft delete (archive) IS visible
    await expect(page.locator('[data-testid="archive-customer"]')).toBeVisible();

    // Verify hard delete is NOT visible (admin-only)
    await expect(page.locator('[data-testid="hard-delete-customer"]')).not.toBeVisible();
  });

  test.skip('should enforce permissions on bookings', async ({ page }) => {
    // TODO: Re-enable after adding booking data MSW handlers

    // Login as staff
    await page.goto('/login');
    await page.fill('input[name="email"]', staff.email);
    await page.fill('input[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');

    // Navigate to staff calendar
    await page.goto('/staff/calendar');

    // Verify staff CANNOT see other staff's booking
    await expect(page.locator(`[data-testid="booking-${booking.id}"]`)).not.toBeVisible();

    // Try to access booking directly via URL
    await page.goto(`/staff/bookings/${booking.id}`);

    // Verify access denied
    await expect(page).not.toHaveURL(/\/staff\/bookings\/${booking.id}/);
  });

  test.skip('should show role-appropriate navigation menu', async ({ page }) => {
    // TODO: Requires many data-testid attributes on nav items - skip for now
    // Test Admin menu
    const admin = testUsers.admin;

    await page.goto('/login');
    await page.fill('input[name="email"]', admin.email);
    await page.fill('input[name="password"]', admin.password);
    await page.click('button[type="submit"]');

    // Admin should see all nav items
    await expect(page.locator('[data-testid="nav-bookings"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-customers"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-staff"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-teams"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-reports"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-settings"]')).toBeVisible();

    // Logout and test Manager menu
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    const manager = testUsers.manager;
    await page.goto('/login');
    await page.fill('input[name="email"]', manager.email);
    await page.fill('input[name="password"]', manager.password);
    await page.click('button[type="submit"]');

    // Manager should NOT see settings
    await expect(page.locator('[data-testid="nav-settings"]')).not.toBeVisible();

    // Logout and test Staff menu
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    const staff = testUsers.staff1;
    await page.goto('/login');
    await page.fill('input[name="email"]', staff.email);
    await page.fill('input[name="password"]', staff.password);
    await page.click('button[type="submit"]');

    // Staff should see limited menu (staff portal)
    await expect(page.locator('[data-testid="nav-calendar"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-profile"]')).toBeVisible();

    // Staff should NOT see admin nav items
    await expect(page.locator('[data-testid="nav-customers"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-staff"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-reports"]')).not.toBeVisible();
  });

  test('should persist session after page reload', async ({ page }) => {
    const admin = testUsers.admin;

    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', admin.email);
    await page.fill('input[name="password"]', admin.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/admin/);

    // Reload page
    await page.reload();

    // Verify still authenticated (session persisted)
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Navigate to another route
    await page.goto('/admin/customers');
    await expect(page).toHaveURL(/\/admin\/customers/);

    // Reload again
    await page.reload();

    // Verify still authenticated
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});
