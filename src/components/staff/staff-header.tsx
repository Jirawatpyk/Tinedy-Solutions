/**
 * Staff Header Component
 *
 * Minimal mobile header for Staff Portal:
 * - Greeting with user name
 * - Today's job count
 * - Collapsible search
 * - Notification bell with unread badge
 * - Stats shortcut icon
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, BarChart3, X, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'
import { useInAppNotifications } from '@/hooks/use-in-app-notifications'
import { NotificationSheet } from './notification-sheet'

interface StaffHeaderProps {
  searchValue?: string
  /** F10 note: Parent component (Dashboard) handles debouncing via useDebounce hook.
   *  This callback is called on every keystroke - parent must debounce! */
  onSearchChange?: (value: string) => void
  showSearch?: boolean
  todayCount?: number
}

export function StaffHeader({
  searchValue = '',
  onSearchChange,
  showSearch = true,
  todayCount,
}: StaffHeaderProps) {
  const { profile } = useAuth()
  const navigate = useNavigate() // R4 fix
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const { unreadCount } = useInAppNotifications()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="px-4 py-3">
          {isSearchOpen ? (
            <div className="flex items-center gap-2">
              <Input
                type="search"
                placeholder="Search bookings..."
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="flex-1 h-10"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsSearchOpen(false)
                  onSearchChange?.('')
                }}
                className="h-10 w-10"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Staff'}
                </p>
                {todayCount !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Today: {todayCount} {todayCount === 1 ? 'job' : 'jobs'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {showSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSearchOpen(true)}
                    className="h-10 w-10"
                    aria-label="Search bookings"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                )}
                {/* Notification Bell */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 relative"
                  aria-label="View notifications"
                  onClick={() => setShowNotifications(true)}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
                {/* S4 fix: BarChart3 icon matches "View stats" action */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  aria-label="View stats"
                  onClick={() => navigate('/staff/profile')}
                >
                  <BarChart3 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* M4 fix: NotificationSheet rendered outside header for proper z-index stacking */}
      <NotificationSheet
        open={showNotifications}
        onOpenChange={setShowNotifications}
      />
    </>
  )
}
