/**
 * MSW Playwright Fixtures
 *
 * Story: 3.3 - Setup Playwright for E2E Testing (Re-opened)
 *
 * Provides Playwright fixtures that automatically initialize MSW
 * in the browser context before each test.
 *
 * Usage in E2E tests:
 * ```ts
 * import { test } from '../fixtures/msw'
 *
 * test('should login', async ({ page }) => {
 *   // MSW is already running - requests are mocked
 *   await page.goto('/login')
 * })
 * ```
 */

import { test as base } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Initialize MSW in browser context
 *
 * This script runs in the browser and starts the MSW service worker.
 * It must run before any application code makes network requests.
 */
async function initializeMSW(page: Page) {
  await page.addInitScript(() => {
    // Define MSW worker setup in browser context
    (window as any).__MSW_ENABLED__ = true
  })

  // Navigate to base URL to trigger service worker registration
  await page.goto('/')

  // Wait for page to load
  await page.waitForLoadState('domcontentloaded')

  // Inject MSW browser setup with ALL handlers
  await page.evaluate(async () => {
    // Dynamic import of MSW setup in browser context
    const { setupWorker } = await import('msw/browser')
    const { http, HttpResponse } = await import('msw')

    // ===== MOCK DATA =====

    // Mock Bookings
    const mockBookings = [
      {
        id: 'booking-001',
        customer_id: 'customer-001',
        service_package_id: 'service-001',
        staff_id: 'staff-001',
        team_id: null,
        booking_date: new Date().toISOString().split('T')[0],
        start_time: '09:00:00',
        end_time: '11:00:00',
        status: 'pending',
        address: '123 ถนนสุขุมวิท',
        city: 'กรุงเทพมหานคร',
        state: 'กรุงเทพมหานคร',
        zip_code: '10110',
        notes: 'ต้องการทำความสะอาดละเอียด',
        price: 1500,
        payment_status: 'pending',
        payment_method: null,
        payment_slip_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        deleted_by: null,
      },
      {
        id: 'booking-002',
        customer_id: 'customer-002',
        service_package_id: 'service-002',
        staff_id: null,
        team_id: 'team-001',
        booking_date: new Date().toISOString().split('T')[0],
        start_time: '14:00:00',
        end_time: '16:00:00',
        status: 'confirmed',
        address: '456 ถนนรามคำแหง',
        city: 'กรุงเทพมหานคร',
        state: 'กรุงเทพมหานคร',
        zip_code: '10240',
        notes: 'บ้าน 2 ชั้น มีสัตว์เลี้ยง',
        price: 2500,
        payment_status: 'paid',
        payment_method: 'promptpay',
        payment_slip_url: 'https://example.com/slip-002.jpg',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        deleted_by: null,
      },
      {
        id: 'booking-003',
        customer_id: 'customer-001',
        service_package_id: 'service-001',
        staff_id: 'staff-002',
        team_id: null,
        booking_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        start_time: '10:00:00',
        end_time: '12:00:00',
        status: 'confirmed',
        address: '789 ถนนพระราม 9',
        city: 'กรุงเทพมหานคร',
        state: 'กรุงเทพมหานคร',
        zip_code: '10310',
        notes: null,
        price: 1800,
        payment_status: 'pending',
        payment_method: null,
        payment_slip_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        deleted_by: null,
      },
    ]

    // Mock Customers
    const mockCustomers = [
      {
        id: 'customer-001',
        name: 'สมชาย ใจดี',
        phone: '081-234-5678',
        email: 'somchai@example.com',
        address: '123 ถนนสุขุมวิท',
        city: 'กรุงเทพมหานคร',
        state: 'กรุงเทพมหานคร',
        zip_code: '10110',
        tags: ['VIP', 'ลูกค้าประจำ'],
        notes: 'ต้องการบริการเป็นพิเศษ',
        total_bookings: 15,
        total_spent: 22500,
        last_booking_date: new Date().toISOString().split('T')[0],
        avatar_url: null,
        created_at: '2024-06-15T08:00:00Z',
        updated_at: new Date().toISOString(),
        deleted_at: null,
        deleted_by: null,
      },
      {
        id: 'customer-002',
        name: 'วิภา สวยงาม',
        phone: '092-345-6789',
        email: null,
        address: '456 ถนนรามคำแหง',
        city: 'กรุงเทพมหานคร',
        state: 'กรุงเทพมหานคร',
        zip_code: '10240',
        tags: [],
        notes: null,
        total_bookings: 3,
        total_spent: 4500,
        last_booking_date: new Date(Date.now() - 604800000).toISOString().split('T')[0],
        avatar_url: null,
        created_at: '2024-10-20T14:30:00Z',
        updated_at: new Date().toISOString(),
        deleted_at: null,
        deleted_by: null,
      },
    ]

    // Mock Teams
    const mockTeams = [
      {
        id: 'team-001',
        name: 'ทีมทำความสะอาดหลัก',
        team_lead_id: 'staff-001',
        created_at: '2024-01-15T08:00:00Z',
        updated_at: new Date().toISOString(),
        deleted_at: null,
        deleted_by: null,
      },
      {
        id: 'team-002',
        name: 'ทีมทำความสะอาดพิเศษ',
        team_lead_id: 'staff-002',
        created_at: '2024-02-20T10:00:00Z',
        updated_at: new Date().toISOString(),
        deleted_at: null,
        deleted_by: null,
      },
    ]

    // Mock Team Members
    const mockTeamMembers = [
      { team_id: 'team-001', staff_id: 'staff-001' },
      { team_id: 'team-001', staff_id: 'staff-002' },
      { team_id: 'team-002', staff_id: 'staff-002' },
    ]

    // Mock Messages
    const mockMessages: any[] = []

    // In-memory stores
    let bookingsStore = [...mockBookings]
    let customersStore = [...mockCustomers]
    let teamsStore = [...mockTeams]
    let teamMembersStore = [...mockTeamMembers]
    let messagesStore = [...mockMessages]

    // Helper: Apply Supabase filters
    function applyFilters(items: any[], filters: Record<string, string>): any[] {
      let result = [...items]

      Object.entries(filters).forEach(([key, value]) => {
        if (value.startsWith('eq.')) {
          const filterValue = value.substring(3)
          result = result.filter((item) => String(item[key]) === filterValue)
        } else if (value.startsWith('in.(') && value.endsWith(')')) {
          const values = value.substring(4, value.length - 1).split(',')
          result = result.filter((item) => values.includes(String(item[key])))
        } else if (value.startsWith('is.')) {
          const isNull = value === 'is.null'
          result = result.filter((item) => (isNull ? item[key] === null : item[key] !== null))
        } else if (value.startsWith('gte.')) {
          const filterValue = value.substring(4)
          result = result.filter((item) => String(item[key]) >= filterValue)
        } else if (value.startsWith('lte.')) {
          const filterValue = value.substring(4)
          result = result.filter((item) => String(item[key]) <= filterValue)
        } else if (key === 'or') {
          // Handle OR queries like: or=(staff_id.eq.staff-001,team_id.in.(team-001,team-002))
          const orConditions = value.match(/\(([^)]+)\)/g) || []
          result = result.filter((item) => {
            return orConditions.some((condition) => {
              const match = condition.match(/(\w+)\.(eq|in)\.([\w,()-]+)/)
              if (!match) return false
              const [, field, operator, val] = match
              if (operator === 'eq') {
                return String(item[field]) === val
              } else if (operator === 'in') {
                const values = val.replace(/[()]/g, '').split(',')
                return values.includes(String(item[field]))
              }
              return false
            })
          })
        }
      })

      return result
    }

    // Helper: Parse query params
    function parseFilters(url: URL): Record<string, string> {
      const filters: Record<string, string> = {}
      url.searchParams.forEach((value, key) => {
        if (key !== 'select') {
          filters[key] = value
        }
      })
      return filters
    }

    // ===== AUTH HANDLERS =====
    const authHandlers = [
      // Login handler
      http.post('*/auth/v1/token', async ({ request }) => {
        const body = (await request.json()) as any
        const { email, password } = body

        const testUsers: Record<string, any> = {
          'admin@tinedy.com': {
            id: 'admin-001',
            role: 'admin',
            password: 'TestAdmin123!',
          },
          'manager@tinedy.com': {
            id: 'manager-001',
            role: 'manager',
            password: 'TestManager123!',
          },
          'staff001@tinedy.com': {
            id: 'staff-001',
            role: 'staff',
            password: 'TestStaff123!',
          },
        }

        const user = testUsers[email || '']

        if (!user || password !== user.password) {
          return HttpResponse.json({ error: 'Invalid credentials' }, { status: 400 })
        }

        return HttpResponse.json({
          access_token: `mock-token-${user.id}`,
          token_type: 'bearer',
          expires_in: 3600,
          user: { id: user.id, email, role: 'authenticated' },
        })
      }),

      // Get user handler
      http.get('*/auth/v1/user', ({ request }) => {
        const auth = request.headers.get('Authorization')
        if (!auth) {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = auth.replace('Bearer mock-token-', '')
        return HttpResponse.json({
          id: userId,
          email: `${userId}@tinedy.com`,
          role: 'authenticated',
        })
      }),

      // Profiles handler
      http.get('*/rest/v1/profiles', ({ request }) => {
        const url = new URL(request.url)
        const id = url.searchParams.get('id')

        const profiles = [
          { id: 'admin-001', email: 'admin@tinedy.com', role: 'admin', full_name: 'ผู้ดูแลระบบ' },
          { id: 'manager-001', email: 'manager@tinedy.com', role: 'manager', full_name: 'ผู้จัดการ' },
          { id: 'staff-001', email: 'staff001@tinedy.com', role: 'staff', full_name: 'พนักงาน' },
        ]

        if (id && id.startsWith('eq.')) {
          const targetId = id.replace('eq.', '')
          const profile = profiles.find((p) => p.id === targetId)
          return HttpResponse.json(profile || null)
        }

        return HttpResponse.json(profiles)
      }),
    ]

    // ===== BOOKINGS HANDLERS =====
    const bookingHandlers = [
      // GET bookings
      http.get('*/rest/v1/bookings', ({ request }) => {
        const url = new URL(request.url)
        const filters = parseFilters(url)
        const result = applyFilters(bookingsStore, filters)
        return HttpResponse.json(result)
      }),

      // POST booking (create)
      http.post('*/rest/v1/bookings', async ({ request }) => {
        const body = (await request.json()) as any
        const newBooking = {
          id: `booking-${Date.now()}`,
          ...body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          deleted_by: null,
        }
        bookingsStore.push(newBooking)
        return HttpResponse.json(newBooking, { status: 201 })
      }),

      // PATCH booking (update)
      http.patch('*/rest/v1/bookings', async ({ request }) => {
        const url = new URL(request.url)
        const filters = parseFilters(url)
        const body = (await request.json()) as any

        bookingsStore = bookingsStore.map((booking) => {
          const matches = applyFilters([booking], filters).length > 0
          if (matches) {
            return { ...booking, ...body, updated_at: new Date().toISOString() }
          }
          return booking
        })

        const updated = applyFilters(bookingsStore, filters)
        return HttpResponse.json(updated)
      }),

      // DELETE booking (hard delete)
      http.delete('*/rest/v1/bookings', ({ request }) => {
        const url = new URL(request.url)
        const filters = parseFilters(url)
        const toDelete = applyFilters(bookingsStore, filters)
        bookingsStore = bookingsStore.filter((booking) => !toDelete.includes(booking))
        return HttpResponse.json(null, { status: 204 })
      }),
    ]

    // ===== CUSTOMERS HANDLERS =====
    const customerHandlers = [
      // GET customers
      http.get('*/rest/v1/customers', ({ request }) => {
        const url = new URL(request.url)
        const filters = parseFilters(url)
        const result = applyFilters(customersStore, filters)
        return HttpResponse.json(result)
      }),

      // POST customer (create)
      http.post('*/rest/v1/customers', async ({ request }) => {
        const body = (await request.json()) as any
        const newCustomer = {
          id: `customer-${Date.now()}`,
          ...body,
          total_bookings: 0,
          total_spent: 0,
          last_booking_date: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          deleted_by: null,
        }
        customersStore.push(newCustomer)
        return HttpResponse.json(newCustomer, { status: 201 })
      }),

      // PATCH customer (update)
      http.patch('*/rest/v1/customers', async ({ request }) => {
        const url = new URL(request.url)
        const filters = parseFilters(url)
        const body = (await request.json()) as any

        customersStore = customersStore.map((customer) => {
          const matches = applyFilters([customer], filters).length > 0
          if (matches) {
            return { ...customer, ...body, updated_at: new Date().toISOString() }
          }
          return customer
        })

        const updated = applyFilters(customersStore, filters)
        return HttpResponse.json(updated)
      }),

      // DELETE customer (hard delete)
      http.delete('*/rest/v1/customers', ({ request }) => {
        const url = new URL(request.url)
        const filters = parseFilters(url)
        const toDelete = applyFilters(customersStore, filters)
        customersStore = customersStore.filter((customer) => !toDelete.includes(customer))
        return HttpResponse.json(null, { status: 204 })
      }),
    ]

    // ===== TEAMS HANDLERS =====
    const teamHandlers = [
      // GET teams
      http.get('*/rest/v1/teams', ({ request }) => {
        const url = new URL(request.url)
        const filters = parseFilters(url)
        const result = applyFilters(teamsStore, filters)
        return HttpResponse.json(result)
      }),

      // POST team (create)
      http.post('*/rest/v1/teams', async ({ request }) => {
        const body = (await request.json()) as any
        const newTeam = {
          id: `team-${Date.now()}`,
          ...body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          deleted_by: null,
        }
        teamsStore.push(newTeam)
        return HttpResponse.json(newTeam, { status: 201 })
      }),

      // PATCH team (update)
      http.patch('*/rest/v1/teams', async ({ request }) => {
        const url = new URL(request.url)
        const filters = parseFilters(url)
        const body = (await request.json()) as any

        teamsStore = teamsStore.map((team) => {
          const matches = applyFilters([team], filters).length > 0
          if (matches) {
            return { ...team, ...body, updated_at: new Date().toISOString() }
          }
          return team
        })

        const updated = applyFilters(teamsStore, filters)
        return HttpResponse.json(updated)
      }),

      // DELETE team (hard delete)
      http.delete('*/rest/v1/teams', ({ request }) => {
        const url = new URL(request.url)
        const filters = parseFilters(url)
        const toDelete = applyFilters(teamsStore, filters)
        teamsStore = teamsStore.filter((team) => !toDelete.includes(team))
        return HttpResponse.json(null, { status: 204 })
      }),

      // GET team_members
      http.get('*/rest/v1/team_members', ({ request }) => {
        const url = new URL(request.url)
        const filters = parseFilters(url)
        const result = applyFilters(teamMembersStore, filters)
        return HttpResponse.json(result)
      }),

      // POST team_member (create)
      http.post('*/rest/v1/team_members', async ({ request }) => {
        const body = (await request.json()) as any
        teamMembersStore.push(body)
        return HttpResponse.json(body, { status: 201 })
      }),

      // DELETE team_member
      http.delete('*/rest/v1/team_members', ({ request }) => {
        const url = new URL(request.url)
        const filters = parseFilters(url)
        const toDelete = applyFilters(teamMembersStore, filters)
        teamMembersStore = teamMembersStore.filter((tm) => !toDelete.includes(tm))
        return HttpResponse.json(null, { status: 204 })
      }),
    ]

    // ===== MESSAGES HANDLERS (Chat) =====
    const messageHandlers = [
      // GET messages
      http.get('*/rest/v1/messages', ({ request }) => {
        const url = new URL(request.url)
        const filters = parseFilters(url)
        const result = applyFilters(messagesStore, filters)
        return HttpResponse.json(result)
      }),

      // POST message (send)
      http.post('*/rest/v1/messages', async ({ request }) => {
        const body = (await request.json()) as any
        const newMessage = {
          id: `message-${Date.now()}`,
          ...body,
          created_at: new Date().toISOString(),
          is_read: false,
        }
        messagesStore.push(newMessage)
        return HttpResponse.json(newMessage, { status: 201 })
      }),

      // PATCH message (mark as read)
      http.patch('*/rest/v1/messages', async ({ request }) => {
        const url = new URL(request.url)
        const filters = parseFilters(url)
        const body = (await request.json()) as any

        messagesStore = messagesStore.map((message) => {
          const matches = applyFilters([message], filters).length > 0
          if (matches) {
            return { ...message, ...body }
          }
          return message
        })

        const updated = applyFilters(messagesStore, filters)
        return HttpResponse.json(updated)
      }),
    ]

    // Start MSW worker with all handlers
    const worker = setupWorker(
      ...authHandlers,
      ...bookingHandlers,
      ...customerHandlers,
      ...teamHandlers,
      ...messageHandlers
    )
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true,
    })

    // Store worker reference globally
    ;(window as any).__MSW_WORKER__ = worker
  })
}

/**
 * Extended test fixture with MSW initialization
 *
 * Automatically initializes MSW before each test.
 */
export const test = base.extend<{ mswPage: Page }>({
  mswPage: async ({ page }, use) => {
    // Initialize MSW in browser before test
    await initializeMSW(page)

    // Provide page to test
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page)

    // Cleanup (if needed)
    await page.evaluate(() => {
      const worker = (window as any).__MSW_WORKER__
      if (worker) {
        worker.stop()
      }
    })
  },
})

/**
 * Export expect from base Playwright
 */
export { expect } from '@playwright/test'
