/**
 * Staff Sidebar Component
 *
 * Desktop sidebar navigation for Staff Portal (styled like Admin sidebar):
 * - Logo "Tinedy CRM" with inline collapse button
 * - User info with dropdown menu at top
 * - Navigation items: Home, Calendar, Chat, Profile
 * - Notification bell with unread badge
 * - Collapsible with localStorage persistence
 */

import { useState, useEffect, lazy, Suspense } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Calendar,
  MessageSquare,
  User,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/string-utils'
import { useAuth } from '@/contexts/auth-context'
import { useInAppNotifications } from '@/hooks/use-in-app-notifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'

// Lazy load NotificationSheet - only loaded when user opens notifications
const NotificationSheet = lazy(() =>
  import('@/components/staff/notification-sheet').then((m) => ({ default: m.NotificationSheet }))
)

const SIDEBAR_COLLAPSED_KEY = 'staff-sidebar-collapsed'

const navItems = [
  { to: '/staff', icon: Home, label: 'Home', exact: true },
  { to: '/staff/calendar', icon: Calendar, label: 'Calendar', exact: false },
  { to: '/staff/chat', icon: MessageSquare, label: 'Chat', exact: false },
  { to: '/staff/profile', icon: User, label: 'Profile', exact: false },
]

function isPathActive(pathname: string, to: string, exact: boolean): boolean {
  if (exact) {
    return pathname === to
  }
  return pathname === to || pathname.startsWith(to + '/')
}

interface StaffSidebarProps {
  className?: string
}

export function StaffSidebar({ className }: StaffSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { unreadCount } = useInAppNotifications()

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      return saved ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })

  const [showNotifications, setShowNotifications] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Persist collapse state
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(isCollapsed))
    } catch {
      // Ignore localStorage errors
    }
  }, [isCollapsed])

  const toggleCollapse = () => {
    setIsCollapsed((prev: boolean) => !prev)
  }

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true)
      await signOut()
    } catch {
      // Ignore error and continue to logout
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      <aside
        className={cn(
          'h-screen bg-tinedy-blue text-white flex flex-col transition-all duration-300 flex-shrink-0',
          isCollapsed ? 'w-20' : 'w-64',
          className
        )}
        data-testid="staff-sidebar"
        role="navigation"
        aria-label="Staff navigation"
      >
        {/* Logo with collapse button (like Admin sidebar) */}
        <div className="relative flex items-center h-16 border-b border-tinedy-blue/20 px-4">
          {/* Logo container */}
          <div className="flex items-center flex-1 overflow-hidden space-x-0">
            <span className="text-2xl font-display font-bold text-tinedy-yellow flex-shrink-0">
              T
            </span>
            <span
              className={cn(
                'text-2xl font-display font-bold text-tinedy-yellow flex-1 transition-all duration-300 overflow-hidden whitespace-nowrap',
                isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
              )}
            >
              inedy CRM
            </span>
          </div>
          {/* Collapse button - absolute positioned */}
          <SimpleTooltip
            content={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            side="right"
          >
            <button
              type="button"
              onClick={toggleCollapse}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-tinedy-blue/50 transition-colors absolute right-2 top-1/2 -translate-y-1/2"
              data-testid="sidebar-collapse-toggle"
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          </SimpleTooltip>
        </div>

        {/* User info (display only - Profile is in nav menu) */}
        <div className="p-4 border-b border-tinedy-blue/20">
          <div
            className={cn(
              'flex items-center',
              isCollapsed ? 'justify-center' : 'space-x-3'
            )}
          >
            <Avatar className="h-10 w-10 flex-shrink-0 border-2 border-tinedy-green">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-tinedy-green text-white text-sm font-semibold">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                'flex-1 min-w-0 transition-all duration-300 overflow-hidden',
                isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
              )}
            >
              <p className="text-sm font-medium truncate">
                {profile?.full_name}
              </p>
              <p className="text-xs text-tinedy-off-white/70">Staff</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map(({ to, icon: Icon, label, exact }) => {
              const isActive = isPathActive(location.pathname, to, exact)

              return (
                <li key={to}>
                  <SimpleTooltip content={label} side="right" enabled={isCollapsed}>
                    <NavLink
                      to={to}
                      end={exact}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center rounded-lg text-sm font-medium transition-all duration-300 relative',
                        isCollapsed ? 'justify-center px-3 py-2.5' : 'space-x-3 px-3 py-2.5',
                        isActive
                          ? 'bg-tinedy-green text-white'
                          : 'text-tinedy-off-white hover:bg-tinedy-blue/50'
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      <span
                        className={cn(
                          'flex-1 transition-all duration-300 overflow-hidden whitespace-nowrap',
                          isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
                        )}
                      >
                        {label}
                      </span>
                    </NavLink>
                  </SimpleTooltip>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Bottom Section: Notifications & Logout */}
        <div className="border-t border-tinedy-blue/20 p-2 space-y-1">
          {/* Notification Bell */}
          <SimpleTooltip
            content={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            side="right"
            enabled={isCollapsed}
          >
            <Button
              variant="ghost"
              className={cn(
                'w-full rounded-lg text-sm font-medium transition-all duration-300 relative min-h-[44px]',
                isCollapsed ? 'justify-center px-3' : 'justify-start space-x-3 px-3',
                'text-tinedy-off-white hover:bg-tinedy-blue/50 hover:text-white'
              )}
              onClick={() => setShowNotifications(true)}
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            >
              <Bell className="h-5 w-5 flex-shrink-0" />
              <span
                className={cn(
                  'flex-1 text-left transition-all duration-300 overflow-hidden whitespace-nowrap',
                  isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
                )}
              >
                Notifications
              </span>
              {!isCollapsed && unreadCount > 0 && (
                <Badge className="ml-auto bg-red-500 hover:bg-red-600 text-white text-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
              {isCollapsed && unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Button>
          </SimpleTooltip>

          {/* Logout Button */}
          <SimpleTooltip content="Sign out" side="right" enabled={isCollapsed}>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className={cn(
                'w-full rounded-lg text-sm font-medium transition-all duration-300 min-h-[44px]',
                isCollapsed ? 'justify-center px-3' : 'justify-start space-x-3 px-3',
                'text-tinedy-off-white/70 hover:text-white hover:bg-tinedy-blue/50'
              )}
            >
              {isLoggingOut ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
              ) : (
                <LogOut className="h-5 w-5 flex-shrink-0" />
              )}
              <span
                className={cn(
                  'flex-1 text-left transition-all duration-300 overflow-hidden whitespace-nowrap',
                  isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
                )}
              >
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </span>
            </Button>
          </SimpleTooltip>
        </div>
      </aside>

      {/* Notification Sheet - Lazy loaded */}
      {showNotifications && (
        <Suspense fallback={null}>
          <NotificationSheet
            open={showNotifications}
            onOpenChange={setShowNotifications}
          />
        </Suspense>
      )}
    </>
  )
}
