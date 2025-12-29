import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { supabase } from '@/lib/supabase'
import { getNavigationRoutes } from '@/lib/route-utils'

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

  // Get navigation items from route config based on user role
  const navItems = getNavigationRoutes(profile?.role || null)

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

  // Listen for optimistic updates from chat page (for large message batches 50+)
  useEffect(() => {
    const handleMessagesRead = (event: Event) => {
      const customEvent = event as CustomEvent<{ senderId: string; count: number }>
      const { count } = customEvent.detail

      // Optimistic update - immediately reduce badge count
      setUnreadCount((prev) => Math.max(0, prev - count))
    }

    window.addEventListener('chat:messages-read', handleMessagesRead)

    return () => {
      window.removeEventListener('chat:messages-read', handleMessagesRead)
    }
  }, [])

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true)
      await signOut()
    } catch (error) {
      // Ignore error and continue to logout
    } finally {
      // Navigate to login
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
            <SimpleTooltip content={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-tinedy-blue/50 transition-colors absolute right-2 top-1/2 -translate-y-1/2"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </button>
            </SimpleTooltip>
          </div>

          {/* User info with dropdown */}
          <div className="p-4 border-b border-tinedy-blue/20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center rounded-lg transition-all duration-300 hover:bg-tinedy-blue/50 p-2 -m-2",
                    isCollapsed ? 'justify-center' : 'space-x-3'
                  )}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || 'User'}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-tinedy-green"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-tinedy-green flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold">
                        {profile?.full_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className={cn(
                    "flex-1 min-w-0 transition-all duration-300 overflow-hidden text-left",
                    isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                  )}>
                    <p className="text-sm font-medium truncate">
                      {profile?.full_name}
                    </p>
                    <p className="text-xs text-tinedy-off-white/70 capitalize">
                      {profile?.role}
                    </p>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 flex-shrink-0 transition-all duration-300",
                    isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                  )} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => {
                  navigate(profile?.role === 'staff' ? '/staff/profile' : '/admin/profile')
                  onClose()
                }}>
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} disabled={isLoggingOut}>
                  {isLoggingOut ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                      <span>Signing out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 lg:scrollbar-hide">
            <div className="flex flex-col min-h-full">
              {/* Menu items */}
              <ul className="space-y-1 px-3 flex-1">
                {navItems.map((item) => {
                  // Check if current path matches this nav item
                  // Use startsWith to match child routes (e.g., /admin/packages/123 matches /admin/packages)
                  // Special handling for root paths like /admin or /staff (dashboard) - exact match only
                  const isRootPath = item.path === '/admin' || item.path === '/staff'
                  const isActive = isRootPath
                    ? location.pathname === item.path
                    : location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                  const isChatItem = item.title === 'Chat'
                  const Icon = item.icon
                  return (
                    <li key={item.key}>
                      <SimpleTooltip
                        content={`${item.title}${isChatItem && unreadCount > 0 ? ` (${unreadCount > 10 ? '10+' : unreadCount})` : ''}`}
                        side="right"
                        enabled={isCollapsed}
                      >
                        <Link
                          to={item.path}
                          onClick={onClose}
                          className={cn(
                            'flex items-center rounded-lg text-sm font-medium transition-all duration-300 relative',
                            isCollapsed ? 'justify-center px-3 py-2.5' : 'space-x-3 px-3 py-2.5',
                            isActive
                              ? 'bg-tinedy-green text-white'
                              : 'text-tinedy-off-white hover:bg-tinedy-blue/50'
                          )}
                        >
                          {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
                          <span className={cn(
                            "flex-1 transition-all duration-300 overflow-hidden whitespace-nowrap",
                            isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                          )}>
                            {item.title}
                          </span>
                          {isChatItem && unreadCount > 0 && (
                            <Badge className={cn(
                              "bg-red-500 hover:bg-red-600 text-white text-xs transition-all duration-300",
                              isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100 w-auto ml-auto"
                            )}>
                              {unreadCount > 10 ? '10+' : unreadCount}
                            </Badge>
                          )}
                          {/* Show unread count as dot when collapsed */}
                          {isCollapsed && isChatItem && unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                          )}
                        </Link>
                      </SimpleTooltip>
                    </li>
                  )
                })}
              </ul>
            </div>
          </nav>
        </div>
      </aside>
    </>
  )
}
