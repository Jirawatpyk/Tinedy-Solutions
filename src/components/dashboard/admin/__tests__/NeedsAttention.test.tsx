import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NeedsAttention } from '../NeedsAttention'
import type { TodayBooking } from '@/types/dashboard'

// Mock getBangkokNowHHMM so we can control "current time" in tests
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    getBangkokNowHHMM: vi.fn(() => '09:00'),
  }
})

const { getBangkokNowHHMM } = await import('@/lib/utils')

function makeBooking(overrides: Partial<TodayBooking> = {}): TodayBooking {
  return {
    id: crypto.randomUUID(),
    booking_date: '2026-02-21',
    start_time: '10:00:00',
    end_time: '12:00:00',
    status: 'confirmed',
    total_price: 1000,
    address: '123 Test St',
    city: 'Bangkok',
    state: 'Bangkok',
    zip_code: '10110',
    staff_id: null,
    team_id: null,
    notes: null,
    payment_status: 'unpaid',
    customers: { id: 'c1', full_name: 'Test User', phone: '0800000000', email: 'test@test.com' },
    service_packages: null,
    profiles: null,
    teams: null,
    ...overrides,
  }
}

describe('NeedsAttention', () => {
  const onFilterSelect = vi.fn()

  beforeEach(() => {
    vi.mocked(getBangkokNowHHMM).mockReturnValue('09:00')
    onFilterSelect.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('empty state', () => {
    it('shows "All clear!" when no bookings need attention', () => {
      const bookings = [makeBooking({ status: 'confirmed', payment_status: 'paid', start_time: '15:00:00' })]
      render(<NeedsAttention todayBookings={bookings} onFilterSelect={onFilterSelect} activeFilter={null} />)
      expect(screen.getByText('All clear!')).toBeInTheDocument()
    })

    it('shows "All clear!" when todayBookings is empty', () => {
      render(<NeedsAttention todayBookings={[]} onFilterSelect={onFilterSelect} activeFilter={null} />)
      expect(screen.getByText('All clear!')).toBeInTheDocument()
    })
  })

  describe('pending category', () => {
    it('shows pending count when bookings exist', () => {
      const bookings = [
        makeBooking({ status: 'pending' }),
        makeBooking({ status: 'pending' }),
        makeBooking({ status: 'confirmed' }),
      ]
      render(<NeedsAttention todayBookings={bookings} onFilterSelect={onFilterSelect} activeFilter={null} />)
      expect(screen.getByText('2 pending bookings')).toBeInTheDocument()
    })

    it('uses singular for 1 pending booking', () => {
      const bookings = [makeBooking({ status: 'pending' })]
      render(<NeedsAttention todayBookings={bookings} onFilterSelect={onFilterSelect} activeFilter={null} />)
      expect(screen.getByText('1 pending booking')).toBeInTheDocument()
    })
  })

  describe('unverified category', () => {
    it('shows unverified count', () => {
      const bookings = [
        makeBooking({ payment_status: 'pending_verification' }),
        makeBooking({ payment_status: 'pending_verification' }),
      ]
      render(<NeedsAttention todayBookings={bookings} onFilterSelect={onFilterSelect} activeFilter={null} />)
      expect(screen.getByText('2 unverified payments')).toBeInTheDocument()
    })

    it('uses singular for 1 unverified payment', () => {
      const bookings = [makeBooking({ payment_status: 'pending_verification' })]
      render(<NeedsAttention todayBookings={bookings} onFilterSelect={onFilterSelect} activeFilter={null} />)
      expect(screen.getByText('1 unverified payment')).toBeInTheDocument()
    })

    it('handles undefined payment_status safely', () => {
      const booking = makeBooking()
      delete (booking as Partial<TodayBooking>).payment_status
      // Include a pending booking to ensure hasAnyIssue=true so all rows render
      const pendingBooking = makeBooking({ status: 'pending' })
      render(<NeedsAttention todayBookings={[booking, pendingBooking]} onFilterSelect={onFilterSelect} activeFilter={null} />)
      // undefined payment_status should NOT count as pending_verification → still 0
      expect(screen.getByText('0 unverified payments')).toBeInTheDocument()
    })
  })

  describe('starting soon category', () => {
    it('shows bookings starting within 60 minutes', () => {
      // Now = 09:00, start_time = 09:59 → diff = 59 min → show
      vi.mocked(getBangkokNowHHMM).mockReturnValue('09:00')
      const bookings = [makeBooking({ start_time: '09:59:00' })]
      render(<NeedsAttention todayBookings={bookings} onFilterSelect={onFilterSelect} activeFilter={null} />)
      expect(screen.getByText('1 starting soon')).toBeInTheDocument()
    })

    it('includes bookings starting in exactly 60 minutes (inclusive boundary)', () => {
      // Now = 09:00, start_time = 10:00 → diff = 60 min → show
      vi.mocked(getBangkokNowHHMM).mockReturnValue('09:00')
      const bookings = [makeBooking({ start_time: '10:00:00' })]
      render(<NeedsAttention todayBookings={bookings} onFilterSelect={onFilterSelect} activeFilter={null} />)
      expect(screen.getByText('1 starting soon')).toBeInTheDocument()
    })

    it('excludes bookings starting in 61 minutes (shows All clear)', () => {
      // Now = 09:00, start_time = 10:01 → diff = 61 min → not starting_soon → All clear!
      vi.mocked(getBangkokNowHHMM).mockReturnValue('09:00')
      const bookings = [makeBooking({ start_time: '10:01:00' })]
      render(<NeedsAttention todayBookings={bookings} onFilterSelect={onFilterSelect} activeFilter={null} />)
      expect(screen.getByText('All clear!')).toBeInTheDocument()
    })

    it('excludes bookings already started (shows All clear)', () => {
      // Now = 09:00, start_time = 08:30 → diff = -30 min → past → not starting_soon → All clear!
      vi.mocked(getBangkokNowHHMM).mockReturnValue('09:00')
      const bookings = [makeBooking({ start_time: '08:30:00' })]
      render(<NeedsAttention todayBookings={bookings} onFilterSelect={onFilterSelect} activeFilter={null} />)
      expect(screen.getByText('All clear!')).toBeInTheDocument()
    })
  })

  describe('click handlers', () => {
    it('calls onFilterSelect with filter key when row clicked', async () => {
      const user = userEvent.setup()
      const bookings = [makeBooking({ status: 'pending' })]
      render(<NeedsAttention todayBookings={bookings} onFilterSelect={onFilterSelect} activeFilter={null} />)

      await user.click(screen.getByText('1 pending booking'))
      expect(onFilterSelect).toHaveBeenCalledWith('pending')
    })

    it('calls onFilterSelect(null) when clicking active filter (toggle off)', async () => {
      const user = userEvent.setup()
      const bookings = [makeBooking({ status: 'pending' })]
      render(<NeedsAttention todayBookings={bookings} onFilterSelect={onFilterSelect} activeFilter="pending" />)

      await user.click(screen.getByText('1 pending booking'))
      expect(onFilterSelect).toHaveBeenCalledWith(null)
    })

    it('does not call onFilterSelect when clicking a zero-count row', async () => {
      const user = userEvent.setup()
      // Only pending has count, unverified = 0
      const bookings = [makeBooking({ status: 'pending' })]
      render(<NeedsAttention todayBookings={bookings} onFilterSelect={onFilterSelect} activeFilter={null} />)

      await user.click(screen.getByText('0 unverified payments'))
      expect(onFilterSelect).not.toHaveBeenCalled()
    })
  })
})
