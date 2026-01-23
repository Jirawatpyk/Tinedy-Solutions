/**
 * MSW Setup Verification Tests
 *
 * This test file verifies that MSW (Mock Service Worker) is properly configured
 * and can intercept HTTP requests during tests.
 *
 * Story: 3.1 - Setup MSW for API Mocking
 * Coverage: Acceptance Criteria #1, #2, #3
 */

import { describe, it, expect } from 'vitest'
import { server } from '../server'
import { http, HttpResponse } from 'msw'

describe('MSW Setup', () => {
  it('should intercept HTTP requests and return mocked responses', async () => {
    // AC #1, #2: MSW intercepts requests and returns mocked responses

    // Setup temporary handler for this test
    server.use(
      http.get('https://example.com/test', () => {
        return HttpResponse.json({ mocked: true, message: 'MSW is working!' })
      })
    )

    // Make HTTP request
    const response = await fetch('https://example.com/test')
    const data = await response.json()

    // Verify that MSW intercepted and returned mocked data
    expect(response.ok).toBe(true)
    expect(data).toEqual({ mocked: true, message: 'MSW is working!' })
  })

  it('should reset handlers between tests', async () => {
    // AC #3: Handler reset works (no real network calls)

    // This test should NOT see the handler from previous test
    // The handler was reset by afterEach() in setup.ts

    // Attempting to fetch without a handler should throw an error
    // because we configured onUnhandledRequest: 'error' in setup.ts
    await expect(
      fetch('https://example.com/test')
    ).rejects.toThrow()
  })

  it('should allow test-specific handlers with server.use()', async () => {
    // AC #1, #2: Test-specific handlers work correctly

    // Add a different handler just for this test
    server.use(
      http.get('https://api.example.com/users', () => {
        return HttpResponse.json([
          { id: 1, name: 'Test User 1' },
          { id: 2, name: 'Test User 2' },
        ])
      })
    )

    const response = await fetch('https://api.example.com/users')
    const users = await response.json()

    expect(response.ok).toBe(true)
    expect(users).toHaveLength(2)
    expect(users[0].name).toBe('Test User 1')
  })

  it('should support different HTTP methods', async () => {
    // Verify MSW can handle POST, PATCH, DELETE (for future Supabase mocking)

    // POST
    server.use(
      http.post('https://api.example.com/items', async ({ request }) => {
        const body = await request.json() as Record<string, unknown>
        return HttpResponse.json({ id: 123, ...body }, { status: 201 })
      })
    )

    const postResponse = await fetch('https://api.example.com/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Item' }),
    })
    const postData = await postResponse.json()

    expect(postResponse.status).toBe(201)
    expect(postData.name).toBe('New Item')

    // PATCH
    server.use(
      http.patch('https://api.example.com/items/123', () => {
        return HttpResponse.json({ id: 123, name: 'Updated Item' })
      })
    )

    const patchResponse = await fetch('https://api.example.com/items/123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Item' }),
    })
    const patchData = await patchResponse.json()

    expect(patchResponse.ok).toBe(true)
    expect(patchData.name).toBe('Updated Item')

    // DELETE
    server.use(
      http.delete('https://api.example.com/items/123', () => {
        return HttpResponse.json({ success: true }, { status: 200 })
      })
    )

    const deleteResponse = await fetch('https://api.example.com/items/123', {
      method: 'DELETE',
    })
    const deleteData = await deleteResponse.json()

    expect(deleteResponse.ok).toBe(true)
    expect(deleteData.success).toBe(true)
  })

  it('should support wildcard URL patterns (for Supabase)', async () => {
    // Test wildcard patterns that will be used for Supabase URLs in Story 3.2

    server.use(
      http.get('*/rest/v1/bookings*', () => {
        return HttpResponse.json([
          { id: '1', status: 'pending' },
          { id: '2', status: 'completed' },
        ])
      })
    )

    // Simulate Supabase-like URL
    const response = await fetch('https://abc123.supabase.co/rest/v1/bookings?select=*')
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data).toHaveLength(2)
    expect(data[0].status).toBe('pending')
  })
})
