import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup, waitFor } from '@testing-library/react'

// Mock supabase
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockRange = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => {
      mockFrom(...args)
      return { select: mockSelect }
    },
  },
}))

vi.mock('@/lib/error-utils', () => ({
  getErrorMessage: (err: unknown) => (err as Error)?.message || 'Unknown error',
}))

import { useEmailLogs } from '../use-email-logs'

const mockLogs = [
  {
    id: 'log-1',
    booking_id: 'booking-1',
    email_type: 'booking_reminder',
    recipient_email: 'customer@example.com',
    recipient_name: 'Test Customer',
    status: 'sent',
    subject: 'Reminder',
    error_message: null,
    attempts: 1,
    max_attempts: 3,
    scheduled_at: null,
    sent_at: '2026-02-22T10:00:00Z',
    created_at: '2026-02-22T09:00:00Z',
    updated_at: '2026-02-22T10:00:00Z',
  },
  {
    id: 'log-2',
    booking_id: 'booking-2',
    email_type: 'booking_confirmation',
    recipient_email: 'customer2@example.com',
    recipient_name: 'Customer 2',
    status: 'failed',
    subject: 'Payment',
    error_message: 'SMTP error',
    attempts: 3,
    max_attempts: 3,
    scheduled_at: null,
    sent_at: null,
    created_at: '2026-02-21T08:00:00Z',
    updated_at: '2026-02-21T09:00:00Z',
  },
]

function setupMockChain(data: unknown[] | null, count: number, error: unknown = null) {
  mockRange.mockResolvedValue({ data, count, error })
  mockOrder.mockReturnValue({ range: mockRange })
  mockEq.mockReturnValue({ order: mockOrder, eq: mockEq })
  mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, not: vi.fn().mockReturnValue({ order: mockOrder }) })
}

describe('useEmailLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('should fetch email logs successfully', async () => {
    setupMockChain(mockLogs, 2)

    const { result } = renderHook(() => useEmailLogs())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.logs).toHaveLength(2)
    expect(result.current.totalCount).toBe(2)
    expect(result.current.error).toBeNull()
  })

  it('should return empty array when no logs', async () => {
    setupMockChain([], 0)

    const { result } = renderHook(() => useEmailLogs())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.logs).toHaveLength(0)
    expect(result.current.totalCount).toBe(0)
  })

  it('should handle fetch error', async () => {
    setupMockChain(null, 0, { message: 'Database error' })

    const { result } = renderHook(() => useEmailLogs())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.logs).toHaveLength(0)
  })

  it('should calculate totalPages correctly', async () => {
    setupMockChain(mockLogs, 45)

    const { result } = renderHook(() => useEmailLogs({ pageSize: 20 }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.totalPages).toBe(3) // ceil(45/20) = 3
  })

  it('should refetch on refresh', async () => {
    setupMockChain(mockLogs, 2)

    const { result } = renderHook(() => useEmailLogs())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.refresh()
    })

    // select should have been called twice (initial + refresh)
    expect(mockSelect).toHaveBeenCalledTimes(2)
  })

  it('should query email_queue table', async () => {
    setupMockChain(mockLogs, 2)

    renderHook(() => useEmailLogs())

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('email_queue')
    })
  })

  it('should apply status filter when provided', async () => {
    setupMockChain(mockLogs, 1)

    renderHook(() => useEmailLogs({ status: 'sent' }))

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('status', 'sent')
    })
  })

  it('should apply email type filter when provided', async () => {
    setupMockChain(mockLogs, 1)

    renderHook(() => useEmailLogs({ emailType: 'booking_reminder' }))

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('email_type', 'booking_reminder')
    })
  })

  it('should not apply status filter when "all"', async () => {
    setupMockChain(mockLogs, 2)

    renderHook(() => useEmailLogs({ status: 'all' }))

    await waitFor(() => {
      expect(mockEq).not.toHaveBeenCalledWith('status', 'all')
    })
  })

  it('should start with loading true', () => {
    setupMockChain(mockLogs, 2)

    const { result } = renderHook(() => useEmailLogs())

    expect(result.current.loading).toBe(true)
  })
})
