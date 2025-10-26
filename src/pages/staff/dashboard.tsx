import { useState } from 'react'
import { useStaffBookings, type StaffBooking } from '@/hooks/use-staff-bookings'
import { useNotifications } from '@/hooks/use-notifications'
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
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function StaffDashboard() {
  const {
    todayBookings,
    upcomingBookings,
    completedBookings,
    stats,
    loading,
    error,
    startProgress,
    markAsCompleted,
    addNotes,
    refresh,
  } = useStaffBookings()

  const {
    hasPermission,
    isRequesting,
    requestPermission,
    isSupported,
  } = useNotifications()

  const [selectedBooking, setSelectedBooking] = useState<StaffBooking | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [todayLimit, setTodayLimit] = useState(6)
  const [upcomingLimit, setUpcomingLimit] = useState(6)
  const [completedLimit, setCompletedLimit] = useState(6)
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
    try {
      await startProgress(bookingId)
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
    }
  }

  const handleMarkCompleted = async (bookingId: string) => {
    try {
      await markAsCompleted(bookingId)
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
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                My Bookings
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your tasks and check your statistics
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-2">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Notification Permission Prompt */}
        {isSupported && !hasPermission && (
          <NotificationPrompt
            onRequest={requestPermission}
            isRequesting={isRequesting}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </>
          ) : (
            <>
              <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300" style={{ animationDelay: '0ms' }}>
                <StatsCard
                  title="Today's Tasks"
                  value={stats.jobsToday}
                  icon={Briefcase}
                  description="Tasks to do today"
                />
              </div>
              <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300" style={{ animationDelay: '100ms' }}>
                <StatsCard
                  title="This Week's Tasks"
                  value={stats.jobsThisWeek}
                  icon={Calendar}
                  description="All tasks this week"
                />
              </div>
              <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300" style={{ animationDelay: '200ms' }}>
                <StatsCard
                  title="Completion Rate"
                  value={`${stats.completionRate}%`}
                  icon={TrendingUp}
                  description="Last 30 days"
                />
              </div>
              <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300" style={{ animationDelay: '300ms' }}>
                <StatsCard
                  title="This Month's Earnings"
                  value={`฿${stats.totalEarnings.toLocaleString()}`}
                  icon={DollarSign}
                  description="Earnings from completed tasks"
                />
              </div>
            </>
          )}
        </div>

        {/* Today's Bookings */}
        <div>
          <div
            className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
            onClick={() => setIsTodayExpanded(!isTodayExpanded)}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Today's Tasks
              </h2>
              {!loading && todayBookings.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  ({todayBookings.length} {todayBookings.length === 1 ? 'task' : 'tasks'})
                </span>
              )}
            </div>
            {isTodayExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {isTodayExpanded && (
            <>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : todayBookings.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No tasks today. Enjoy your day off!
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {todayBookings.slice(0, todayLimit).map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        onViewDetails={setSelectedBooking}
                        onStartProgress={handleStartProgress}
                        onMarkCompleted={handleMarkCompleted}
                        showDate={false}
                      />
                    ))}
                  </div>
                  {todayBookings.length > todayLimit && (
                    <div className="flex justify-center mt-4">
                      <Button
                        onClick={() => setTodayLimit(prev => prev + 6)}
                        variant="outline"
                        className="transition-all duration-200 hover:scale-105"
                      >
                        Load More +6 ({todayBookings.length - todayLimit} {todayBookings.length - todayLimit === 1 ? 'task' : 'tasks'} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Upcoming Bookings */}
        <div>
          <div
            className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
            onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Upcoming Tasks
              </h2>
              {!loading && upcomingBookings.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Next 7 days ({upcomingBookings.length} {upcomingBookings.length === 1 ? 'task' : 'tasks'})
                </span>
              )}
            </div>
            {isUpcomingExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {isUpcomingExpanded && (loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : upcomingBookings.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No upcoming tasks in the next 7 days
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingBookings.slice(0, upcomingLimit).map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onViewDetails={setSelectedBooking}
                    onStartProgress={handleStartProgress}
                    onMarkCompleted={handleMarkCompleted}
                    showDate={true}
                  />
                ))}
              </div>
              {upcomingBookings.length > upcomingLimit && (
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={() => setUpcomingLimit(prev => prev + 6)}
                    variant="outline"
                    className="transition-all duration-200 hover:scale-105"
                  >
                    Load More +6 ({upcomingBookings.length - upcomingLimit} {upcomingBookings.length - upcomingLimit === 1 ? 'task' : 'tasks'} remaining)
                  </Button>
                </div>
              )}
            </>
          ))}
        </div>

        {/* Past Bookings */}
        <div>
          <div
            className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
            onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-gray-600" />
                Past Tasks
              </h2>
              {!loading && completedBookings.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Last 30 days ({completedBookings.length} {completedBookings.length === 1 ? 'task' : 'tasks'})
                </span>
              )}
            </div>
            {isCompletedExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {isCompletedExpanded && (loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : completedBookings.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No past tasks in the last 30 days
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedBookings.slice(0, completedLimit).map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onViewDetails={setSelectedBooking}
                    onStartProgress={handleStartProgress}
                    onMarkCompleted={handleMarkCompleted}
                    showDate={true}
                  />
                ))}
              </div>
              {completedBookings.length > completedLimit && (
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={() => setCompletedLimit(prev => prev + 6)}
                    variant="outline"
                    className="transition-all duration-200 hover:scale-105"
                  >
                    Load More +6 ({completedBookings.length - completedLimit} {completedBookings.length - completedLimit === 1 ? 'task' : 'tasks'} remaining)
                  </Button>
                </div>
              )}
            </>
          ))}
        </div>
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
