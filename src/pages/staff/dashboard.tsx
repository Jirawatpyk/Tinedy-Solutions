import { useState } from 'react'
import { useStaffDashboard } from '@/hooks/useStaffDashboard'
import { useNotifications } from '@/hooks/use-notifications'
import type { StaffBooking } from '@/lib/queries/staff-bookings-queries'
import { StatsCard } from '@/components/staff/stats-card'
import { SimplifiedBookingCard } from '@/components/staff/simplified-booking-card'
import { BookingDetailsModal } from '@/components/staff/booking-details-modal'
import { NotificationPrompt } from '@/components/notifications/notification-prompt'
import { BookingTabs, type TabValue } from '@/components/staff/booking-tabs'
import { EmptyState } from '@/components/staff/empty-state'
import { FloatingActionButton } from '@/components/staff/floating-action-button'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Calendar,
  Briefcase,
  TrendingUp,
  DollarSign,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
  const { toast } = useToast()

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </div>
            ) : todayBookings.length === 0 ? (
              <EmptyState type="today" />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {todayBookings.slice(0, todayLimit).map((booking, index) => (
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
                {todayBookings.length > todayLimit && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={() => setTodayLimit(prev => prev + 6)}
                      variant="outline"
                      size="lg"
                      className="min-h-[44px]"
                    >
                      Load More ({todayBookings.length - todayLimit} remaining)
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </div>
            ) : upcomingBookings.length === 0 ? (
              <EmptyState type="upcoming" />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {upcomingBookings.slice(0, upcomingLimit).map((booking, index) => (
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
                {upcomingBookings.length > upcomingLimit && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={() => setUpcomingLimit(prev => prev + 6)}
                      variant="outline"
                      size="lg"
                      className="min-h-[44px]"
                    >
                      Load More ({upcomingBookings.length - upcomingLimit} remaining)
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </div>
            ) : completedBookings.length === 0 ? (
              <EmptyState type="past" />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {completedBookings.slice(0, completedLimit).map((booking, index) => (
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
                {completedBookings.length > completedLimit && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={() => setCompletedLimit(prev => prev + 6)}
                      variant="outline"
                      size="lg"
                      className="min-h-[44px]"
                    >
                      Load More ({completedBookings.length - completedLimit} remaining)
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {loading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 sm:h-36 rounded-2xl" />
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
                  <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
                    <StatsCard
                      title="This Week's Tasks"
                      value={stats?.jobsThisWeek ?? 0}
                      icon={Calendar}
                      description="All tasks this week"
                    />
                  </div>
                  <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
                    <StatsCard
                      title="Completion Rate"
                      value={`${stats?.completionRate ?? 0}%`}
                      icon={TrendingUp}
                      description="Last 30 days"
                    />
                  </div>
                  <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
                    <StatsCard
                      title="This Month's Earnings"
                      value={`฿${stats?.totalEarnings.toLocaleString() ?? '0'}`}
                      icon={DollarSign}
                      description="Earnings from completed tasks"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )
    }
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-gray-50 via-gray-50/50 to-primary/5">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-20 shadow-sm">
        <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
              My Bookings
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Manage your tasks efficiently
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <BookingTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        todayCount={todayBookings.length}
        upcomingCount={upcomingBookings.length}
        pastCount={completedBookings.length}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-24">
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
