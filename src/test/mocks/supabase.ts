/**
 * Supabase Client Mocks
 *
 * This module provides mock implementations of Supabase client methods
 * for testing. These mocks prevent real database calls during tests
 * and allow controlled testing of different scenarios.
 *
 * @module test/mocks/supabase
 */

import { vi } from 'vitest'

/**
 * Creates a mock Supabase query builder with chainable methods
 *
 * This mock supports the fluent API pattern used by Supabase:
 * supabase.from('table').select('*').eq('id', '123').single()
 *
 * @param data - The data to return from the query
 * @param error - Optional error to simulate query failures
 * @returns A mock query builder with chainable methods
 */
export const createMockSupabaseQuery = <T = unknown>(data: T[] | T | null = [], error: unknown = null) => {
  const isSingleItem = !Array.isArray(data)
  const queryData = isSingleItem ? [data] : data

  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    rangeGt: vi.fn().mockReturnThis(),
    rangeGte: vi.fn().mockReturnThis(),
    rangeLt: vi.fn().mockReturnThis(),
    rangeLte: vi.fn().mockReturnThis(),
    rangeAdjacent: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: isSingleItem ? data : (queryData as T[])?.[0] ?? null,
      error,
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: isSingleItem ? data : (queryData as T[])?.[0] ?? null,
      error,
    }),
    csv: vi.fn().mockResolvedValue({ data: queryData, error }),
    geojson: vi.fn().mockResolvedValue({ data: queryData, error }),
    explain: vi.fn().mockResolvedValue({ data: queryData, error }),
    then: vi.fn((resolve) =>
      Promise.resolve({ data: queryData, error }).then(resolve)
    ),
  }

  return mockQuery
}

/**
 * Creates a mock Supabase client for testing
 *
 * Provides mock implementations of all commonly used Supabase client methods.
 *
 * @param options - Configuration for the mock client
 * @returns A mock Supabase client
 */
export const createMockSupabaseClient = (options: {
  fromData?: unknown
  fromError?: unknown
  authUser?: unknown
  authSession?: unknown
} = {}) => {
  const {
    fromData = [],
    fromError = null,
    authUser = null,
    authSession = null,
  } = options

  const mockClient = {
    from: vi.fn().mockReturnValue(createMockSupabaseQuery(fromData, fromError)),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: authSession },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: authUser },
        error: null,
      }),
      signIn: vi.fn().mockResolvedValue({
        data: { user: authUser, session: authSession },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: authUser, session: authSession },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: authUser, session: authSession },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: vi.fn().mockResolvedValue({
        data: { user: authUser },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/test.jpg' },
        }),
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn().mockResolvedValue({ status: 'ok', error: null }),
    }),
  }

  return mockClient
}

/**
 * Creates a mock for Supabase realtime subscriptions
 *
 * @returns A mock subscription object
 */
export const createMockSubscription = () => ({
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  on: vi.fn().mockReturnThis(),
})

/**
 * Mock Supabase error for testing error scenarios
 *
 * @param message - Error message
 * @param code - Error code
 * @returns A mock Supabase error object
 */
export const createMockSupabaseError = (message = 'Mock error', code = 'MOCK_ERROR') => ({
  message,
  code,
  details: '',
  hint: '',
})

/**
 * Helper to create a mock successful response
 *
 * @param data - The data to return
 * @returns A mock response object
 */
export const mockSuccessResponse = <T>(data: T) => ({
  data,
  error: null,
  count: Array.isArray(data) ? data.length : null,
  status: 200,
  statusText: 'OK',
})

/**
 * Helper to create a mock error response
 *
 * @param message - Error message
 * @param code - Error code
 * @returns A mock error response object
 */
export const mockErrorResponse = (message = 'Mock error', code = 'MOCK_ERROR') => ({
  data: null,
  error: createMockSupabaseError(message, code),
  count: null,
  status: 400,
  statusText: 'Bad Request',
})
