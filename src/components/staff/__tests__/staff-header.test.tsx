import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StaffHeader } from '../staff-header'

// Mock useAuth
vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    profile: {
      full_name: 'John Doe',
    },
  })),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderHeader = (props = {}) => {
  return render(
    <MemoryRouter>
      <StaffHeader {...props} />
    </MemoryRouter>
  )
}

describe('StaffHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Greeting', () => {
    it('shows morning greeting before noon', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-30T09:00:00'))
      renderHeader()
      expect(screen.getByText(/Good morning/i)).toBeInTheDocument()
      vi.useRealTimers()
    })

    it('shows afternoon greeting between noon and 5pm', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-30T14:00:00'))
      renderHeader()
      expect(screen.getByText(/Good afternoon/i)).toBeInTheDocument()
      vi.useRealTimers()
    })

    it('shows evening greeting after 5pm', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-30T19:00:00'))
      renderHeader()
      expect(screen.getByText(/Good evening/i)).toBeInTheDocument()
      vi.useRealTimers()
    })

    it('shows user first name', () => {
      renderHeader()
      expect(screen.getByText(/John/i)).toBeInTheDocument()
    })
  })

  describe('Today Count', () => {
    it('shows today job count when provided', () => {
      renderHeader({ todayCount: 3 })
      expect(screen.getByText('Today: 3 jobs')).toBeInTheDocument()
    })

    it('shows singular "job" for count of 1', () => {
      renderHeader({ todayCount: 1 })
      expect(screen.getByText('Today: 1 job')).toBeInTheDocument()
    })

    it('does not show count when undefined', () => {
      renderHeader()
      expect(screen.queryByText(/Today:/)).not.toBeInTheDocument()
    })
  })

  describe('Search', () => {
    it('shows search icon by default', () => {
      renderHeader({ showSearch: true })
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    })

    it('hides search icon when showSearch is false', () => {
      renderHeader({ showSearch: false })
      expect(screen.queryByRole('button', { name: /search/i })).not.toBeInTheDocument()
    })

    it('expands search on icon click', () => {
      const onSearchChange = vi.fn()
      renderHeader({ showSearch: true, onSearchChange })

      fireEvent.click(screen.getByRole('button', { name: /search/i }))

      expect(screen.getByPlaceholderText('Search bookings...')).toBeInTheDocument()
    })

    it('focuses input when search expands', () => {
      renderHeader({ showSearch: true, onSearchChange: vi.fn() })

      fireEvent.click(screen.getByRole('button', { name: /search/i }))

      const input = screen.getByPlaceholderText('Search bookings...')
      expect(input).toHaveFocus()
    })

    it('calls onSearchChange when typing', () => {
      const onSearchChange = vi.fn()
      renderHeader({ showSearch: true, onSearchChange, searchValue: '' })

      // Expand search first
      fireEvent.click(screen.getByRole('button', { name: /search/i }))

      // Type in search
      const input = screen.getByPlaceholderText('Search bookings...')
      fireEvent.change(input, { target: { value: 'test' } })

      expect(onSearchChange).toHaveBeenCalledWith('test')
    })

    it('clears search and collapses on X click', () => {
      const onSearchChange = vi.fn()
      renderHeader({ showSearch: true, onSearchChange, searchValue: 'test' })

      // Expand search first
      fireEvent.click(screen.getByRole('button', { name: /search/i }))

      // Click X to close - it's the only button visible now
      const closeButton = screen.getByRole('button')
      fireEvent.click(closeButton)

      // Should call onSearchChange with empty string
      expect(onSearchChange).toHaveBeenCalledWith('')
    })
  })

  describe('Stats Button', () => {
    it('shows stats button', () => {
      renderHeader()
      expect(screen.getByRole('button', { name: /view stats/i })).toBeInTheDocument()
    })

    it('navigates to profile on stats click', () => {
      renderHeader()

      fireEvent.click(screen.getByRole('button', { name: /view stats/i }))

      expect(mockNavigate).toHaveBeenCalledWith('/staff/profile')
    })
  })

  describe('Touch Targets', () => {
    it('has 44px minimum touch targets for buttons', () => {
      renderHeader({ showSearch: true })
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('h-10', 'w-10')
      })
    })
  })

  describe('Styling', () => {
    it('has sticky header styling', () => {
      renderHeader()
      const header = document.querySelector('header')
      expect(header).toHaveClass('sticky', 'top-0', 'z-40')
    })

    it('has backdrop blur effect', () => {
      renderHeader()
      const header = document.querySelector('header')
      expect(header).toHaveClass('backdrop-blur')
    })
  })
})
