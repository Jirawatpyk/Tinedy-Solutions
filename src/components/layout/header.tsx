import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, User, Users, Calendar, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { QuickAvailabilityCheck } from '@/components/booking/quick-availability-check'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatBookingId } from '@/lib/utils'
import { formatRole } from '@/lib/role-utils'
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
  bookingId?: string
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
    logger.debug('Performing search', { query }, { context: 'Header' })

    if (!query || query.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    const searchResults: SearchResult[] = []
    // Both admin and manager use /admin routes
    const basePath = (profile?.role === 'admin' || profile?.role === 'manager') ? '/admin' : '/staff'

    try {
      // Remove # prefix and BK- prefix if present (users often copy ID with #BK- from UI)
      let cleanedQuery = query.trim()
      if (cleanedQuery.startsWith('#')) cleanedQuery = cleanedQuery.substring(1)
      if (cleanedQuery.toUpperCase().startsWith('BK-')) cleanedQuery = cleanedQuery.substring(3)

      // Check if cleaned query matches UUID pattern (with or without dashes, partial or full)
      // Also match if it looks like first 6 chars of UUID (from #BK-XXXXXX format)
      const isUuidPattern = /^[0-9a-f]{6,}$/i.test(cleanedQuery) || /^[0-9a-f]{8}(-?[0-9a-f]{4}){0,3}(-?[0-9a-f]{0,12})?$/i.test(cleanedQuery)

      // Search Customers (exclude archived)
      const { data: customers } = await supabase
        .from('customers')
        .select('id, full_name, email')
        .ilike('full_name', `%${query}%`)
        .is('deleted_at', null)
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
          subtitle: `${formatRole(member.role)} • ${member.email}`,
          link: `${basePath}/staff/${member.id}`,
        })
      })

      // Search Bookings - ปรับปรุงใหม่: รองรับค้นหาด้วย ID และชื่อลูกค้า
      if (isUuidPattern) {
        // ค้นหาด้วย Booking ID - ดึงทั้งหมดแล้วกรองที่ client (exclude archived)
        const { data: bookingsByID, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            id,
            booking_date,
            status,
            customers (full_name)
          `)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(500)

        if (bookingError) {
          console.error('Booking search error:', bookingError)
        }

        // Filter bookings by ID at client side (case-insensitive)
        const filteredBookings = bookingsByID?.filter(booking =>
          booking.id.toLowerCase().includes(cleanedQuery.toLowerCase())
        ).slice(0, 5) || []

        filteredBookings.forEach((booking) => {
          const customers = booking.customers as { full_name: string } | { full_name: string }[] | null
          const customerName = Array.isArray(customers)
            ? customers[0]?.full_name || 'Unknown'
            : customers?.full_name || 'Unknown'

          searchResults.push({
            id: booking.id,
            type: 'booking',
            title: `Booking - ${customerName}`,
            subtitle: `ID: ${formatBookingId(booking.id)} • ${booking.booking_date} • ${booking.status}`,
            link: `${basePath}/bookings`,
            bookingId: booking.id,
          })
        })
      } else {
        // ค้นหาด้วยชื่อลูกค้า - ใช้ server-side filtering
        const { data: bookingsByCustomer } = await supabase
          .from('bookings')
          .select(`
            id,
            booking_date,
            status,
            customers!inner (full_name)
          `)
          .ilike('customers.full_name', `%${query}%`)
          .is('deleted_at', null)
          .limit(5)

        bookingsByCustomer?.forEach((booking) => {
          const customers = booking.customers as { full_name: string } | { full_name: string }[] | null
          const customerName = Array.isArray(customers)
            ? customers[0]?.full_name || 'Unknown'
            : customers?.full_name || 'Unknown'

          searchResults.push({
            id: booking.id,
            type: 'booking',
            title: `Booking - ${customerName}`,
            subtitle: `ID: ${formatBookingId(booking.id)} • ${booking.booking_date} • ${booking.status}`,
            link: `${basePath}/bookings`,
            bookingId: booking.id,
          })
        })
      }

      // Search Service Packages V1 (Legacy)
      const { data: servicesV1 } = await supabase
        .from('service_packages')
        .select('id, name, price')
        .ilike('name', `%${query}%`)
        .limit(5)

      servicesV1?.forEach((service) => {
        searchResults.push({
          id: service.id,
          type: 'service',
          title: `${service.name} (V1)`,
          subtitle: `฿${service.price?.toLocaleString() ?? '0'}`,
          link: `${basePath}/packages/${service.id}`,
        })
      })

      // Search Service Packages V2 (New)
      const { data: servicesV2 } = await supabase
        .from('service_packages_v2')
        .select('id, name, pricing_model, base_price')
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .limit(5)

      servicesV2?.forEach((service) => {
        const priceDisplay = service.pricing_model === 'fixed' && service.base_price
          ? `฿${service.base_price.toLocaleString()}`
          : 'Tiered Pricing'

        searchResults.push({
          id: service.id,
          type: 'service',
          title: service.name,
          subtitle: priceDisplay,
          link: `${basePath}/packages/${service.id}`,
        })
      })

      logger.debug('Search results', { count: searchResults.length, isUuidPattern, cleanedQuery }, { context: 'Header' })
      setResults(searchResults)
    } catch (error) {
      logger.error('Search error', { error }, { context: 'Header' })
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

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setSearchQuery('')
    setResults([])

    // For bookings, pass bookingId in navigation state to trigger modal
    if (result.type === 'booking' && result.bookingId) {
      navigate(result.link, { state: { viewBookingId: result.bookingId } })
    } else {
      navigate(result.link)
    }
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
          <SimpleTooltip content="Menu" enabled={true}>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SimpleTooltip>

          {/* Search bar - Admin & Manager */}
          {(profile?.role === 'admin' || profile?.role === 'manager') && (
            <>
              {/* Mobile: icon only with tooltip */}
              <SimpleTooltip content="Search (⌘K)">
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setOpen(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
              {/* Tablet+: full search bar without tooltip */}
              <Button
                variant="outline"
                className="hidden md:flex w-64 lg:w-96 justify-start text-muted-foreground px-3"
                onClick={() => setOpen(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                <span>Search...</span>
                <kbd className="pointer-events-none ml-auto h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 inline-flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </>
          )}

          {/* Quick Availability Check - Admin & Manager, show on all screens */}
          {(profile?.role === 'admin' || profile?.role === 'manager') && (
            <QuickAvailabilityCheck />
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
          placeholder="Search customers, staff, bookings (by ID or name), services..."
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
                        onClick={() => handleSelect(result)}
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
