import { useState, useMemo, useCallback } from 'react'
import { useStaffDashboard } from '@/hooks/useStaffDashboard'
import { useNotifications } from '@/hooks/use-notifications'
import { useDebounce } from '@/hooks/use-debounce'
import type { StaffBooking } from '@/lib/queries/staff-bookings-queries'
import { StatsCard } from '@/components/staff/stats-card'
import { SimplifiedBookingCard } from '@/components/staff/simplified-booking-card'
import { BookingDetailsModal } from '@/components/staff/booking-details-modal'
import { NotificationPrompt } from '@/components/notifications/notification-prompt'
import { BookingTabs, type TabValue } from '@/components/staff/booking-tabs'
import { EmptyState } from '@/components/staff/empty-state'
import { FloatingActionButton } from '@/components/staff/floating-action-button'
import { PerformanceChart } from '@/components/staff/performance-chart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Calendar,
  Briefcase,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Award,
  Star,
  Search,
  X,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Empty state when search returns no results
const SearchEmptyState = () => (
  <div className="text-center py-12 text-muted-foreground">
    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
    <p className="text-lg font-medium">No results found</p>
    <p className="text-sm">Try adjusting your search terms</p>
  </div>
)

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
  const searchQuery = useDebounce(searchInput, 300) // Debounce 300ms for performance
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

  const handleStartProgress = async (bookingId: string) => {
    setStartingBookingId(bookingId)
    try {
      await Promise.all([
        startProgress(bookingId),
        new Promise(resolve => setTimeout(resolve, 500))
      ])
      toast({
        title: 'Started',
        description: 'Task has been started successfully',
      })
    } catch (error) {
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
        new Promise(resolve => setTimeout(resolve, 500))
      ])
      toast({
        title: 'Completed',
        description: 'Task marked as completed successfully',
      })
    } catch (error) {
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

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'today':
        return (
          <div className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </div>
            ) : filteredTodayBookings.length === 0 ? (
              searchInput ? <SearchEmptyState /> : <EmptyState type="today" />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                  {filteredTodayBookings.slice(0, todayLimit).map((booking, index) => (
                    <div
                      key={booking.id}
                      className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <SimplifiedBookingCard
                        booking={booking}
                        onViewDetails={setSelectedBooking}
                        onStartProgress={handleStartProgress}
                        onMarkCompleted={handleMarkCompleted}
                        showDate={false}
                        isStartingProgress={startingBookingId === booking.id}
                        isCompletingProgress={completingBookingId === booking.id}
                      />
                    </div>
                  ))}
                </div>
                {filteredTodayBookings.length > todayLimit && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={() => setTodayLimit(prev => prev + 6)}
                      variant="outline"
                      size="lg"
                      className="min-h-[44px]"
                    >
                      Load More ({filteredTodayBookings.length - todayLimit} remaining)
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )

      case 'upcoming':
        return (
          <div className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </div>
            ) : filteredUpcomingBookings.length === 0 ? (
              searchInput ? <SearchEmptyState /> : <EmptyState type="upcoming" />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                  {filteredUpcomingBookings.slice(0, upcomingLimit).map((booking, index) => (
                    <div
                      key={booking.id}
                      className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <SimplifiedBookingCard
                        booking={booking}
                        onViewDetails={setSelectedBooking}
                        onStartProgress={handleStartProgress}
                        onMarkCompleted={handleMarkCompleted}
                        showDate={true}
                        isStartingProgress={startingBookingId === booking.id}
                        isCompletingProgress={completingBookingId === booking.id}
                      />
                    </div>
                  ))}
                </div>
                {filteredUpcomingBookings.length > upcomingLimit && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={() => setUpcomingLimit(prev => prev + 6)}
                      variant="outline"
                      size="lg"
                      className="min-h-[44px]"
                    >
                      Load More ({filteredUpcomingBookings.length - upcomingLimit} remaining)
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )

      case 'past':
        return (
          <div className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </div>
            ) : filteredCompletedBookings.length === 0 ? (
              searchInput ? <SearchEmptyState /> : <EmptyState type="past" />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                  {filteredCompletedBookings.slice(0, completedLimit).map((booking, index) => (
                    <div
                      key={booking.id}
                      className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <SimplifiedBookingCard
                        booking={booking}
                        onViewDetails={setSelectedBooking}
                        onStartProgress={handleStartProgress}
                        onMarkCompleted={handleMarkCompleted}
                        showDate={true}
                        isStartingProgress={startingBookingId === booking.id}
                        isCompletingProgress={completingBookingId === booking.id}
                      />
                    </div>
                  ))}
                </div>
                {filteredCompletedBookings.length > completedLimit && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={() => setCompletedLimit(prev => prev + 6)}
                      variant="outline"
                      size="lg"
                      className="min-h-[44px]"
                    >
                      Load More ({filteredCompletedBookings.length - completedLimit} remaining)
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )

      case 'stats':
        return (
          <div className="space-y-6">
            {/* Stats Cards - Responsive Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 tablet-landscape:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {loading ? (
                <>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-28 sm:h-32 rounded-2xl" />
                  ))}
                </>
              ) : (
                <>
                  <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '0ms' }}>
                    <StatsCard
                      title="Today's Tasks"
                      value={stats?.jobsToday ?? 0}
                      icon={Briefcase}
                      description="Tasks to do today"
                    />
                  </div>
                  <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '50ms' }}>
                    <StatsCard
                      title="This Week"
                      value={stats?.jobsThisWeek ?? 0}
                      icon={Calendar}
                      description="All tasks this week"
                    />
                  </div>
                  <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
                    <StatsCard
                      title="Total Tasks"
                      value={stats?.totalTasks6Months ?? 0}
                      icon={Award}
                      description="Last 6 months"
                    />
                  </div>
                  <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '150ms' }}>
                    <StatsCard
                      title="Completion"
                      value={`${stats?.completionRate ?? 0}%`}
                      icon={TrendingUp}
                      description="Last 30 days"
                    />
                  </div>
                  <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
                    <StatsCard
                      title="Rating"
                      value={stats?.averageRating && stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                      icon={Star}
                      description="From reviews"
                    />
                  </div>
                  <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '250ms' }}>
                    <StatsCard
                      title="Earnings"
                      value={`฿${(stats?.totalEarnings ?? 0).toLocaleString()}`}
                      icon={DollarSign}
                      description="This month"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Performance Chart */}
            {!loading && stats?.monthlyData && stats.monthlyData.length > 0 && (
              <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
                <PerformanceChart
                  stats={{
                    totalJobs: stats.totalTasks6Months,
                    completedJobs: 0,
                    completionRate: stats.completionRate,
                    averageRating: stats.averageRating,
                    totalRevenue: stats.totalEarnings,
                    monthlyData: stats.monthlyData,
                  }}
                />
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-gray-50 via-gray-50/50 to-primary/5">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-20 shadow-sm">
        <div className="px-3 sm:px-6 lg:px-8 py-2 tablet-landscape:py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <h1 className="text-lg tablet-landscape:text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
              My Bookings
            </h1>
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search bookings..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-8 h-9 text-sm"
                aria-label="Search bookings by ID, customer, package, address, or status"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <BookingTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        todayCount={filteredTodayBookings.length}
        upcomingCount={filteredUpcomingBookings.length}
        pastCount={filteredCompletedBookings.length}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 lg:p-8 pb-24">
        {/* Notification Permission Prompt */}
        {isSupported && !hasPermission && (
          <div className="animate-in fade-in-50 slide-in-from-top-4 duration-500 mb-4">
            <NotificationPrompt
              onRequest={requestPermission}
              isRequesting={isRequesting}
            />
          </div>
        )}

        {/* Tab Content */}
        {renderTabContent()}
      </div>

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
