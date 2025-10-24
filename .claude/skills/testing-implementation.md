# Testing Implementation Skill

## Purpose
Implement comprehensive testing strategy for Tinedy CRM, focusing on critical booking system functionality. Set up testing infrastructure and create unit, integration, and end-to-end tests to ensure code quality and prevent regressions.

## When to Use
- No existing tests in the project
- Before major refactoring or feature additions
- Critical business logic needs protection (booking conflicts, calculations)
- Need to improve code confidence and reduce bugs
- Preparing for production deployment

## Scope
This skill focuses on:
1. **Test Infrastructure Setup** - Installing and configuring testing tools
2. **Unit Testing** - Testing individual functions and utilities
3. **Component Testing** - Testing React components in isolation
4. **Integration Testing** - Testing component interactions
5. **E2E Testing** - Testing complete user flows (optional)
6. **Test Coverage** - Measuring and improving test coverage

## Testing Stack for Tinedy CRM

### Recommended Tools
```json
{
  "vitest": "^2.0.0",                    // Fast test runner (Vite-native)
  "@testing-library/react": "^16.0.0",   // React component testing
  "@testing-library/jest-dom": "^6.0.0", // DOM matchers
  "@testing-library/user-event": "^14.0.0", // User interaction simulation
  "msw": "^2.0.0",                       // API mocking (Mock Service Worker)
  "@vitest/coverage-v8": "^2.0.0",       // Code coverage reports
  "@faker-js/faker": "^9.0.0"            // Test data generation
}
```

## Setup Process

### Step 1: Install Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8 @faker-js/faker happy-dom
```

### Step 2: Create Vitest Configuration

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/main.tsx',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Step 3: Create Test Setup File

Create `src/test/setup.ts`:
```typescript
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    auth: {
      getSession: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    }
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

### Step 4: Update package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Testing Strategy

### Priority 1: Critical Business Logic (Booking System)

#### 1.1 Booking Validation Tests
File: `src/lib/__tests__/booking-validation.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { validateBookingConflict, isStaffAvailable } from '@/lib/booking-validation'

describe('Booking Validation', () => {
  describe('validateBookingConflict', () => {
    it('should detect overlapping bookings for same staff', () => {
      const existingBooking = {
        id: '1',
        staff_id: 'staff-1',
        booking_date: '2025-10-24',
        start_time: '10:00',
        end_time: '12:00',
        status: 'confirmed'
      }

      const newBooking = {
        staff_id: 'staff-1',
        booking_date: '2025-10-24',
        start_time: '11:00',
        end_time: '13:00'
      }

      const result = validateBookingConflict(newBooking, [existingBooking])

      expect(result.hasConflict).toBe(true)
      expect(result.conflictingBooking).toEqual(existingBooking)
    })

    it('should allow bookings for different staff at same time', () => {
      const existingBooking = {
        staff_id: 'staff-1',
        booking_date: '2025-10-24',
        start_time: '10:00',
        end_time: '12:00'
      }

      const newBooking = {
        staff_id: 'staff-2',
        booking_date: '2025-10-24',
        start_time: '10:00',
        end_time: '12:00'
      }

      const result = validateBookingConflict(newBooking, [existingBooking])

      expect(result.hasConflict).toBe(false)
    })

    it('should ignore cancelled bookings when checking conflicts', () => {
      const existingBooking = {
        staff_id: 'staff-1',
        booking_date: '2025-10-24',
        start_time: '10:00',
        end_time: '12:00',
        status: 'cancelled'
      }

      const newBooking = {
        staff_id: 'staff-1',
        booking_date: '2025-10-24',
        start_time: '11:00',
        end_time: '13:00'
      }

      const result = validateBookingConflict(newBooking, [existingBooking])

      expect(result.hasConflict).toBe(false)
    })
  })
})
```

#### 1.2 Analytics Calculation Tests
File: `src/lib/__tests__/analytics.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  calculateRevenue,
  calculateCompletionRate,
  calculateCustomerLifetimeValue,
  getTopCustomers
} from '@/lib/analytics'

describe('Analytics Calculations', () => {
  describe('calculateRevenue', () => {
    it('should calculate total revenue from completed bookings', () => {
      const bookings = [
        { status: 'completed', total_price: 1000 },
        { status: 'completed', total_price: 2000 },
        { status: 'cancelled', total_price: 1500 },
        { status: 'pending', total_price: 500 }
      ]

      const revenue = calculateRevenue(bookings)

      expect(revenue).toBe(3000)
    })

    it('should return 0 for empty bookings', () => {
      expect(calculateRevenue([])).toBe(0)
    })
  })

  describe('calculateCompletionRate', () => {
    it('should calculate completion rate correctly', () => {
      const bookings = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'cancelled' },
        { status: 'pending' }
      ]

      const rate = calculateCompletionRate(bookings)

      expect(rate).toBe(60) // 3 out of 5 = 60%
    })

    it('should return 0 for empty bookings', () => {
      expect(calculateCompletionRate([])).toBe(0)
    })
  })

  describe('calculateCustomerLifetimeValue', () => {
    it('should sum all completed bookings for customer', () => {
      const customerBookings = [
        { status: 'completed', total_price: 1000 },
        { status: 'completed', total_price: 2000 },
        { status: 'cancelled', total_price: 1500 }
      ]

      const clv = calculateCustomerLifetimeValue(customerBookings)

      expect(clv).toBe(3000)
    })
  })
})
```

#### 1.3 Utility Function Tests
File: `src/lib/__tests__/utils.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatTime,
  formatFullAddress,
  calculateDuration
} from '@/lib/utils'

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('should format number as Thai Baht', () => {
      expect(formatCurrency(1000)).toBe('฿1,000.00')
      expect(formatCurrency(1500.5)).toBe('฿1,500.50')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('฿0.00')
    })
  })

  describe('formatDate', () => {
    it('should format date in DD/MM/YYYY format', () => {
      const date = new Date('2025-10-24')
      expect(formatDate(date)).toBe('24/10/2025')
    })
  })

  describe('formatFullAddress', () => {
    it('should combine address parts correctly', () => {
      const booking = {
        address: '123 Main St',
        city: 'Bangkok',
        state: 'Bangkok',
        zip_code: '10110'
      }

      expect(formatFullAddress(booking)).toBe('123 Main St, Bangkok, Bangkok 10110')
    })

    it('should handle missing optional fields', () => {
      const booking = {
        address: '123 Main St',
        city: 'Bangkok'
      }

      expect(formatFullAddress(booking)).toBe('123 Main St, Bangkok')
    })
  })
})
```

### Priority 2: Component Testing

#### 2.1 Booking Form Component Test
File: `src/components/booking/__tests__/BookingForm.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookingForm } from '../BookingForm'

describe('BookingForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  it('should render all form fields', () => {
    render(
      <BookingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByLabelText(/customer/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/service/i)).toBeInTheDocument()
  })

  it('should show validation errors for required fields', async () => {
    render(
      <BookingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/customer is required/i)).toBeInTheDocument()
    })
  })

  it('should call onSubmit with form data when valid', async () => {
    render(
      <BookingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Fill out form
    await userEvent.type(screen.getByLabelText(/customer/i), 'John Doe')
    await userEvent.type(screen.getByLabelText(/date/i), '2025-10-24')

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_name: 'John Doe',
          booking_date: '2025-10-24'
        })
      )
    })
  })
})
```

#### 2.2 Booking Table Component Test
File: `src/components/booking/__tests__/BookingTable.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookingTable } from '../BookingTable'

describe('BookingTable', () => {
  const mockBookings = [
    {
      id: '1',
      booking_date: '2025-10-24',
      customer: { full_name: 'John Doe' },
      service_packages: { name: 'Deep Cleaning' },
      total_price: 1000,
      status: 'confirmed'
    },
    {
      id: '2',
      booking_date: '2025-10-25',
      customer: { full_name: 'Jane Smith' },
      service_packages: { name: 'Regular Cleaning' },
      total_price: 500,
      status: 'pending'
    }
  ]

  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()

  it('should render all bookings', () => {
    render(
      <BookingTable
        bookings={mockBookings}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Deep Cleaning')).toBeInTheDocument()
  })

  it('should call onEdit when edit button clicked', async () => {
    render(
      <BookingTable
        bookings={mockBookings}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    await userEvent.click(editButtons[0])

    expect(mockOnEdit).toHaveBeenCalledWith(mockBookings[0])
  })

  it('should show empty state when no bookings', () => {
    render(
      <BookingTable
        bookings={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText(/no bookings found/i)).toBeInTheDocument()
  })
})
```

### Priority 3: Custom Hook Testing

#### 3.1 useBookings Hook Test
File: `src/hooks/__tests__/use-bookings.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useBookings } from '../use-bookings'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase')

describe('useBookings', () => {
  it('should fetch bookings on mount', async () => {
    const mockBookings = [
      { id: '1', customer_name: 'John' },
      { id: '2', customer_name: 'Jane' }
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: mockBookings,
        error: null
      })
    } as any)

    const { result } = renderHook(() => useBookings())

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.bookings).toEqual(mockBookings)
    })
  })

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch')

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: mockError
      })
    } as any)

    const { result } = renderHook(() => useBookings())

    await waitFor(() => {
      expect(result.current.error).toBe(mockError)
      expect(result.current.bookings).toEqual([])
    })
  })
})
```

## Test Coverage Goals

### Minimum Coverage Targets
- **Overall**: 70%
- **Critical Business Logic**: 90%
  - Booking validation functions
  - Analytics calculations
  - Conflict detection
  - Status workflow
- **UI Components**: 60%
- **Utility Functions**: 80%
- **Custom Hooks**: 75%

### Files Requiring High Coverage (90%+)
```
src/lib/booking-validation.ts
src/lib/analytics.ts
src/hooks/use-staff-bookings.ts
src/hooks/use-booking-form.ts
src/lib/booking-utils.ts
```

## Testing Best Practices

### 1. Test Naming Convention
```typescript
describe('Component/Function Name', () => {
  describe('specific functionality', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test implementation
    })
  })
})
```

### 2. AAA Pattern (Arrange, Act, Assert)
```typescript
it('should calculate total revenue', () => {
  // Arrange
  const bookings = [
    { status: 'completed', total_price: 1000 },
    { status: 'completed', total_price: 2000 }
  ]

  // Act
  const result = calculateRevenue(bookings)

  // Assert
  expect(result).toBe(3000)
})
```

### 3. Test Data Factories
Create `src/test/factories.ts`:
```typescript
import { faker } from '@faker-js/faker'

export const createMockBooking = (overrides = {}) => ({
  id: faker.string.uuid(),
  booking_date: faker.date.future().toISOString(),
  start_time: '10:00',
  end_time: '12:00',
  customer_id: faker.string.uuid(),
  staff_id: faker.string.uuid(),
  service_package_id: faker.string.uuid(),
  total_price: faker.number.int({ min: 500, max: 5000 }),
  status: 'pending',
  ...overrides
})

export const createMockCustomer = (overrides = {}) => ({
  id: faker.string.uuid(),
  full_name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  ...overrides
})
```

### 4. Mock Supabase Responses
Create `src/test/mocks/supabase.ts`:
```typescript
import { vi } from 'vitest'

export const createMockSupabaseQuery = (data: any, error: any = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  then: vi.fn().mockResolvedValue({ data, error })
})
```

## Testing Workflow

### Daily Development
```bash
# Run tests in watch mode during development
npm run test

# Run tests with UI
npm run test:ui
```

### Before Committing
```bash
# Run all tests
npm run test:run

# Check coverage
npm run test:coverage
```

### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
```

## Test Checklist

Before marking testing complete:
- [ ] Vitest configured with coverage
- [ ] Test setup file created with mocks
- [ ] Test scripts added to package.json
- [ ] Booking validation tests written (90%+ coverage)
- [ ] Analytics calculation tests written (90%+ coverage)
- [ ] Utility function tests written (80%+ coverage)
- [ ] At least 3 critical component tests written
- [ ] At least 2 custom hook tests written
- [ ] Test data factories created
- [ ] Supabase mocking helpers created
- [ ] All tests passing
- [ ] Coverage meets minimum thresholds (70% overall)
- [ ] Documentation updated with testing guidelines

## Output Format

After implementing tests, provide:

1. **Setup Summary** - What tools were installed and configured
2. **Tests Created** - List of test files with coverage percentages
3. **Coverage Report** - Overall and per-file coverage metrics
4. **Test Results** - Pass/fail status for all tests
5. **Next Steps** - Areas still needing test coverage
6. **CI/CD Integration** - Instructions for automated testing

## Notes

- Focus on testing behavior, not implementation details
- Test edge cases and error scenarios
- Mock external dependencies (Supabase, APIs)
- Keep tests fast and isolated
- Use descriptive test names
- Prioritize booking system tests first
- Maintain tests alongside feature development
