import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { StaffLayout } from '../staff-layout'

// Mock useMediaQuery to control desktop/mobile behavior
const mockUseMediaQuery = vi.fn()
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => mockUseMediaQuery(),
}))

// Mock ErrorBoundary to simplify testing
vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock BottomNav
vi.mock('@/components/staff/bottom-nav', () => ({
  BottomNav: () => <nav data-testid="bottom-nav">Bottom Nav</nav>,
}))

// Mock MainLayout for desktop
vi.mock('@/components/layout/main-layout', () => ({
  MainLayout: () => <div data-testid="main-layout">MainLayout with Sidebar</div>,
}))

const renderLayout = (initialPath = '/staff') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/staff/*" element={<StaffLayout />}>
          <Route index element={<div data-testid="dashboard-content">Dashboard</div>} />
          <Route path="calendar" element={<div data-testid="calendar-content">Calendar</div>} />
          <Route path="chat" element={<div data-testid="chat-content">Chat</div>} />
          <Route path="profile" element={<div data-testid="profile-content">Profile</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('StaffLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Mobile View (< 1024px)', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(false) // isDesktop = false
    })

    it('renders bottom navigation on mobile', () => {
      renderLayout()
      expect(screen.getByTestId('bottom-nav')).toBeInTheDocument()
    })

    it('does not render MainLayout on mobile', () => {
      renderLayout()
      expect(screen.queryByTestId('main-layout')).not.toBeInTheDocument()
    })

    it('renders page content via Outlet', () => {
      renderLayout()
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()
    })

    it('applies bottom padding for nav on mobile', () => {
      renderLayout()
      const main = document.querySelector('main')
      expect(main).toHaveClass('pb-20')
    })
  })

  describe('Desktop View (>= 1024px)', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(true) // isDesktop = true
    })

    it('renders MainLayout on desktop', () => {
      renderLayout()
      expect(screen.getByTestId('main-layout')).toBeInTheDocument()
    })

    it('does not render bottom navigation on desktop', () => {
      renderLayout()
      expect(screen.queryByTestId('bottom-nav')).not.toBeInTheDocument()
    })

    it('does not render mobile layout container on desktop', () => {
      renderLayout()
      // Mobile layout has its own main element, MainLayout has different structure
      const mobileContainer = document.querySelector('.min-h-screen.bg-background')
      expect(mobileContainer).not.toBeInTheDocument()
    })
  })

  describe('Route Navigation (Mobile)', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(false)
    })

    it('renders dashboard content at /staff', () => {
      renderLayout('/staff')
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()
    })

    it('renders calendar content at /staff/calendar', () => {
      renderLayout('/staff/calendar')
      expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
    })

    it('renders chat content at /staff/chat', () => {
      renderLayout('/staff/chat')
      expect(screen.getByTestId('chat-content')).toBeInTheDocument()
    })

    it('renders profile content at /staff/profile', () => {
      renderLayout('/staff/profile')
      expect(screen.getByTestId('profile-content')).toBeInTheDocument()
    })
  })

  describe('Layout Structure (Mobile)', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(false)
    })

    it('has min-h-screen container', () => {
      renderLayout()
      const container = document.querySelector('.min-h-screen')
      expect(container).toBeInTheDocument()
    })

    it('has background color', () => {
      renderLayout()
      const container = document.querySelector('.bg-background')
      expect(container).toBeInTheDocument()
    })

    it('renders main element for content', () => {
      renderLayout()
      expect(document.querySelector('main')).toBeInTheDocument()
    })
  })
})
