import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useStaffDashboard } from '@/hooks/use-staff-dashboard'
import { useNotifications } from '@/hooks/use-notifications'
import { useDebounce } from '@/hooks/use-debounce'
import type { StaffBooking } from '@/lib/queries/staff-bookings-queries'
import { NotificationPrompt } from '@/components/notifications/notification-prompt'
import { BookingTabs, type TabValue } from '@/components/staff/booking-tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import { BookingListSection } from '@/components/staff/dashboard'
import { StaffHeader } from '@/components/staff/staff-header'
import { ResponsiveSheet } from '@/components/ui/responsive-sheet'
import { BookingDetailContent } from '@/components/staff/booking-detail-content'
import { PullToRefresh } from '@/components/staff/pull-to-refresh'
import { UndoToastAction, UNDO_DURATION_MS } from '@/components/staff/undo-toast'

export default function StaffDashboard() {
  const {
    todayBookings,
    upcomingBookings,
    completedBookings,
    isLoading: loading,
    error,
    startProgress,
    markAsCompleted,
    addNotes,
    revertToInProgress,
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
  const [startingBookingId, setStartingBookingId] = useState<string | null>(null)
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null)
  const [todayLimit, setTodayLimit] = useState(6)
  const [upcomingLimit, setUpcomingLimit] = useState(6)
  const [completedLimit, setCompletedLimit] = useState(6)
  const [searchInput, setSearchInput] = useState('')
  const searchQuery = useDebounce(searchInput, 300)
  const { toast } = useToast()

  // Undo debounce tracking (prevents rapid double-tap on same booking)
  const undoingRef = useRef<string | null>(null)
  // Mounted ref to prevent state updates after unmount
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

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

      // F2 fix: Capture bookingId in closure-safe way
      const capturedBookingId = bookingId

      // Show undo toast (WR4-2, WR4-3)
      const { dismiss } = toast({
        title: 'Completed',
        description: 'Marked as completed',
        duration: UNDO_DURATION_MS, // F12 fix: Use shared constant
        action: (
          <UndoToastAction
            onUndo={async () => {
              // Guard: component unmounted or already processing this booking
              if (!isMountedRef.current || undoingRef.current === capturedBookingId) return
              undoingRef.current = capturedBookingId
              dismiss()
              try {
                await revertToInProgress(capturedBookingId)
                if (isMountedRef.current) {
                  toast({
                    title: 'Reverted',
                    description: 'Task moved back to In Progress',
                  })
                }
              } catch (error) {
                logger.error('Failed to revert booking', { bookingId: capturedBookingId, error }, { context: 'StaffDashboard' })
                if (isMountedRef.current) {
                  toast({
                    title: 'Error',
                    description: 'Could not undo. Please try again.',
                    variant: 'destructive',
                  })
                }
              } finally {
                undoingRef.current = null
              }
            }}
          />
        ),
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
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gradient-to-br from-tinedy-off-white/50 via-tinedy-off-white/30 to-primary/5">
      {/* Mobile-first Header */}
      <StaffHeader
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        todayCount={filteredTodayBookings.length}
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
        contentClassName="p-2 sm:p-4 md:p-6 lg:p-8 pb-24 lg:max-w-7xl lg:mx-auto lg:w-full"
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
        </div>
      </PullToRefresh>

      {/* Booking Details - ResponsiveSheet (bottom on mobile, right on desktop) */}
      <ResponsiveSheet
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
        mobileHeight="h-[95vh]"
        desktopWidth="w-[540px]"
        data-testid="booking-details-sheet"
      >
        {currentBooking && (
          <BookingDetailContent
            booking={currentBooking}
            onClose={() => setSelectedBooking(null)}
            onStartProgress={handleStartProgress}
            onMarkCompleted={handleMarkCompleted}
            onAddNotes={addNotes}
            stickyFooter={true}
          />
        )}
      </ResponsiveSheet>
    </div>
  )
}
