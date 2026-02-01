/**
 * MSW Handlers for Customers API
 *
 * Story: 3.2 - Create Mock Handlers for Core Entities
 *
 * This file provides MSW request handlers for mocking Supabase customers API.
 * Supports Supabase PostgREST query parameters and operations.
 */

import { http, HttpResponse } from 'msw'
import {
  mockCustomers,
  createMockCustomer,
  type MockCustomerRecord,
} from '../data/customers'

// In-memory storage for test mutations
let customersStore = [...mockCustomers]

/**
 * Reset customers store to initial state (for tests)
 */
export function resetCustomersStore() {
  customersStore = [...mockCustomers]
}

/**
 * Parse Supabase query parameters from URL
 */
function parseSupabaseQuery(url: URL) {
  const filters: Record<string, string> = {}

  // Note: 'select' parameter ignored - mock handlers return full objects
  url.searchParams.forEach((value, key) => {
    if (key !== 'select') {
      filters[key] = value
    }
  })

  return { filters }
}

/**
 * Apply Supabase filters to customers array
 */
function applyFilters(customers: MockCustomerRecord[], filters: Record<string, string>): MockCustomerRecord[] {
  let result = [...customers]

  Object.entries(filters).forEach(([key, value]) => {
    // Handle eq. operator
    if (value.startsWith('eq.')) {
      const filterValue = value.substring(3)
      result = result.filter((c) => String(c[key as keyof MockCustomerRecord]) === filterValue)
    }
    // Handle in. operator
    else if (value.startsWith('in.(') && value.endsWith(')')) {
      const values = value.substring(4, value.length - 1).split(',')
      result = result.filter((c) => values.includes(String(c[key as keyof MockCustomerRecord])))
    }
    // Handle is. operator
    else if (value.startsWith('is.')) {
      const isNull = value === 'is.null'
      result = result.filter((c) =>
        isNull ? c[key as keyof MockCustomerRecord] === null : c[key as keyof MockCustomerRecord] !== null
      )
    }
    // Handle gte. operator
    else if (value.startsWith('gte.')) {
      const filterValue = value.substring(4)
      result = result.filter((c) => String(c[key as keyof MockCustomerRecord]) >= filterValue)
    }
    // Handle lte. operator
    else if (value.startsWith('lte.')) {
      const filterValue = value.substring(4)
      result = result.filter((c) => String(c[key as keyof MockCustomerRecord]) <= filterValue)
    }
    // Handle ilike. operator (case-insensitive search)
    else if (value.startsWith('ilike.')) {
      const searchValue = value.substring(6).replace(/%/g, '').toLowerCase()
      result = result.filter((c) => {
        const fieldValue = String(c[key as keyof MockCustomerRecord]).toLowerCase()
        return fieldValue.includes(searchValue)
      })
    }
    // Handle cs. operator (contains - for array fields like tags)
    else if (value.startsWith('cs.')) {
      const arrayValue = value.substring(3)
      // Handle JSON array syntax: cs.{"tag1","tag2"}
      const tags = arrayValue.replace(/[{}"]/g, '').split(',')
      result = result.filter((c) => {
        const customerTags = c.tags || []
        return tags.some((tag) => customerTags.includes(tag))
      })
    }
  })

  return result
}

/**
 * GET /rest/v1/customers
 * Fetch customers with Supabase query parameters
 * Supports: filters, order, limit, offset, relationships
 */
export const getCustomersHandler = http.get('*/rest/v1/customers', ({ request }) => {
  const url = new URL(request.url)
  const { filters } = parseSupabaseQuery(url)
  const order = url.searchParams.get('order')
  const limit = url.searchParams.get('limit')
  const offset = url.searchParams.get('offset')

  // Apply filters
  let results = applyFilters(customersStore, filters)

  // Apply sorting if specified
  if (order) {
    const [field, direction] = order.split('.')
    const sortDirection = direction === 'desc' ? -1 : 1
    results = [...results].sort((a, b) => {
      const aVal = a[field as keyof MockCustomerRecord]
      const bVal = b[field as keyof MockCustomerRecord]
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1
      if (aVal < bVal) return -1 * sortDirection
      if (aVal > bVal) return 1 * sortDirection
      return 0
    })
  }

  // Apply pagination
  const offsetNum = offset ? parseInt(offset) : 0
  const limitNum = limit ? parseInt(limit) : undefined
  const totalCount = results.length
  const paginatedResults = limitNum ? results.slice(offsetNum, offsetNum + limitNum) : results.slice(offsetNum)

  // Return with Supabase headers
  return HttpResponse.json(paginatedResults, {
    headers: {
      'Content-Range': `0-${paginatedResults.length - 1}/${totalCount}`,
    },
  })
})

/**
 * POST /rest/v1/customers
 * Create a new customer
 */
export const createCustomerHandler = http.post('*/rest/v1/customers', async ({ request }) => {
  const body = (await request.json()) as Partial<MockCustomerRecord>

  // Validate required fields
  if (!body.name || !body.phone) {
    return HttpResponse.json(
      { error: 'Missing required fields (name, phone)', code: 'PGRST301' },
      { status: 400 }
    )
  }

  // Check for duplicate phone number (business rule)
  const existingCustomer = customersStore.find(
    (c) => c.phone === body.phone && c.deleted_at === null
  )
  if (existingCustomer) {
    return HttpResponse.json(
      { error: 'Customer with this phone number already exists', code: 'PGRST409' },
      { status: 409 }
    )
  }

  // Create new customer
  const newCustomer = createMockCustomer({
    ...body,
    id: `customer-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  customersStore.push(newCustomer)

  return HttpResponse.json([newCustomer], { status: 201 })
})

/**
 * PATCH /rest/v1/customers
 * Update customer(s) with query parameters
 */
export const updateCustomerHandler = http.patch('*/rest/v1/customers', async ({ request }) => {
  const url = new URL(request.url)
  const { filters } = parseSupabaseQuery(url)
  const updates = (await request.json()) as Partial<MockCustomerRecord>

  // Find customers to update
  const toUpdate = applyFilters(customersStore, filters)

  if (toUpdate.length === 0) {
    return HttpResponse.json([], { status: 200 })
  }

  // Apply updates
  const updatedCustomers = toUpdate.map((customer) => {
    const updated = {
      ...customer,
      ...updates,
      updated_at: new Date().toISOString(),
    }
    // Replace in store
    const index = customersStore.findIndex((c) => c.id === customer.id)
    if (index !== -1) {
      customersStore[index] = updated
    }
    return updated
  })

  return HttpResponse.json(updatedCustomers, { status: 200 })
})

/**
 * DELETE /rest/v1/customers
 * Delete (hard delete) customer(s) with query parameters
 */
export const deleteCustomerHandler = http.delete('*/rest/v1/customers', ({ request }) => {
  const url = new URL(request.url)
  const { filters } = parseSupabaseQuery(url)

  // Find customers to delete
  const toDelete = applyFilters(customersStore, filters)

  if (toDelete.length === 0) {
    return HttpResponse.json([], { status: 200 })
  }

  // Remove from store
  customersStore = customersStore.filter(
    (c) => !toDelete.some((d) => d.id === c.id)
  )

  return HttpResponse.json(toDelete, { status: 200 })
})

/**
 * All customer handlers
 */
export const customerHandlers = [
  getCustomersHandler,
  createCustomerHandler,
  updateCustomerHandler,
  deleteCustomerHandler,
]
