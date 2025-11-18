import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Calendar,
  Users,
  UsersRound,
  MessageSquare,
  Package,
  BarChart3,
  Settings,
  LogOut,
  ClipboardList,
  UserCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

const adminNavItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Bookings', href: '/admin/bookings', icon: ClipboardList },
  { name: 'Calendar', href: '/admin/calendar', icon: Calendar },
  { name: 'Weekly Schedule', href: '/admin/weekly-schedule', icon: Calendar },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Staff', href: '/admin/staff', icon: UsersRound },
  { name: 'Teams', href: '/admin/teams', icon: UsersRound },
  { name: 'Chat', href: '/admin/chat', icon: MessageSquare },
  { name: 'Service Packages', href: '/admin/packages', icon: Package },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'My Profile', href: '/admin/profile', icon: UserCircle },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

const managerNavItems = [
  { name: 'Dashboard', href: '/manager', icon: LayoutDashboard },
  { name: 'Bookings', href: '/manager/bookings', icon: ClipboardList },
  { name: 'Calendar', href: '/manager/calendar', icon: Calendar },
  { name: 'Weekly Schedule', href: '/manager/weekly-schedule', icon: Calendar },
  { name: 'Customers', href: '/manager/customers', icon: Users },
  { name: 'Staff', href: '/manager/staff', icon: UsersRound },
  { name: 'Teams', href: '/manager/teams', icon: UsersRound },
  { name: 'Chat', href: '/manager/chat', icon: MessageSquare },
  { name: 'Service Packages', href: '/manager/packages', icon: Package },
  { name: 'Reports', href: '/manager/reports', icon: BarChart3 },
  { name: 'My Profile', href: '/manager/profile', icon: UserCircle },
]

const staffNavItems = [
  { name: 'My Bookings', href: '/staff', icon: ClipboardList },
  { name: 'My Calendar', href: '/staff/calendar', icon: Calendar },
  { name: 'Chat', href: '/staff/chat', icon: MessageSquare },
  { name: 'My Profile', href: '/staff/profile', icon: Users },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, user, signOut } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const navItems =
    profile?.role === 'admin' ? adminNavItems :
    profile?.role === 'manager' ? managerNavItems :
    staffNavItems

  // Fetch unread message count
  useEffect(() => {
    if (!user) return

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)

      setUnreadCount(count || 0)
    }

    fetchUnreadCount()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Refetch when navigating to/from chat page
  useEffect(() => {
    if (!user) return

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)

      setUnreadCount(count || 0)
    }

    // Refetch when location changes (especially when leaving chat page)
    fetchUnreadCount()
  }, [location.pathname, user])

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true)
      await signOut()
    } catch (error) {
      console.error('[Sidebar] Error signing out:', error)
    } finally {
      // Navigate to login - component will unmount, no need to reset state
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen bg-tinedy-blue text-white transform transition-all duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          isCollapsed ? 'lg:w-20 w-64' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo with collapse button */}
          <div className="relative flex items-center h-16 border-b border-tinedy-blue/20 px-4">
            {/* Logo container - similar to menu items */}
            <div className="flex items-center flex-1 overflow-hidden space-x-0">
              <span className="text-2xl font-display font-bold text-tinedy-yellow flex-shrink-0">
                T
              </span>
              <span className={cn(
                "text-2xl font-display font-bold text-tinedy-yellow flex-1 transition-all duration-300 overflow-hidden whitespace-nowrap",
                isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
              )}>
                inedy CRM
              </span>
            </div>
            {/* Collapse button - absolute positioned */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-tinedy-blue/50 transition-colors absolute right-2 top-1/2 -translate-y-1/2"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-tinedy-blue/20">
            <div className={cn(
              'flex items-center transition-all duration-300',
              isCollapsed ? 'justify-center' : 'space-x-3'
            )}>
              <div className="w-10 h-10 rounded-full bg-tinedy-green flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold">
                  {profile?.full_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className={cn(
                "flex-1 min-w-0 transition-all duration-300 overflow-hidden",
                isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
              )}>
                <p className="text-sm font-medium truncate">
                  {profile?.full_name}
                </p>
                <p className="text-xs text-tinedy-off-white/70 capitalize">
                  {profile?.role}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
            <ul className="space-y-1 px-3">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href
                const isChatItem = item.name === 'Chat'
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center rounded-lg text-sm font-medium transition-all duration-300 relative group',
                        isCollapsed ? 'justify-center px-3 py-2.5' : 'space-x-3 px-3 py-2.5',
                        isActive
                          ? 'bg-tinedy-green text-white'
                          : 'text-tinedy-off-white hover:bg-tinedy-blue/50'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className={cn(
                        "flex-1 transition-all duration-300 overflow-hidden whitespace-nowrap",
                        isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                      )}>
                        {item.name}
                      </span>
                      {isChatItem && unreadCount > 0 && (
                        <Badge className={cn(
                          "bg-red-500 hover:bg-red-600 text-white text-xs transition-all duration-300",
                          isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100 w-auto ml-auto"
                        )}>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                      {/* Show unread count as dot when collapsed */}
                      {isCollapsed && isChatItem && unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                      )}
                      {/* Tooltip on hover when collapsed */}
                      {isCollapsed && (
                        <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                          {item.name}
                          {isChatItem && unreadCount > 0 && ` (${unreadCount > 99 ? '99+' : unreadCount})`}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Sign out button */}
          <div className="border-t border-tinedy-blue/20 pt-4 pb-4">
            <ul className="space-y-1 px-3">
              <li>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className={cn(
                "w-full flex items-center rounded-lg text-sm font-medium transition-all duration-300 text-tinedy-off-white hover:bg-tinedy-blue/50",
                isCollapsed ? 'justify-center px-3 py-2.5' : 'space-x-3 px-3 py-2.5'
              )}
                  title={isCollapsed ? 'Sign Out' : undefined}
                >
                {isLoggingOut ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white flex-shrink-0" />
                    <span className={cn(
                      "transition-all duration-300 overflow-hidden whitespace-nowrap",
                      isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                    )}>
                      Signing out...
                    </span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    <span className={cn(
                      "transition-all duration-300 overflow-hidden whitespace-nowrap",
                      isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                    )}>
                      Sign Out
                    </span>
                  </>
                )}
              </button>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </>
  )
}
