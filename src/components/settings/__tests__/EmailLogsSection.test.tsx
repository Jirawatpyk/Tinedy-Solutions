import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock useEmailLogs hook
const mockRefresh = vi.fn()
const mockUseEmailLogs = vi.fn()

vi.mock('@/hooks/use-email-logs', () => ({
  useEmailLogs: (...args: unknown[]) => mockUseEmailLogs(...args),
}))

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    formatDateTime: (date: string) => date,
  }
})

vi.mock('@/constants/email-types', () => ({
  EMAIL_TYPES: {
    BOOKING_REMINDER: 'booking_reminder',
    BOOKING_CONFIRMATION: 'booking_confirmation',
    RECURRING_BOOKING_CONFIRMATION: 'recurring_booking_confirmation',
    PAYMENT_CONFIRMATION: 'payment_confirmation',
    REFUND_CONFIRMATION: 'refund_confirmation',
  },
}))

import { EmailLogsSection } from '../EmailLogsSection'

describe('EmailLogsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading skeletons when loading', () => {
    mockUseEmailLogs.mockReturnValue({
      logs: [],
      loading: true,
      error: null,
      totalCount: 0,
      totalPages: 0,
      refresh: mockRefresh,
    })

    render(<EmailLogsSection />)

    expect(screen.getByText('Email Logs')).toBeInTheDocument()
    expect(screen.getByText('Refresh')).toBeInTheDocument()
  })

  it('should render empty state when no logs', () => {
    mockUseEmailLogs.mockReturnValue({
      logs: [],
      loading: false,
      error: null,
      totalCount: 0,
      totalPages: 0,
      refresh: mockRefresh,
    })

    render(<EmailLogsSection />)

    expect(screen.getByText('No email logs found')).toBeInTheDocument()
  })

  it('should render error message when error occurs and not loading', () => {
    mockUseEmailLogs.mockReturnValue({
      logs: [],
      loading: false,
      error: 'Database connection failed',
      totalCount: 0,
      totalPages: 0,
      refresh: mockRefresh,
    })

    render(<EmailLogsSection />)

    expect(screen.getByText('Database connection failed')).toBeInTheDocument()
  })

  it('should NOT render error when loading (L-6 fix)', () => {
    mockUseEmailLogs.mockReturnValue({
      logs: [],
      loading: true,
      error: 'Previous error',
      totalCount: 0,
      totalPages: 0,
      refresh: mockRefresh,
    })

    render(<EmailLogsSection />)

    expect(screen.queryByText('Previous error')).not.toBeInTheDocument()
  })

  it('should render log entries as table rows', () => {
    mockUseEmailLogs.mockReturnValue({
      logs: [
        {
          id: 'log-1',
          booking_id: 'b-1',
          email_type: 'booking_reminder',
          recipient_email: 'test@example.com',
          recipient_name: 'Test User',
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
      ],
      loading: false,
      error: null,
      totalCount: 1,
      totalPages: 1,
      refresh: mockRefresh,
    })

    render(<EmailLogsSection />)

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    // 'Booking Reminder' appears in both the filter dropdown and the table row
    const reminderElements = screen.getAllByText('Booking Reminder')
    expect(reminderElements.length).toBeGreaterThanOrEqual(1)
    // 'Sent' appears in both status badge in table and filter dropdown
    const sentElements = screen.getAllByText('Sent')
    expect(sentElements.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })

  it('should render failed status badge with error message', () => {
    mockUseEmailLogs.mockReturnValue({
      logs: [
        {
          id: 'log-2',
          booking_id: 'b-2',
          email_type: 'booking_confirmation',
          recipient_email: 'fail@example.com',
          recipient_name: 'Fail User',
          status: 'failed',
          subject: 'Booking Confirmed',
          error_message: 'SMTP error',
          attempts: 3,
          max_attempts: 3,
          scheduled_at: null,
          sent_at: null,
          created_at: '2026-02-21T08:00:00Z',
          updated_at: '2026-02-21T09:00:00Z',
        },
      ],
      loading: false,
      error: null,
      totalCount: 1,
      totalPages: 1,
      refresh: mockRefresh,
    })

    render(<EmailLogsSection />)

    // 'Failed' appears in both the status badge and the filter dropdown
    const failedElements = screen.getAllByText('Failed')
    expect(failedElements.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('SMTP error')).toBeInTheDocument()
  })

  it('should pass filter params to useEmailLogs', () => {
    mockUseEmailLogs.mockReturnValue({
      logs: [],
      loading: false,
      error: null,
      totalCount: 0,
      totalPages: 0,
      refresh: mockRefresh,
    })

    render(<EmailLogsSection />)

    // Default call should have 'all' status and 'all' emailType
    expect(mockUseEmailLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'all',
        emailType: 'all',
        page: 1,
        pageSize: 20,
      })
    )
  })

  it('should not show pagination when only 1 page', () => {
    mockUseEmailLogs.mockReturnValue({
      logs: [
        {
          id: 'log-1',
          booking_id: 'b-1',
          email_type: 'booking_reminder',
          recipient_email: 'a@b.com',
          recipient_name: 'A',
          status: 'sent',
          subject: 'R',
          error_message: null,
          attempts: 1,
          max_attempts: 3,
          scheduled_at: null,
          sent_at: '2026-02-22T10:00:00Z',
          created_at: '2026-02-22T09:00:00Z',
          updated_at: '2026-02-22T10:00:00Z',
        },
      ],
      loading: false,
      error: null,
      totalCount: 1,
      totalPages: 1,
      refresh: mockRefresh,
    })

    render(<EmailLogsSection />)

    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument()
  })
})
