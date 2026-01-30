import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { StaffLayout } from '../staff-layout'

// Mock useAuth
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    profile: {
      full_name: 'Test Staff',
      avatar_url: null,
      role: 'staff',
    },
    signOut: vi.fn(),
  }),
}))

// Mock useInAppNotifications
vi.mock('@/hooks/use-in-app-notifications', () => ({
  useInAppNotifications: () => ({
    unreadCount: 0,
  }),
}))

// Mock ErrorBoundary to simplify testing
vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock BottomNav
vi.mock('@/components/staff/bottom-nav', () => ({
  BottomNav: () => <nav data-testid="bottom-nav">Bottom Nav</nav>,
}))

// Mock StaffSidebar
vi.mock('@/components/staff/staff-sidebar', () => ({
  StaffSidebar: ({ className }: { className?: string }) => (
    <aside data-testid="staff-sidebar" className={className}>
      Staff Sidebar
    </aside>
  ),
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

  describe('Layout Structure', () => {
    it('renders bottom navigation', () => {
      renderLayout()
      expect(screen.getByTestId('bottom-nav')).toBeInTheDocument()
    })

    it('renders staff sidebar', () => {
      renderLayout()
      expect(screen.getByTestId('staff-sidebar')).toBeInTheDocument()
    })

    it('renders page content via Outlet', () => {
      renderLayout()
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()
    })

    it('has min-h-screen container', () => {
      renderLayout()
      const container = document.querySelector('.min-h-screen')
      expect(container).toBeInTheDocument()
    })

    it('has flex layout with column for mobile and row for desktop', () => {
      renderLayout()
      const container = document.querySelector('.flex-col')
      expect(container).toBeInTheDocument()
    })

    it('renders main element for content', () => {
      renderLayout()
      expect(document.querySelector('main')).toBeInTheDocument()
    })

    it('applies bottom padding for nav on mobile', () => {
      renderLayout()
      const main = document.querySelector('main')
      expect(main).toHaveClass('pb-20')
    })
  })

  describe('CSS Breakpoints', () => {
    it('sidebar has hidden lg:flex classes for responsive behavior', () => {
      renderLayout()
      const sidebar = screen.getByTestId('staff-sidebar')
      // Check that the sidebar has the correct classes for responsive behavior
      expect(sidebar).toHaveClass('hidden')
      expect(sidebar).toHaveClass('lg:flex')
    })
  })

  describe('Route Navigation', () => {
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
})
