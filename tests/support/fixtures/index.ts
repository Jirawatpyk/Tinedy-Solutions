/**
 * Tinedy CRM Test Fixtures
 *
 * Combines Playwright test with custom fixtures and utilities:
 * - authSessionFixture: Token persistence across tests
 * - networkErrorMonitorFixture: Automatic HTTP error detection (4xx/5xx)
 * - Custom factories: User, Booking, Customer data factories
 *
 * Installation: ✅ INSTALLED
 *   npm install -D @seontechnologies/playwright-utils @faker-js/faker
 */
import { test as base } from '@playwright/test';
// NOTE: playwright-utils available but using traditional pattern for now
// import { authSessionFixture, networkErrorMonitorFixture } from '@seontechnologies/playwright-utils';
import { UserFactory } from './factories/user-factory';
import { BookingFactory } from './factories/booking-factory';
import { CustomerFactory } from './factories/customer-factory';

type TestFixtures = {
  userFactory: UserFactory;
  bookingFactory: BookingFactory;
  customerFactory: CustomerFactory;
};

/**
 * Extended test with custom fixtures
 *
 * Usage in tests:
 *   import { test, expect } from './support/fixtures';
 *
 *   test('should create booking', async ({ page, userFactory, bookingFactory }) => {
 *     const user = await userFactory.createStaff();
 *     const booking = await bookingFactory.createBooking({ staff_id: user.id });
 *     // ... test logic
 *   });
 */
export const test = base.extend<TestFixtures>({
  // Using traditional fixture pattern (playwright-utils available but commented)
  // ...authSessionFixture,
  // ...networkErrorMonitorFixture,

  // eslint-disable-next-line no-empty-pattern
  userFactory: async ({ }, use) => {
    const factory = new UserFactory();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(factory);
    await factory.cleanup();
  },

  // eslint-disable-next-line no-empty-pattern
  bookingFactory: async ({ }, use) => {
    const factory = new BookingFactory();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(factory);
    await factory.cleanup();
  },

  // eslint-disable-next-line no-empty-pattern
  customerFactory: async ({ }, use) => {
    const factory = new CustomerFactory();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(factory);
    await factory.cleanup();
  },
});

export { expect } from '@playwright/test';
