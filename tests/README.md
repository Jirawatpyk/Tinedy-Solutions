# Tinedy CRM - E2E Test Suite

Production-ready End-to-End test framework using **Playwright** with fixtures, data factories, and best practices.

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Data Factories](#data-factories)
- [Test Organization](#test-organization)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

**Optional Enhancement:** Install playwright-utils for advanced fixtures:

```bash
npm install -D @seontechnologies/playwright-utils
```

Then uncomment the playwright-utils imports in `tests/support/fixtures/index.ts`.

### 2. Configure Environment

Copy the example environment file and fill in your Supabase credentials:

```bash
cp tests/.env.example tests/.env
```

Edit `tests/.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
BASE_URL=http://localhost:5173
```

### 3. Run Tests

```bash
# Run all tests (headless)
npm run test:e2e

# Run tests with UI (headed mode)
npm run test:e2e -- --headed

# Run tests with Playwright UI (interactive)
npm run test:e2e -- --ui

# Run specific test file
npm run test:e2e tests/e2e/booking/admin/create-booking.spec.ts

# Run tests matching a pattern
npm run test:e2e -- --grep "Admin"

# Debug mode (slow-mo, headed)
npm run test:e2e -- --debug
```

### 4. View Test Results

```bash
# Open HTML report
npm run test:e2e:report
```

---

## 🏗️ Architecture Overview

### Directory Structure

```
tests/
├── e2e/                              # E2E test files
│   ├── booking/                      # Booking feature tests
│   │   ├── admin/                    # Admin role tests
│   │   │   └── create-booking.spec.ts
│   │   ├── manager/                  # Manager role tests
│   │   │   └── soft-delete-booking.spec.ts
│   │   └── staff/                    # Staff role tests
│   │       └── view-my-bookings.spec.ts
│   ├── customer/                     # Customer management tests
│   ├── staff/                        # Staff management tests
│   ├── teams/                        # Team management tests
│   └── critical-paths/               # Critical business flows
│       └── booking-payment-flow.spec.ts
├── support/                          # Test infrastructure
│   ├── fixtures/                     # Test fixtures
│   │   ├── index.ts                  # Fixture composition
│   │   └── factories/                # Data factories
│   │       ├── user-factory.ts       # User creation/cleanup
│   │       ├── booking-factory.ts    # Booking data
│   │       └── customer-factory.ts   # Customer data
│   └── helpers/                      # Utility functions
├── .env.example                      # Environment template
└── README.md                         # This file
```

### Architecture Patterns

#### 1. Fixture Pattern

Tests use custom fixtures for automatic setup/cleanup:

```typescript
import { test, expect } from '@/tests/support/fixtures';

test('should create booking', async ({ page, userFactory, bookingFactory }) => {
  const user = await userFactory.createStaff();
  const booking = await bookingFactory.createBooking({ staff_id: user.id });
  // ... test logic
  // Cleanup happens automatically after test
});
```

#### 2. Data Factory Pattern

Factories create realistic test data using Faker.js:

```typescript
// Create staff user
const staff = await userFactory.createStaff();

// Create customer with overrides
const customer = await customerFactory.createCustomer({
  name: 'John Doe',
  email: 'john@example.com',
});

// Create confirmed booking
const booking = await bookingFactory.createConfirmedBooking({
  customer_id: customer.id,
  staff_id: staff.id,
});
```

#### 3. Role-Based Organization

Tests are organized by feature and role:

- **Admin tests**: Full CRUD operations
- **Manager tests**: Soft delete (archive) only
- **Staff tests**: View assigned bookings only

This mirrors the application's RBAC (Role-Based Access Control) system.

---

## 🧪 Running Tests

### Local Development

```bash
# Watch mode (runs dev server automatically)
npm run test:e2e

# Specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit

# Mobile viewports (if enabled in config)
npm run test:e2e -- --project="Mobile Chrome"

# Parallel execution (faster)
npm run test:e2e -- --workers=4

# Run tests matching pattern
npm run test:e2e -- --grep "booking"
npm run test:e2e -- --grep-invert "slow"
```

### Debug Mode

```bash
# Playwright Inspector (step through tests)
npm run test:e2e -- --debug

# Headed mode (see browser)
npm run test:e2e -- --headed

# Slow motion (easier to follow)
npm run test:e2e -- --headed --slow-mo=1000
```

### View Reports

```bash
# HTML report (after test run)
npx playwright show-report test-results/html

# Trace viewer (for failed tests)
npx playwright show-trace test-results/artifacts/trace.zip
```

---

## ✍️ Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@/tests/support/fixtures';

test.describe('Feature: Description', () => {
  test('should do something specific', async ({ page, userFactory }) => {
    // 1. Setup: Create test data
    const user = await userFactory.createAdmin();

    // 2. Action: Perform user actions
    await page.goto('/login');
    await page.fill('[data-testid="email"]', user.email);
    await page.fill('[data-testid="password"]', 'Test1234!');
    await page.click('[data-testid="login-button"]');

    // 3. Assert: Verify expected outcome
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Cleanup happens automatically via fixtures
  });
});
```

### Best Practices

#### ✅ DO:

- Use `data-testid` attributes for selectors
- Create test data via factories
- Test one scenario per test
- Use descriptive test names
- Clean up test data automatically (via fixtures)
- Test critical user paths end-to-end
- Use role-specific tests (admin, manager, staff)

#### ❌ DON'T:

- Use brittle CSS selectors (`.button-primary`)
- Hardcode test data
- Share state between tests
- Test implementation details
- Skip cleanup (causes test pollution)
- Use `test.only()` in committed code

### Selector Strategy

**Recommended:**

```typescript
// ✅ data-testid (stable, semantic)
await page.click('[data-testid="create-booking-button"]');

// ✅ Text content (for labels)
await page.click('text="Create Booking"');

// ✅ Role-based (accessibility)
await page.getByRole('button', { name: 'Submit' });
```

**Avoid:**

```typescript
// ❌ CSS classes (brittle)
await page.click('.btn-primary');

// ❌ Complex XPath
await page.click('//div[@class="container"]//button[1]');
```

---

## 🏭 Data Factories

### UserFactory

Creates test users with proper Supabase authentication.

```typescript
import { test } from '@/tests/support/fixtures';

test('example', async ({ userFactory }) => {
  // Create admin
  const admin = await userFactory.createAdmin();

  // Create manager
  const manager = await userFactory.createManager();

  // Create staff with custom data
  const staff = await userFactory.createStaff({
    full_name: 'John Doe',
    email: 'john@example.com',
    skills: ['Cleaning', 'Painting'],
  });

  // Get login credentials
  const { email, password } = userFactory.getUserCredentials(staff);
  // password is always 'Test1234!'
});
```

### CustomerFactory

Creates customer records.

```typescript
test('example', async ({ customerFactory }) => {
  // Create random customer
  const customer = await customerFactory.createCustomer();

  // Create with overrides
  const vipCustomer = await customerFactory.createCustomer({
    name: 'Jane Smith',
    email: 'jane@example.com',
    tags: ['VIP', 'Repeat'],
  });

  // Create VIP customer (shortcut)
  const vip = await customerFactory.createVIPCustomer();

  // Create multiple customers
  const customers = await customerFactory.createCustomers(5);
});
```

### BookingFactory

Creates booking records.

```typescript
test('example', async ({ bookingFactory }) => {
  // Create pending booking
  const booking = await bookingFactory.createBooking({
    customer_id: customer.id,
    staff_id: staff.id,
  });

  // Create confirmed booking
  const confirmed = await bookingFactory.createConfirmedBooking({
    customer_id: customer.id,
    staff_id: staff.id,
  });

  // Create paid booking
  const paid = await bookingFactory.createPaidBooking({
    customer_id: customer.id,
    staff_id: staff.id,
    total_price: 2000,
  });

  // Create team booking (no staff assignment)
  const teamBooking = await bookingFactory.createTeamBooking(teamId, {
    customer_id: customer.id,
  });
});
```

---

## 📂 Test Organization

### Feature-Based Structure

Tests are organized by **feature** first, then by **role**:

```
tests/e2e/
├── booking/
│   ├── admin/         # Admin can: create, edit, delete, confirm
│   ├── manager/       # Manager can: create, edit, soft-delete
│   └── staff/         # Staff can: view assigned only
├── customer/
│   ├── admin/         # Full CRUD
│   ├── manager/       # CRU only
│   └── staff/         # Read-only
└── critical-paths/    # End-to-end business flows
```

### Test Naming Convention

```typescript
// Pattern: [Role]: [Action] [Entity]
test.describe('Admin: Create Booking', () => {
  test('should create booking with staff assignment', async ({}) => {});
  test('should create booking with team assignment', async ({}) => {});
});

test.describe('Manager: Soft Delete Booking', () => {
  test('should archive booking (soft delete)', async ({}) => {});
  test('should restore archived booking', async ({}) => {});
});
```

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          CI: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: test-results/
```

### Environment Variables for CI

Set these secrets in your CI/CD platform:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `BASE_URL` (if different from localhost)

---

## 🐛 Troubleshooting

### Common Issues

#### 1. **"Missing Supabase environment variables"**

**Solution:** Ensure `tests/.env` exists with valid Supabase credentials:

```bash
cp tests/.env.example tests/.env
# Edit tests/.env and add your Supabase URL and key
```

#### 2. **"Failed to create user: Function not found"**

**Solution:** Deploy Supabase Edge Functions:

```bash
# Deploy create-staff function
supabase functions deploy create-staff

# Deploy delete-user function
supabase functions deploy delete-user
```

#### 3. **"Timeout waiting for locator"**

**Solution:**
- Check `data-testid` attributes exist in UI components
- Increase timeout: `await page.waitForSelector('[data-testid="..."]', { timeout: 30000 })`
- Use `--headed` mode to see what's happening

#### 4. **Tests fail with "User not found" or "Unauthorized"**

**Solution:**
- Ensure Row Level Security (RLS) policies are enabled
- Run `enable_rls_policies_v2.sql` migration
- Check that test users have correct roles

#### 5. **Cleanup errors "Failed to delete user"**

**Solution:**
- Check FK constraints: Run `20250120_fix_deleted_by_foreign_keys.sql`
- Ensure Edge Functions have proper permissions

---

## 📊 Test Coverage Goals

| Area | Target | Status |
|------|--------|--------|
| Critical Paths | 100% | ✅ Complete |
| Admin Features | 80% | 🟡 In Progress |
| Manager Features | 80% | 🟡 In Progress |
| Staff Features | 70% | 🟡 In Progress |
| RBAC Enforcement | 100% | ✅ Complete |

---

## 🔗 Useful Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Faker.js Documentation](https://fakerjs.dev)
- [@seontechnologies/playwright-utils](https://github.com/seontechnologies/playwright-utils) (optional)

---

## 📝 Contributing

When adding new tests:

1. Follow the feature/role directory structure
2. Use data factories for test data
3. Add appropriate `data-testid` attributes to UI components
4. Include descriptive test names
5. Ensure automatic cleanup via fixtures
6. Update this README if adding new patterns

---

**Generated by:** BMad Test Architect (TEA) Workflow
**Version:** 1.0.0
**Last Updated:** 2026-01-22
