import { useState, useMemo, useCallback } from 'react'
import { useStaffDashboard } from '@/hooks/use-staff-dashboard'
import { useNotifications } from '@/hooks/use-notifications'
import { useDebounce } from '@/hooks/use-debounce'
import type { StaffBooking } from '@/lib/queries/staff-bookings-queries'
import { BookingDetailsModal } from '@/components/staff/booking-details-modal'
import { NotificationPrompt } from '@/components/notifications/notification-prompt'
import { BookingTabs, type TabValue } from '@/components/staff/booking-tabs'
import { FloatingActionButton } from '@/components/staff/floating-action-button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { BookingSearchHeader, BookingListSection, StatsSection } from '@/components/staff/dashboard'
import { PullToRefresh } from '@/components/staff/pull-to-refresh'

export default function StaffDashboard() {
  const {
    todayBookings,
    upcomingBookings,
    completedBookings,
    stats,
    isLoading: loading,
    error,
    startProgress,
    markAsCompleted,
    addNotes,
    refetch: refresh,
  } = useStaffDashboard()

  const {
    hasPermission,
    isRequesting,
    requestPermission,
    isSupported,
  } = useNotifications()

  const [activeTab, setActiveTab] = useState<TabValue>('today')
  const [selectedBooking, setSelectedBooking] = useState<StaffBooking | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [startingBookingId, setStartingBookingId] = useState<string | null>(null)
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null)
  const [todayLimit, setTodayLimit] = useState(6)
  const [upcomingLimit, setUpcomingLimit] = useState(6)
  const [completedLimit, setCompletedLimit] = useState(6)
  const [searchInput, setSearchInput] = useState('')
  const searchQuery = useDebounce(searchInput, 300)
  const { toast } = useToast()

  // Filter bookings based on debounced search query
  const filterBookings = useCallback((bookings: StaffBooking[]): StaffBooking[] => {
    if (!searchQuery.trim()) return bookings

    const query = searchQuery.toLowerCase().trim()
    return bookings.filter((booking) => {
      const bookingId = booking.id?.toLowerCase() || ''
      const customerName = booking.customers?.full_name?.toLowerCase() || ''
      const packageName = booking.service_packages?.name?.toLowerCase() ||
                         booking.service_packages_v2?.name?.toLowerCase() || ''
      const address = booking.address?.toLowerCase() || ''
      const city = booking.city?.toLowerCase() || ''
      const status = booking.status?.toLowerCase() || ''

      return (
        bookingId.includes(query) ||
        customerName.includes(query) ||
        packageName.includes(query) ||
        address.includes(query) ||
        city.includes(query) ||
        status.includes(query)
      )
    })
  }, [searchQuery])

  // Filtered bookings
  const filteredTodayBookings = useMemo(() => filterBookings(todayBookings), [todayBookings, filterBookings])
  const filteredUpcomingBookings = useMemo(() => filterBookings(upcomingBookings), [upcomingBookings, filterBookings])
  const filteredCompletedBookings = useMemo(() => filterBookings(completedBookings), [completedBookings, filterBookings])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refresh()
    setIsRefreshing(false)
    toast({
      title: 'Refreshed Successfully',
      description: 'Data has been updated',
    })
  }

  // Pull-to-refresh handler (no toast - visual indicator is enough)
  const handlePullRefresh = async () => {
    await refresh()
  }

  const handleStartProgress = async (bookingId: string) => {
    setStartingBookingId(bookingId)
    try {
      await Promise.all([
        startProgress(bookingId),
        new Promise(resolve => setTimeout(resolve, 300))
      ])
      toast({
        title: 'Started',
        description: 'Task has been started successfully',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Could not start the task',
        variant: 'destructive',
      })
    } finally {
      setStartingBookingId(null)
    }
  }

  const handleMarkCompleted = async (bookingId: string) => {
    setCompletingBookingId(bookingId)
    try {
      await Promise.all([
        markAsCompleted(bookingId),
        new Promise(resolve => setTimeout(resolve, 300))
      ])
      toast({
        title: 'Completed',
        description: 'Task marked as completed successfully',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Could not mark task as completed',
        variant: 'destructive',
      })
    } finally {
      setCompletingBookingId(null)
    }
  }

  const currentBooking = selectedBooking
    ? [...todayBookings, ...upcomingBookings, ...completedBookings].find(
        (b) => b.id === selectedBooking.id
      ) || selectedBooking
    : null

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error: {error.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-gray-50 via-gray-50/50 to-primary/5">
      {/* Modern Header */}
      <BookingSearchHeader
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onClear={() => setSearchInput('')}
      />

      {/* Tabs Navigation */}
      <BookingTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        todayCount={filteredTodayBookings.length}
        upcomingCount={filteredUpcomingBookings.length}
        pastCount={filteredCompletedBookings.length}
      />

      {/* Main Content with Pull-to-Refresh */}
      <PullToRefresh
        onRefresh={handlePullRefresh}
        className="flex-1"
        contentClassName="p-2 sm:p-4 md:p-6 lg:p-8 pb-24"
      >
        {/* Notification Permission Prompt */}
        {isSupported && !hasPermission && (
          <div className="animate-in fade-in-50 slide-in-from-top-4 duration-500 mb-4">
            <NotificationPrompt
              onRequest={requestPermission}
              isRequesting={isRequesting}
            />
          </div>
        )}

        {/* Tab Content with animation */}
        <div
          key={activeTab}
          className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300 will-change-[opacity,transform]"
        >
          {activeTab === 'today' && (
            <BookingListSection
              bookings={filteredTodayBookings}
              loading={loading}
              limit={todayLimit}
              onLoadMore={() => setTodayLimit(prev => prev + 6)}
              onViewDetails={setSelectedBooking}
              onStartProgress={handleStartProgress}
              onMarkCompleted={handleMarkCompleted}
              searchInput={searchInput}
              emptyType="today"
              showDate={false}
              startingBookingId={startingBookingId}
              completingBookingId={completingBookingId}
            />
          )}
          {activeTab === 'upcoming' && (
            <BookingListSection
              bookings={filteredUpcomingBookings}
              loading={loading}
              limit={upcomingLimit}
              onLoadMore={() => setUpcomingLimit(prev => prev + 6)}
              onViewDetails={setSelectedBooking}
              onStartProgress={handleStartProgress}
              onMarkCompleted={handleMarkCompleted}
              searchInput={searchInput}
              emptyType="upcoming"
              showDate={true}
              startingBookingId={startingBookingId}
              completingBookingId={completingBookingId}
            />
          )}
          {activeTab === 'past' && (
            <BookingListSection
              bookings={filteredCompletedBookings}
              loading={loading}
              limit={completedLimit}
              onLoadMore={() => setCompletedLimit(prev => prev + 6)}
              onViewDetails={setSelectedBooking}
              onStartProgress={handleStartProgress}
              onMarkCompleted={handleMarkCompleted}
              searchInput={searchInput}
              emptyType="past"
              showDate={true}
              startingBookingId={startingBookingId}
              completingBookingId={completingBookingId}
            />
          )}
          {activeTab === 'stats' && (
            <StatsSection stats={stats} loading={loading} />
          )}
        </div>
      </PullToRefresh>

      {/* Floating Action Button */}
      <FloatingActionButton
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Booking Details Modal */}
      <BookingDetailsModal
        booking={currentBooking}
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onStartProgress={startProgress}
        onMarkCompleted={markAsCompleted}
        onAddNotes={addNotes}
      />
    </div>
  )
}
