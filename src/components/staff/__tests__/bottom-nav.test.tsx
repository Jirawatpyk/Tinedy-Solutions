import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BottomNav } from '../bottom-nav'

// Mock useMediaQuery - we're testing BottomNav in isolation
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn(() => false),
}))

const renderWithRouter = (initialPath = '/staff') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
    </MemoryRouter>
  )
}

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders 4 navigation items', () => {
    renderWithRouter()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(4)
  })

  it('renders correct labels', () => {
    renderWithRouter()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('highlights Home when on /staff', () => {
    renderWithRouter('/staff')
    const homeLink = screen.getByRole('link', { name: /home/i })
    expect(homeLink).toHaveClass('text-primary')
  })

  it('highlights Calendar when on /staff/calendar', () => {
    renderWithRouter('/staff/calendar')
    const calendarLink = screen.getByRole('link', { name: /calendar/i })
    expect(calendarLink).toHaveClass('text-primary')
  })

  it('highlights Chat when on /staff/chat', () => {
    renderWithRouter('/staff/chat')
    const chatLink = screen.getByRole('link', { name: /chat/i })
    expect(chatLink).toHaveClass('text-primary')
  })

  it('highlights Profile when on /staff/profile', () => {
    renderWithRouter('/staff/profile')
    const profileLink = screen.getByRole('link', { name: /profile/i })
    expect(profileLink).toHaveClass('text-primary')
  })

  it('has 44px minimum touch targets', () => {
    renderWithRouter()
    const links = screen.getAllByRole('link')
    links.forEach((link) => {
      expect(link).toHaveClass('min-h-[44px]')
    })
  })

  it('has correct navigation role', () => {
    renderWithRouter()
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('aria-label', 'Main navigation')
  })

  it('sets aria-current on active route', () => {
    renderWithRouter('/staff')
    const homeLink = screen.getByRole('link', { name: /home/i })
    expect(homeLink).toHaveAttribute('aria-current', 'page')
  })

  it('has fixed position styling', () => {
    renderWithRouter()
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('fixed', 'bottom-0', 'z-40')
  })

  it('has safe-area-inset-bottom for iPhone notch', () => {
    renderWithRouter()
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('pb-[env(safe-area-inset-bottom)]')
  })

  it('renders icons with aria-hidden', () => {
    renderWithRouter()
    // Icons should be hidden from screen readers (decorative)
    const icons = document.querySelectorAll('[aria-hidden="true"]')
    expect(icons.length).toBe(4) // 4 nav items, each with an icon
  })
})
