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
  Star,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function StaffDashboard() {
  const {
    todayBookings,
    upcomingBookings,
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
  const { toast } = useToast()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refresh()
    setIsRefreshing(false)
    toast({
      title: 'รีเฟรชสำเร็จ',
      description: 'ข้อมูลได้รับการอัปเดตแล้ว',
    })
  }

  const handleStartProgress = async (bookingId: string) => {
    try {
      await startProgress(bookingId)
      toast({
        title: 'เริ่มดำเนินการ',
        description: 'เริ่มดำเนินการเรียบร้อยแล้ว',
      })
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเริ่มดำเนินการได้',
        variant: 'destructive',
      })
    }
  }

  const handleMarkCompleted = async (bookingId: string) => {
    try {
      await markAsCompleted(bookingId)
      toast({
        title: 'เสร็จสิ้น',
        description: 'ทำเครื่องหมายเสร็จสิ้นเรียบร้อยแล้ว',
      })
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถทำเครื่องหมายเสร็จสิ้นได้',
        variant: 'destructive',
      })
    }
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>เกิดข้อผิดพลาด: {error}</AlertDescription>
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
                จัดการงานและตรวจสอบสถิติของคุณ
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-2">รีเฟรช</span>
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
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300" style={{ animationDelay: '0ms' }}>
              <StatsCard
                title="งานวันนี้"
                value={stats.jobsToday}
                icon={Briefcase}
                description="งานที่ต้องทำวันนี้"
              />
            </div>
            <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300" style={{ animationDelay: '100ms' }}>
              <StatsCard
                title="งานสัปดาห์นี้"
                value={stats.jobsThisWeek}
                icon={Calendar}
                description="งานทั้งหมดในสัปดาห์"
              />
            </div>
            <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300" style={{ animationDelay: '200ms' }}>
              <StatsCard
                title="อัตราความสำเร็จ"
                value={`${stats.completionRate}%`}
                icon={TrendingUp}
                description="30 วันล่าสุด"
              />
            </div>
            <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300" style={{ animationDelay: '300ms' }}>
              <StatsCard
                title="คะแนนเฉลี่ย"
                value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                icon={Star}
                description="จากรีวิวลูกค้า"
              />
            </div>
          </div>
        )}

        {/* Today's Bookings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              งานวันนี้
            </h2>
            {!loading && todayBookings.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {todayBookings.length} งาน
              </span>
            )}
          </div>

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
                ไม่มีงานในวันนี้ สนุกกับวันหยุดของคุณ!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayBookings.map((booking) => (
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
          )}
        </div>

        {/* Upcoming Bookings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              งานที่กำลังจะมาถึง
            </h2>
            {!loading && upcomingBookings.length > 0 && (
              <span className="text-sm text-muted-foreground">
                7 วันถัดไป ({upcomingBookings.length} งาน)
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : upcomingBookings.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ไม่มีงานที่กำลังจะมาถึงในอีก 7 วันข้างหน้า
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onViewDetails={setSelectedBooking}
                  showDate={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        booking={selectedBooking}
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onStartProgress={startProgress}
        onMarkCompleted={markAsCompleted}
        onAddNotes={addNotes}
      />
    </div>
  )
}
