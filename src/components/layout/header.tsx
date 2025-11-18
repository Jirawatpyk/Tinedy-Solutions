import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, User, Users, Calendar, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { QuickAvailabilityCheck } from '@/components/booking/quick-availability-check'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from '@/components/ui/command'

interface HeaderProps {
  onMenuClick: () => void
}

interface SearchResult {
  id: string
  type: 'customer' | 'staff' | 'booking' | 'service'
  title: string
  subtitle: string
  link: string
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  // Open search with Cmd+K or Ctrl+K (Admin & Manager)
  useEffect(() => {
    if (profile?.role !== 'admin' && profile?.role !== 'manager') return

    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [profile?.role])

  const performSearch = useCallback(async (query: string) => {
    console.log('Performing search for:', query)

    if (!query || query.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    const searchResults: SearchResult[] = []
    const basePath = profile?.role === 'manager' ? '/manager' : '/admin'

    try {
      // Search Customers
      const { data: customers } = await supabase
        .from('customers')
        .select('id, full_name, email')
        .ilike('full_name', `%${query}%`)
        .limit(5)

      customers?.forEach((customer) => {
        searchResults.push({
          id: customer.id,
          type: 'customer',
          title: customer.full_name,
          subtitle: customer.email,
          link: `${basePath}/customers/${customer.id}`,
        })
      })

      // Search Staff
      const { data: staff } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .ilike('full_name', `%${query}%`)
        .limit(5)

      staff?.forEach((member) => {
        searchResults.push({
          id: member.id,
          type: 'staff',
          title: member.full_name,
          subtitle: `${member.role} • ${member.email}`,
          link: `${basePath}/staff/${member.id}`,
        })
      })

      // Search Bookings (by customer name)
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          status,
          customers (full_name)
        `)
        .limit(5)

      bookings?.forEach((booking) => {
        const customers = booking.customers as { full_name: string } | { full_name: string }[] | null
        const customerName = Array.isArray(customers)
          ? customers[0]?.full_name
          : customers?.full_name

        if (customerName?.toLowerCase().includes(query.toLowerCase())) {
          searchResults.push({
            id: booking.id,
            type: 'booking',
            title: `Booking - ${customerName}`,
            subtitle: `${booking.booking_date} • ${booking.status}`,
            link: `${basePath}/bookings`,
          })
        }
      })

      // Search Service Packages
      const { data: services } = await supabase
        .from('service_packages')
        .select('id, name, price')
        .ilike('name', `%${query}%`)
        .limit(5)

      services?.forEach((service) => {
        searchResults.push({
          id: service.id,
          type: 'service',
          title: service.name,
          subtitle: `฿${service.price?.toLocaleString() ?? '0'}`,
          link: `${basePath}/packages`,
        })
      })

      console.log('Search results:', searchResults)
      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }, [profile?.role])

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  const handleSelect = (link: string) => {
    setOpen(false)
    setSearchQuery('')
    setResults([])
    navigate(link)
  }

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setResults([])
    }
  }, [open])

  const getIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return <User className="h-4 w-4" />
      case 'staff':
        return <Users className="h-4 w-4" />
      case 'booking':
        return <Calendar className="h-4 w-4" />
      case 'service':
        return <Package className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left side - Menu button */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Search bar - Admin & Manager, hidden on mobile */}
          {(profile?.role === 'admin' || profile?.role === 'manager') && (
            <div className="hidden md:flex items-center relative">
              <Button
                variant="outline"
                className="w-64 lg:w-96 justify-start text-muted-foreground"
                onClick={() => setOpen(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                Search...
                <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>
          )}

          {/* Quick Availability Check - Admin & Manager, hidden on mobile */}
          {(profile?.role === 'admin' || profile?.role === 'manager') && (
            <div className="hidden lg:block">
              <QuickAvailabilityCheck />
            </div>
          )}
        </div>

        {/* Right side - Notifications */}
        <div className="flex items-center space-x-2">
          <NotificationBell />
        </div>
      </div>

      {/* Search Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search customers, staff, bookings, services..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {!loading && searchQuery.length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search...
            </div>
          )}

          {!loading && searchQuery.length >= 2 && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {!loading && results.length > 0 && (
            <div className="p-2 max-h-[400px] overflow-y-auto">
              {['customer', 'staff', 'booking', 'service'].map((type) => {
                const typeResults = results.filter((r) => r.type === type)
                if (typeResults.length === 0) return null

                return (
                  <div key={type} className="mb-4">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                    </div>
                    {typeResults.map((result) => (
                      <div
                        key={result.id}
                        onClick={() => handleSelect(result.link)}
                        className="flex items-center px-2 py-2 hover:bg-accent rounded-sm cursor-pointer transition-colors"
                      >
                        <div className="mr-2">{getIcon(result.type)}</div>
                        <div>
                          <div className="font-medium text-sm">{result.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {result.subtitle}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </header>
  )
}
