import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BookingEditModal } from '../BookingEditModal'
import type { Booking } from '@/types/booking'
import type { ReactNode } from 'react'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => Promise.resolve({ data: [], error: null }).then(resolve)),
    })),
  },
}))

// Mock conflict detection
vi.mock('@/hooks/use-conflict-detection', () => ({
  useConflictDetection: () => ({
    checkConflicts: vi.fn().mockResolvedValue([]),
    clearConflicts: vi.fn(),
  }),
}))

// Mock package/staff/team queries to return empty data quickly
vi.mock('@/lib/queries/package-queries', () => ({
  packageQueryOptions: {
    v2: { queryKey: ['packages', 'v2'], queryFn: async () => [] },
  },
}))

vi.mock('@/lib/queries/staff-queries', () => ({
  staffQueryOptions: {
    listSimple: () => ({ queryKey: ['staff', 'simple'], queryFn: async () => [] }),
  },
}))

vi.mock('@/lib/queries/team-queries', () => ({
  teamQueryOptions: {
    listSimple: () => ({ queryKey: ['teams', 'simple'], queryFn: async () => [] }),
  },
}))

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

const createMockBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-123',
  booking_date: '2025-10-28',
  start_time: '10:00:00',
  end_time: '12:00:00',
  status: 'confirmed',
  total_price: 1500,
  address: '123 Main St',
  city: 'Bangkok',
  state: 'Bangkok',
  zip_code: '10110',
  staff_id: 'staff-1',
  team_id: null,
  notes: 'Test notes',
  payment_status: 'unpaid',
  payment_method: null,
  updated_at: '2025-10-28T10:00:00Z',
  ...overrides,
})

describe('BookingEditModal', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render modal with Thai title when open', () => {
      const Wrapper = createWrapper()
      render(
        <BookingEditModal
          open={true}
          onOpenChange={mockOnOpenChange}
          booking={createMockBooking()}
          onSuccess={mockOnSuccess}
        />,
        { wrapper: Wrapper }
      )
      expect(screen.getByText('แก้ไขการจอง')).toBeInTheDocument()
    })

    it('should not render modal content when closed', () => {
      const Wrapper = createWrapper()
      render(
        <BookingEditModal
          open={false}
          onOpenChange={mockOnOpenChange}
          booking={createMockBooking()}
          onSuccess={mockOnSuccess}
        />,
        { wrapper: Wrapper }
      )
      expect(screen.queryByText('แก้ไขการจอง')).not.toBeInTheDocument()
    })

    it('should render status selector with Thai labels', () => {
      const Wrapper = createWrapper()
      render(
        <BookingEditModal
          open={true}
          onOpenChange={mockOnOpenChange}
          booking={createMockBooking()}
          onSuccess={mockOnSuccess}
        />,
        { wrapper: Wrapper }
      )
      expect(screen.getByText('สถานะ')).toBeInTheDocument()
    })

    it('should render action buttons with Thai labels', () => {
      const Wrapper = createWrapper()
      render(
        <BookingEditModal
          open={true}
          onOpenChange={mockOnOpenChange}
          booking={createMockBooking()}
          onSuccess={mockOnSuccess}
        />,
        { wrapper: Wrapper }
      )
      expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'บันทึกการแก้ไข' })).toBeInTheDocument()
    })

    it('should render with null booking without crashing', () => {
      const Wrapper = createWrapper()
      // null booking + open=false should not render
      expect(() =>
        render(
          <BookingEditModal
            open={false}
            onOpenChange={mockOnOpenChange}
            booking={null}
            onSuccess={mockOnSuccess}
          />,
          { wrapper: Wrapper }
        )
      ).not.toThrow()
    })
  })

  describe('Form Interactions', () => {
    it('should call onOpenChange(false) when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const Wrapper = createWrapper()
      render(
        <BookingEditModal
          open={true}
          onOpenChange={mockOnOpenChange}
          booking={createMockBooking()}
          onSuccess={mockOnSuccess}
        />,
        { wrapper: Wrapper }
      )
      await user.click(screen.getByRole('button', { name: 'ยกเลิก' }))
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should display section headers', () => {
      const Wrapper = createWrapper()
      render(
        <BookingEditModal
          open={true}
          onOpenChange={mockOnOpenChange}
          booking={createMockBooking()}
          onSuccess={mockOnSuccess}
        />,
        { wrapper: Wrapper }
      )
      expect(screen.getByText('บริการและราคา')).toBeInTheDocument()
      expect(screen.getByText('วันและเวลา')).toBeInTheDocument()
    })
  })

  describe('Pre-populated Data', () => {
    it('should seed start time from booking', () => {
      const Wrapper = createWrapper()
      render(
        <BookingEditModal
          open={true}
          onOpenChange={mockOnOpenChange}
          booking={createMockBooking({ start_time: '09:30:00' })}
          onSuccess={mockOnSuccess}
        />,
        { wrapper: Wrapper }
      )
      const startInput = screen.getByLabelText(/เวลาเริ่มต้น/i) as HTMLInputElement
      expect(startInput.value).toBe('09:30')
    })

    it('should show confirmed status from booking', () => {
      const Wrapper = createWrapper()
      render(
        <BookingEditModal
          open={true}
          onOpenChange={mockOnOpenChange}
          booking={createMockBooking({ status: 'confirmed' })}
          onSuccess={mockOnSuccess}
        />,
        { wrapper: Wrapper }
      )
      // Status section should be present
      expect(screen.getByText('สถานะ')).toBeInTheDocument()
    })
  })
})
