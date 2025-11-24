import { useState } from 'react'
import { useStaffDashboard } from '@/hooks/useStaffDashboard'
import { useNotifications } from '@/hooks/use-notifications'
import type { StaffBooking } from '@/lib/queries/staff-bookings-queries'
import { StatsCard } from '@/components/staff/stats-card'
import { BookingCard } from '@/components/staff/booking-card'
import { BookingDetailsModal } from '@/components/staff/booking-details-modal'
import { NotificationPrompt } from '@/components/notifications/notification-prompt'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Calendar,
  Briefcase,
  TrendingUp,
  DollarSign,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
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

  const [selectedBooking, setSelectedBooking] = useState<StaffBooking | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [startingBookingId, setStartingBookingId] = useState<string | null>(null)
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null)
  const [todayLimit, setTodayLimit] = useState(6)
  const [upcomingLimit, setUpcomingLimit] = useState(6)
  const [completedLimit, setCompletedLimit] = useState(6)
  const [isStatsExpanded, setIsStatsExpanded] = useState(true)
  const [isTodayExpanded, setIsTodayExpanded] = useState(true)
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(true)
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false)
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
      // รอให้ loading แสดงอย่างน้อย 500ms เพื่อให้ผู้ใช้เห็น loading state
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
      // รอให้ loading แสดงอย่างน้อย 500ms เพื่อให้ผู้ใช้เห็น loading state
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

  // Get the latest booking data from state arrays for the modal
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50/50 to-primary/5">
      {/* Modern Header with Glassmorphism */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                My Bookings
              </h1>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="min-h-[40px] sm:min-h-[44px] bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-primary/20 text-primary hover:text-primary transition-all duration-200 active:scale-95 font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-2">Refresh</span>
            </Button>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Manage your tasks and check your statistics
          </p>
        </div>
      </div>

      <div className="p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">
        {/* Notification Permission Prompt */}
        {isSupported && !hasPermission && (
          <div className="animate-in fade-in-50 slide-in-from-top-4 duration-500">
            <NotificationPrompt
              onRequest={requestPermission}
              isRequesting={isRequesting}
            />
          </div>
        )}

        {/* Modern Stats Cards Section with Toggle */}
        <section>
          <div
            className="group flex items-center justify-between mb-3 sm:mb-4 md:mb-6 cursor-pointer hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent rounded-xl p-2 sm:p-3 -m-2 sm:-m-3 transition-all duration-200 active:scale-[0.99]"
            onClick={() => setIsStatsExpanded(!isStatsExpanded)}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                Overview
              </h2>
            </div>
            <div className="shrink-0 ml-2">
              {isStatsExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </div>
          </div>

          {isStatsExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
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
          )}
        </section>

        {/* Today's Bookings - Modern Section */}
        <section className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '400ms' }}>
          <div
            className="group flex items-center justify-between mb-4 sm:mb-6 cursor-pointer hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent rounded-xl p-2 sm:p-3 -m-2 sm:-m-3 transition-all duration-200 active:scale-[0.99]"
            onClick={() => setIsTodayExpanded(!isTodayExpanded)}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                Today's Tasks
              </h2>
              {!loading && todayBookings.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary shrink-0">
                  {todayBookings.length}
                </span>
              )}
            </div>
            <div className="shrink-0 ml-2">
              {isTodayExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </div>
          </div>

          {isTodayExpanded && (
            <>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-56 sm:h-64 rounded-2xl" />
                  ))}
                </div>
              ) : todayBookings.length === 0 ? (
                <Alert className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900 dark:text-amber-200">
                    No tasks today. Enjoy your day off!
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
                    {todayBookings.slice(0, todayLimit).map((booking, index) => (
                      <div
                        key={booking.id}
                        className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <BookingCard
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
                        className="min-h-[44px] bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 border-primary/20 text-primary transition-all duration-200 active:scale-95 font-medium"
                      >
                        Load More ({todayBookings.length - todayLimit} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>

        {/* Upcoming Bookings - Modern Section */}
        <section className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '500ms' }}>
          <div
            className="group flex items-center justify-between mb-4 sm:mb-6 cursor-pointer hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent rounded-xl p-2 sm:p-3 -m-2 sm:-m-3 transition-all duration-200 active:scale-[0.99]"
            onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="rounded-lg bg-blue-500/10 p-2 group-hover:bg-blue-500/20 transition-colors">
                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                Upcoming Tasks
              </h2>
              {!loading && upcomingBookings.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 shrink-0">
                  {upcomingBookings.length}
                </span>
              )}
            </div>
            <div className="shrink-0 ml-2">
              {isUpcomingExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
              )}
            </div>
          </div>

          {isUpcomingExpanded && (loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-56 sm:h-64 rounded-2xl" />
              ))}
            </div>
          ) : upcomingBookings.length === 0 ? (
            <Alert className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 dark:text-blue-200">
                No upcoming tasks in the next 7 days
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
                {upcomingBookings.slice(0, upcomingLimit).map((booking, index) => (
                  <div
                    key={booking.id}
                    className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <BookingCard
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
                    className="min-h-[44px] bg-gradient-to-r from-blue-500/5 to-blue-500/10 hover:from-blue-500/10 hover:to-blue-500/20 border-blue-500/20 text-blue-600 transition-all duration-200 active:scale-95 font-medium"
                  >
                    Load More ({upcomingBookings.length - upcomingLimit} remaining)
                  </Button>
                </div>
              )}
            </>
          ))}
        </section>

        {/* Past Bookings - Modern Section */}
        <section className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '600ms' }}>
          <div
            className="group flex items-center justify-between mb-4 sm:mb-6 cursor-pointer hover:bg-gradient-to-r hover:from-green-500/5 hover:to-transparent rounded-xl p-2 sm:p-3 -m-2 sm:-m-3 transition-all duration-200 active:scale-[0.99]"
            onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="rounded-lg bg-green-500/10 p-2 group-hover:bg-green-500/20 transition-colors">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                Past Tasks
              </h2>
              {!loading && completedBookings.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 shrink-0">
                  {completedBookings.length}
                </span>
              )}
            </div>
            <div className="shrink-0 ml-2">
              {isCompletedExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground group-hover:text-green-600 transition-colors" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-green-600 transition-colors" />
              )}
            </div>
          </div>

          {isCompletedExpanded && (loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-56 sm:h-64 rounded-2xl" />
              ))}
            </div>
          ) : completedBookings.length === 0 ? (
            <Alert className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900 dark:text-green-200">
                No past tasks in the last 30 days
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
                {completedBookings.slice(0, completedLimit).map((booking, index) => (
                  <div
                    key={booking.id}
                    className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <BookingCard
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
                    className="min-h-[44px] bg-gradient-to-r from-green-500/5 to-green-500/10 hover:from-green-500/10 hover:to-green-500/20 border-green-500/20 text-green-600 transition-all duration-200 active:scale-95 font-medium"
                  >
                    Load More ({completedBookings.length - completedLimit} remaining)
                  </Button>
                </div>
              )}
            </>
          ))}
        </section>
      </div>

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
