/**
 * Bottom Navigation Component
 *
 * Mobile-first bottom tab bar for Staff Portal:
 * - 4 tabs: Home, Calendar, Chat, Profile
 * - 44px minimum touch targets
 * - Safe area inset for iPhone notch
 * - z-40 (below Sheet z-50, below Toaster z-[100])
 */

import { memo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Calendar, MessageSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/staff', icon: Home, label: 'Home', exact: true },
  { to: '/staff/calendar', icon: Calendar, label: 'Calendar', exact: false },
  { to: '/staff/chat', icon: MessageSquare, label: 'Chat', exact: false },
  { to: '/staff/profile', icon: User, label: 'Profile', exact: false },
]

// M2 fix: More robust isActive check - exact match for base paths
function isPathActive(pathname: string, to: string, exact: boolean): boolean {
  if (exact) {
    return pathname === to
  }
  // For non-exact, check if pathname matches the route exactly or is a direct child
  // e.g., /staff/chat matches /staff/chat and /staff/chat/user-123
  // but /staff/chat-settings should NOT match /staff/chat
  return pathname === to || pathname.startsWith(to + '/')
}

export const BottomNav = memo(function BottomNav() {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ to, icon: Icon, label, exact }) => {
          const isActive = isPathActive(location.pathname, to, exact)

          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] min-h-[44px]',
                'transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
})
