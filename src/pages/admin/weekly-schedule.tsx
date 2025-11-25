import type { Booking } from '@/types'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useTeamsList } from '@/hooks/useTeams'
import { useBookingsByDateRange } from '@/hooks/useBookings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useSoftDelete } from '@/hooks/use-soft-delete'
import { ChevronLeft, ChevronRight, Download, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns'
import { BookingDetailModal } from './booking-detail-modal'
import { BookingEditModal } from '@/components/booking'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import { WeekDayColumn } from '@/components/schedule/WeekDayColumn'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { getBangkokDateString } from '@/lib/utils'
import type { BookingFormState } from '@/hooks/useBookingForm'
import type { PackageSelectionData } from '@/components/service-packages'
import { useServicePackages } from '@/hooks/useServicePackages'
import { useStaffList } from '@/hooks/useStaff'
import * as XLSX from 'xlsx'

// BookingFormState imported from @/hooks/useBookingForm

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
]

export function AdminWeeklySchedule() {
  const [selectedStaff, setSelectedStaff] = useState<string>('all')
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'staff' | 'team' | 'all'>('all')
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [weekDates, setWeekDates] = useState<Date[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editAssignmentType, setEditAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [editFormData, setEditFormData] = useState<BookingFormState>({})
  const [isEditAvailabilityOpen, setIsEditAvailabilityOpen] = useState(false)
  const [editPackageSelection, setEditPackageSelection] = useState<PackageSelectionData | null>(null)

  const { toast } = useToast()
  const { softDelete } = useSoftDelete('bookings')

  // ใช้ custom hooks สำหรับโหลดข้อมูล
  const { packages: servicePackages } = useServicePackages()
  const { staffList } = useStaffList({ role: 'staff', enableRealtime: false })
  const { teamsList: teams } = useTeamsList({ enableRealtime: false })

  // Calculate week dates based on currentWeekStart
  const calculateWeekDates = useCallback((weekStart: Date) => {
    const dates = []
    for (let i = 0; i < 7; i++) {
      // Create new date in local timezone to avoid timezone issues
      const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [])

  useEffect(() => {
    setWeekDates(calculateWeekDates(currentWeekStart))
  }, [currentWeekStart, calculateWeekDates])

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1))
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1))
  }

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  // Helper function สำหรับ format date
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // โหลด bookings ตาม week date range และ filters
  const {
    bookings,
    isLoading,
    refetch: refetchBookings,
  } = useBookingsByDateRange({
    dateRange: {
      start: weekDates.length > 0 ? formatLocalDate(weekDates[0]) : '',
      end: weekDates.length > 0 ? formatLocalDate(weekDates[6]) : '',
    },
    filters: {
      viewMode,
      staffId: selectedStaff !== 'all' ? selectedStaff : undefined,
      teamId: selectedTeam !== 'all' ? selectedTeam : undefined,
    },
    enableRealtime: true,
    enabled: weekDates.length === 7, // Only fetch when weekDates is ready
  })

  // Service packages, staff, teams โหลดผ่าน hooks แล้ว
  // Bookings โหลดผ่าน useBookingsByDateRange hook แล้ว

  const calculateBookingPosition = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    const calendarStart = 8 * 60
    const calendarEnd = 20 * 60
    const totalMinutes = calendarEnd - calendarStart

    const top = ((startMinutes - calendarStart) / totalMinutes) * 100
    const height = ((endMinutes - startMinutes) / totalMinutes) * 100

    return { top: `${Math.max(0, top)}%`, height: `${height}%` }
  }

  // Memoize helper functions to prevent unnecessary re-renders
  const doBookingsOverlap = useCallback((booking1: Booking, booking2: Booking) => {
    const [start1Hour, start1Min] = booking1.start_time.split(':').map(Number)
    const [end1Hour, end1Min] = booking1.end_time.split(':').map(Number)
    const [start2Hour, start2Min] = booking2.start_time.split(':').map(Number)
    const [end2Hour, end2Min] = booking2.end_time.split(':').map(Number)

    const start1 = start1Hour * 60 + start1Min
    const end1 = end1Hour * 60 + end1Min
    const start2 = start2Hour * 60 + start2Min
    const end2 = end2Hour * 60 + end2Min

    return start1 < end2 && start2 < end1
  }, [])

  const getBookingLayout = useCallback((dayBookings: Booking[]) => {
    const layouts: Array<{
      booking: Booking
      column: number
      totalColumns: number
    }> = []

    dayBookings.forEach((booking, index) => {
      const overlapping = dayBookings.filter((other, otherIndex) => {
        if (index === otherIndex) return false
        return doBookingsOverlap(booking, other)
      })

      let column = 0
      const columnsUsed = new Set<number>()

      overlapping.forEach((other) => {
        const otherIndex = dayBookings.indexOf(other)
        if (otherIndex < index) {
          const otherLayout = layouts[otherIndex]
          if (otherLayout) {
            columnsUsed.add(otherLayout.column)
          }
        }
      })

      while (columnsUsed.has(column)) {
        column++
      }

      const totalColumns = overlapping.length + 1

      layouts.push({
        booking,
        column,
        totalColumns,
      })
    })

    return layouts
  }, [doBookingsOverlap])

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailModalOpen(true)
  }

  // Helper function: Calculate end time from start time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    if (!startTime) return ''
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60) % 24
    const endMinutes = totalMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
  }

  // Edit Booking Form Helpers
  const editForm = {
    formData: editFormData,
    handleChange: <K extends keyof BookingFormState>(field: K, value: BookingFormState[K]) => {
      setEditFormData(prev => ({ ...prev, [field]: value }))
    },
    setValues: (values: Partial<BookingFormState>) => {
      setEditFormData(prev => ({ ...prev, ...values }))
    },
    reset: () => {
      setEditFormData({})
      setEditAssignmentType('none')
    }
  }

  const handleEditBooking = (booking: Booking) => {
    // Populate edit form with booking data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bookingAny = booking as any
    setEditFormData({
      service_package_id: booking.service_package_id,
      package_v2_id: bookingAny.package_v2_id || undefined,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      address: booking.address,
      city: booking.city,
      state: booking.state,
      zip_code: booking.zip_code,
      notes: booking.notes || undefined,
      total_price: booking.total_price,
      staff_id: booking.staff_id || '',
      team_id: booking.team_id || '',
      status: booking.status,
      area_sqm: bookingAny.area_sqm || undefined,
      frequency: bookingAny.frequency || undefined,
    })

    // Set assignment type based on booking data
    if (booking.staff_id) {
      setEditAssignmentType('staff')
    } else if (booking.team_id) {
      setEditAssignmentType('team')
    } else {
      setEditAssignmentType('none')
    }

    // Set package selection for PackageSelector component
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (booking.service_package_id || ('package_v2_id' in booking && (booking as any).package_v2_id)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const packageId = ('package_v2_id' in booking && (booking as any).package_v2_id) || booking.service_package_id

      // หา package จาก unified packages (รวม V1 + V2 แล้ว)
      const pkg = servicePackages.find(p => p.id === packageId)

      if (pkg) {
        // Check if this is a V2 Tiered Pricing package
        const isTiered = 'pricing_model' in pkg && pkg.pricing_model === 'tiered'

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (isTiered && 'area_sqm' in booking && 'frequency' in booking && (booking as any).area_sqm && (booking as any).frequency) {
          // V2 Tiered Pricing - restore area and frequency
          setEditPackageSelection({
            packageId: pkg.id,
            pricingModel: 'tiered',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            areaSqm: Number((booking as any).area_sqm) || 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            frequency: ((booking as any).frequency as 1 | 2 | 4 | 8) || 1,
            price: booking.total_price || 0,
            requiredStaff: 1, // Will be recalculated by PackageSelector
            packageName: pkg.name,
          })
        } else {
          // Fixed Pricing (V1 หรือ V2)
          setEditPackageSelection({
            packageId: pkg.id,
            pricingModel: 'fixed',
            price: Number(pkg.base_price || booking.total_price || 0),
            requiredStaff: 1,
            packageName: pkg.name,
            estimatedHours: pkg.duration_minutes ? pkg.duration_minutes / 60 : undefined,
          })
        }
      }
    }

    setSelectedBooking(booking)
    setIsEditOpen(true)
    setIsDetailModalOpen(false)
  }

  const handleStatusChange = async (bookingId: string, _currentStatus: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Status updated to ${newStatus}`,
      })

      // Refresh bookings
      refetchBookings()

      // Update selected booking if it's open
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: newStatus })
      }
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking deleted successfully',
      })

      setIsDetailModalOpen(false)
      refetchBookings()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  const archiveBooking = async (bookingId: string) => {
    const result = await softDelete(bookingId)
    if (result.success) {
      setIsDetailModalOpen(false)
      refetchBookings()
    }
  }

  const handleMarkAsPaid = async (bookingId: string, method: string = 'cash') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          payment_method: method,
          amount_paid: selectedBooking?.total_price || 0,
          payment_date: getBangkokDateString(),
        })
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking marked as paid',
      })

      if (selectedBooking) {
        setSelectedBooking({
          ...selectedBooking,
          payment_status: 'paid',
          payment_method: method,
          amount_paid: selectedBooking.total_price,
          payment_date: getBangkokDateString(),
        })
      }

      refetchBookings()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
      confirmed: { className: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Confirmed' },
      in_progress: { className: 'bg-purple-100 text-purple-800 border-purple-200', label: 'In Progress' },
      completed: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' },
      cancelled: { className: 'bg-red-100 text-red-800 border-red-200', label: 'Cancelled' },
      no_show: { className: 'bg-red-100 text-red-800 border-red-200', label: 'No Show' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      label: status,
    }

    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  const getPaymentStatusBadge = (status?: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Paid</Badge>
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Partial</Badge>
      case 'refunded':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-300">Refunded</Badge>
      default:
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Unpaid</Badge>
    }
  }

  const getAvailableStatuses = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      pending: ['pending', 'confirmed', 'cancelled'],
      confirmed: ['confirmed', 'in_progress', 'cancelled', 'no_show'],
      in_progress: ['in_progress', 'completed', 'cancelled'],
      completed: ['completed'],
      cancelled: ['cancelled'],
      no_show: ['no_show'],
    }
    return transitions[currentStatus] || [currentStatus]
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No Show',
    }
    return labels[status] || status
  }

  const handleExportSchedule = () => {
    try {
      // เตรียมข้อมูลสำหรับ Excel
      const data = bookings.map(booking => {
        const date = new Date(booking.booking_date)
        const dayName = format(date, 'EEEE')
        const dateStr = format(date, 'MMM dd, yyyy')

        // หา staff/team name
        let assignedTo = 'Unassigned'
        if (booking.staff_id) {
          const staff = staffList.find(s => s.id === booking.staff_id)
          assignedTo = staff ? `${staff.full_name} (Staff)` : 'Unknown Staff'
        } else if (booking.team_id) {
          const team = teams.find(t => t.id === booking.team_id)
          assignedTo = team ? `${team.name} (Team)` : 'Unknown Team'
        }

        return {
          'Date': dateStr,
          'Day': dayName,
          'Start Time': booking.start_time,
          'End Time': booking.end_time,
          'Customer': booking.customers?.full_name || 'N/A',
          'Service': booking.service_packages?.name || booking.service_packages_v2?.name || 'N/A',
          'Staff/Team': assignedTo,
          'Status': getStatusLabel(booking.status),
          'Payment': booking.payment_status === 'paid' ? 'Paid' : 'Unpaid',
          'Price (฿)': booking.total_price
        }
      })

      // สร้าง worksheet
      const worksheet = XLSX.utils.json_to_sheet(data)

      // กำหนด column widths
      worksheet['!cols'] = [
        { wch: 15 }, // Date
        { wch: 12 }, // Day
        { wch: 12 }, // Start Time
        { wch: 12 }, // End Time
        { wch: 20 }, // Customer
        { wch: 25 }, // Service
        { wch: 20 }, // Staff/Team
        { wch: 12 }, // Status
        { wch: 10 }, // Payment
        { wch: 12 }, // Price
      ]

      // สร้าง workbook
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Weekly Schedule')

      // เพิ่ม Summary sheet
      const summaryData = [
        { 'Metric': 'Week Range', 'Value': `${weekStart} - ${weekEnd}` },
        { 'Metric': 'Total Bookings', 'Value': weekStats.totalBookings },
        { 'Metric': 'Confirmed', 'Value': weekStats.confirmedBookings },
        { 'Metric': 'Completed', 'Value': weekStats.completedBookings },
        { 'Metric': 'Busiest Day', 'Value': `${weekStats.busiestDay} (${weekStats.busiestDayCount} bookings)` },
      ]

      if (viewMode === 'staff' && selectedStaff !== 'all') {
        summaryData.push({ 'Metric': 'Staff', 'Value': selectedStaffData?.full_name || 'Unknown' })
      } else if (viewMode === 'team' && selectedTeam !== 'all') {
        summaryData.push({ 'Metric': 'Team', 'Value': selectedTeamData?.name || 'Unknown' })
      }

      const summarySheet = XLSX.utils.json_to_sheet(summaryData)
      summarySheet['!cols'] = [{ wch: 20 }, { wch: 40 }]
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

      // Download file
      const fileName = `weekly-schedule-${weekStart.replace(' ', '-')}-${weekEnd.replace(', ', '-').replace(' ', '-')}.xlsx`
      XLSX.writeFile(workbook, fileName)

      toast({
        title: 'Export Successful',
        description: 'Schedule exported to Excel file',
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export Failed',
        description: 'Failed to export schedule',
        variant: 'destructive',
      })
    }
  }

  const selectedStaffData = staffList.find((s) => s.id === selectedStaff)
  const selectedTeamData = teams.find((t) => t.id === selectedTeam)

  // OPTIMIZATION 2: Pre-calculate bookings grouped by date for O(1) lookup (เหมือน Calendar)
  // Loop ครั้งเดียวผ่าน bookings แทนที่จะ filter 7 ครั้ง
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>()
    bookings.forEach(booking => {
      const dateKey = booking.booking_date // Already in 'yyyy-MM-dd' format
      const existing = map.get(dateKey)
      if (existing) {
        existing.push(booking) // Mutate existing array instead of creating new one
      } else {
        map.set(dateKey, [booking])
      }
    })
    return map
  }, [bookings])

  // Helper: Get bookings for a day index using date string lookup
  const getBookingsForDayIndex = useCallback((dayIndex: number): Booking[] => {
    const date = weekDates[dayIndex]
    if (!date) return []

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    return bookingsByDate.get(dateStr) || []
  }, [weekDates, bookingsByDate])

  // OPTIMIZATION 3: Memoize booking layouts per day to avoid O(n²) calculations every render
  const bookingLayoutsByDay = useMemo(() => {
    const layoutsMap = new Map<number, Array<{
      booking: Booking
      column: number
      totalColumns: number
    }>>()

    // Calculate layout for each day
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayBookings = getBookingsForDayIndex(dayIndex)
      layoutsMap.set(dayIndex, getBookingLayout(dayBookings))
    }

    return layoutsMap
  }, [getBookingsForDayIndex, getBookingLayout])

  // OPTIMIZATION 1: Memoize weekStats calculation to avoid re-computing every render
  const weekStats = useMemo(() => {
    const totalBookings = bookings.length
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'in_progress').length
    const completedBookings = bookings.filter(b => b.status === 'completed').length

    // Find busiest day using helper function
    const bookingsByDay = DAYS_OF_WEEK.map((_, index) => ({
      day: DAYS_OF_WEEK[index],
      count: getBookingsForDayIndex(index).length
    }))
    const busiestDay = bookingsByDay.reduce((max, day) => day.count > max.count ? day : max, bookingsByDay[0])

    return {
      totalBookings,
      confirmedBookings,
      completedBookings,
      busiestDay: busiestDay.day,
      busiestDayCount: busiestDay.count
    }
  }, [bookings, getBookingsForDayIndex])

  const weekStart = weekDates[0] ? format(weekDates[0], 'MMM dd') : ''
  const weekEnd = weekDates[6] ? format(weekDates[6], 'MMM dd, yyyy') : ''

  // Show loading state until bookings are ready (not just isLoading from hook)
  // This prevents showing 0 values while useMemo calculations are pending
  if (isLoading || weekDates.length === 0) {
    return (
      <div className="space-y-6">
        {/* Page header skeleton - ตรงกับของจริง */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[40px]">
          <p className="text-sm text-muted-foreground">
            View weekly booking schedules for staff and teams
          </p>
          <Button variant="outline" disabled>
            <Download className="h-4 w-4 mr-2" />
            Export Schedule
          </Button>
        </div>

        {/* Filters skeleton - ตรงกับของจริง */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* View Mode Toggle skeleton */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-[380px]" />
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-border mx-1"></div>

              {/* Staff Filter skeleton */}
              <div className="flex items-center gap-2 flex-1 min-w-[250px]">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 flex-1" />
              </div>

              {/* Team Filter skeleton */}
              <div className="flex items-center gap-2 flex-1 min-w-[250px]">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 flex-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week navigation and calendar skeleton - ตรงกับของจริง */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 7-day grid skeleton */}
            <div className="grid grid-cols-7 gap-2 min-h-[600px]">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  {/* Day header */}
                  <Skeleton className="h-16 w-full rounded-md" />
                  {/* Booking slots */}
                  <Skeleton className="h-24 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[40px]">
        <p className="text-sm text-muted-foreground">
          View weekly booking schedules for staff and teams
        </p>
        <Button variant="outline" onClick={handleExportSchedule}>
          <Download className="h-4 w-4 mr-2" />
          Export Schedule
        </Button>
      </div>

      {/* Filters and View Mode */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium whitespace-nowrap">View Mode:</Label>
              <div className="inline-flex rounded-md shadow-sm w-full max-w-[380px]" role="group">
                <Button
                  variant={viewMode === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewMode('all')
                    setSelectedStaff('all')
                    setSelectedTeam('all')
                  }}
                  className="rounded-r-none flex-1 h-8 text-xs"
                >
                  All Bookings
                </Button>
                <Button
                  variant={viewMode === 'staff' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewMode('staff')
                    setSelectedTeam('all')
                  }}
                  className="rounded-none border-l-0 flex-1 h-8 text-xs"
                >
                  Staff View
                </Button>
                <Button
                  variant={viewMode === 'team' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewMode('team')
                    setSelectedStaff('all')
                  }}
                  className="rounded-l-none border-l-0 flex-1 h-8 text-xs"
                >
                  Team View
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-border mx-1"></div>

            {/* Staff Filter */}
            <div className="flex items-center gap-2 flex-1 min-w-[250px]">
              <Label htmlFor="staff_select" className="text-xs font-medium whitespace-nowrap">
                Select Staff:
              </Label>
              <Select
                value={selectedStaff}
                onValueChange={setSelectedStaff}
                disabled={viewMode !== 'staff'}
              >
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue placeholder="Choose staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staffList.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Filter */}
            <div className="flex items-center gap-2 flex-1 min-w-[250px]">
              <Label htmlFor="team_select" className="text-xs font-medium whitespace-nowrap">
                Select Team:
              </Label>
              <Select
                value={selectedTeam}
                onValueChange={setSelectedTeam}
                disabled={viewMode !== 'team'}
              >
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue placeholder="Choose team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Calendar Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display flex items-center gap-2 flex-wrap">
              <Calendar className="h-5 w-5" />
              {weekStart} - {weekEnd}
              <span className="text-sm font-normal text-muted-foreground">
                -
                {viewMode === 'staff' ? (
                  selectedStaff === 'all' ? ' All Staff' : selectedStaffData ? ` ${selectedStaffData.full_name}` : ' Staff'
                ) : viewMode === 'team' ? (
                  selectedTeam === 'all' ? ' All Teams' : selectedTeamData ? ` ${selectedTeamData.name}` : ' Team'
                ) : (
                  ' All Bookings (Staff & Team)'
                )}
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="flex gap-2">
              {/* Time column */}
              <div className="flex flex-col w-20 flex-shrink-0">
                <div className="h-12 border-b font-medium text-sm text-muted-foreground flex items-center">
                  Time
                </div>
                <div className="relative" style={{ height: '720px' }}>
                  {TIME_SLOTS.map((time, index) => (
                    <div
                      key={time}
                      className="absolute w-full text-sm font-medium text-muted-foreground"
                      style={{ top: `${(index / TIME_SLOTS.length) * 100}%` }}
                    >
                      {time}
                    </div>
                  ))}
                </div>
              </div>

              {/* Day columns */}
              {DAYS_OF_WEEK.map((day, dayIndex) => {
                const date = weekDates[dayIndex]
                const dayBookings = getBookingsForDayIndex(dayIndex)
                const isToday = date ? format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') : false

                return (
                  <WeekDayColumn
                    key={dayIndex}
                    day={day}
                    dayIndex={dayIndex}
                    date={date}
                    isToday={isToday}
                    dayBookings={dayBookings}
                    bookingLayouts={bookingLayoutsByDay.get(dayIndex) || []}
                    calculateBookingPosition={calculateBookingPosition}
                    onBookingClick={handleBookingClick}
                  />
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Status Legend</h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-tinedy-blue rounded"></div>
                <span>Confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Cancelled</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onEdit={() => selectedBooking && handleEditBooking(selectedBooking)}
          onCancel={archiveBooking}
          onDelete={handleDeleteBooking}
          onStatusChange={handleStatusChange}
          onMarkAsPaid={handleMarkAsPaid}
          getStatusBadge={getStatusBadge}
          getPaymentStatusBadge={getPaymentStatusBadge}
          getAvailableStatuses={getAvailableStatuses}
          getStatusLabel={getStatusLabel}
        />
      )}

      {/* Edit Booking Modal */}
      {selectedBooking && (
        <BookingEditModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false)
            editForm.reset()
          }}
          booking={selectedBooking}
          onSuccess={() => {
            refetchBookings()
          }}
          servicePackages={servicePackages}
          staffMembers={staffList}
          teams={teams}
          onOpenAvailabilityModal={() => {
            setIsEditOpen(false)
            setIsEditAvailabilityOpen(true)
          }}
          onBeforeOpenAvailability={(formData) => {
            // Sync form data from BookingEditModal to editForm before opening availability modal
            editForm.setValues({
              booking_date: formData.booking_date || '',
              start_time: formData.start_time || '',
              end_time: formData.end_time || '',
              service_package_id: formData.service_package_id || '',
              package_v2_id: formData.package_v2_id || '',
              staff_id: formData.staff_id || '',
              team_id: formData.team_id || '',
              total_price: formData.total_price || 0,
              area_sqm: formData.area_sqm || null,
              frequency: formData.frequency || null,
            })
          }}
          editForm={editForm}
          assignmentType={editAssignmentType}
          onAssignmentTypeChange={setEditAssignmentType}
          calculateEndTime={calculateEndTime}
          packageSelection={editPackageSelection}
          setPackageSelection={setEditPackageSelection}
          defaultStaffId={editForm.formData.staff_id}
          defaultTeamId={editForm.formData.team_id}
        />
      )}

      {/* Staff Availability Modal - Edit */}
      {(editFormData.service_package_id || editFormData.package_v2_id) && editFormData.booking_date && editFormData.start_time && (
        <StaffAvailabilityModal
          isOpen={isEditAvailabilityOpen}
          onClose={() => {
            setIsEditAvailabilityOpen(false)
            setIsEditOpen(true)
          }}
          assignmentType={editAssignmentType === 'staff' ? 'individual' : 'team'}
          onSelectStaff={(staffId) => {
            editForm.handleChange('staff_id', staffId)
            editForm.handleChange('team_id', '') // Clear team when staff is selected
            setIsEditAvailabilityOpen(false)
            setIsEditOpen(true)
            toast({
              title: 'Staff Selected',
              description: 'Staff member has been assigned to the booking',
            })
          }}
          onSelectTeam={(teamId) => {
            editForm.handleChange('team_id', teamId)
            editForm.handleChange('staff_id', '') // Clear staff when team is selected
            setIsEditAvailabilityOpen(false)
            setIsEditOpen(true)
            toast({
              title: 'Team Selected',
              description: 'Team has been assigned to the booking',
            })
          }}
          date={editFormData.booking_date || ''}
          startTime={editFormData.start_time || ''}
          endTime={
            (editFormData.service_package_id || editFormData.package_v2_id) && editFormData.start_time
              ? calculateEndTime(
                  editFormData.start_time,
                  servicePackages.find(pkg => pkg.id === (editFormData.service_package_id || editFormData.package_v2_id))?.duration_minutes || 0
                )
              : (editFormData.end_time || '')
          }
          servicePackageId={editFormData.service_package_id || editFormData.package_v2_id || ''}
          servicePackageName={
            servicePackages.find(pkg => pkg.id === (editFormData.service_package_id || editFormData.package_v2_id))?.name
          }
          currentAssignedStaffId={editFormData.staff_id}
          currentAssignedTeamId={editFormData.team_id}
          excludeBookingId={selectedBooking?.id}
        />
      )}
    </div>
  )
}
