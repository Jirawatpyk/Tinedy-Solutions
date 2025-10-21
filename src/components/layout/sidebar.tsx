import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Calendar,
  Users,
  UsersRound,
  MessageSquare,
  Package,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { supabase } from '@/lib/supabase'

const adminNavItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Bookings', href: '/admin/bookings', icon: ClipboardList },
  { name: 'Calendar', href: '/admin/calendar', icon: Calendar },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Staff', href: '/admin/staff', icon: UsersRound },
  { name: 'Teams', href: '/admin/teams', icon: UsersRound },
  { name: 'Staff Availability', href: '/admin/staff-availability', icon: Calendar },
  { name: 'Chat', href: '/admin/chat', icon: MessageSquare },
  { name: 'Service Packages', href: '/admin/packages', icon: Package },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'Audit Log', href: '/admin/audit-log', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
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
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const { profile, user, signOut } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const navItems = profile?.role === 'admin' ? adminNavItems : staffNavItems

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
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
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
          'fixed top-0 left-0 z-50 h-screen w-64 bg-tinedy-blue text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b border-tinedy-blue/20 px-4">
            <h1 className="text-2xl font-display font-bold text-tinedy-yellow">
              Tinedy CRM
            </h1>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-tinedy-blue/20">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-tinedy-green flex items-center justify-center">
                <span className="text-sm font-semibold">
                  {profile?.full_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name}
                </p>
                <p className="text-xs text-tinedy-off-white/70 capitalize">
                  {profile?.role}
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <ThemeToggle />
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
                        'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-tinedy-green text-white'
                          : 'text-tinedy-off-white hover:bg-tinedy-blue/50'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="flex-1">{item.name}</span>
                      {isChatItem && unreadCount > 0 && (
                        <Badge className="ml-auto bg-red-500 hover:bg-red-600 text-white text-xs">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Sign out button */}
          <div className="p-4 border-t border-tinedy-blue/20">
            <Button
              variant="ghost"
              className="w-full justify-start text-tinedy-off-white hover:bg-tinedy-blue/50 hover:text-white"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
