import { useState, useMemo, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Booking } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useSoftDelete } from '@/hooks/use-soft-delete'
import { BookingDetailModal } from './booking-detail-modal'
import { BookingCreateModal, BookingEditModal } from '@/components/booking'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import { CalendarCell } from '@/components/calendar/CalendarCell'
import { BookingListSidebar } from '@/components/calendar/BookingListSidebar'
import { CalendarFilters } from '@/components/calendar/filters/CalendarFilters'
import { MobileCalendar } from '@/components/calendar/MobileCalendar'
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'
import { useCalendarFilters } from '@/hooks/useCalendarFilters'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { getBangkokDateString } from '@/lib/utils'
import type { PackageSelectionData } from '@/components/service-packages'
import type { BookingFormState } from '@/hooks/useBookingForm'
import type { RecurringPattern } from '@/types/recurring-booking'
import { useServicePackages } from '@/hooks/useServicePackages'
import { useStaffList } from '@/hooks/useStaff'
import { useTeamsList } from '@/hooks/useTeams'
import { useBookingsByDateRange } from '@/hooks/useBookings'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
} from 'date-fns'

// BookingFormData replaced with BookingFormState from @/hooks/useBookingForm

export function AdminCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date; end: Date } | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Create Booking Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedCreateDate, setSelectedCreateDate] = useState<string>('')
  const [createAssignmentType, setCreateAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [createFormData, setCreateFormData] = useState<BookingFormState>({})
  const [isCreateAvailabilityOpen, setIsCreateAvailabilityOpen] = useState(false)

  // Edit Booking Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editAssignmentType, setEditAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [editFormData, setEditFormData] = useState<BookingFormState>({})
  const [isEditAvailabilityOpen, setIsEditAvailabilityOpen] = useState(false)

  // Package Selection State - Lifted to parent to persist across modal open/close
  const [createPackageSelection, setCreatePackageSelection] = useState<PackageSelectionData | null>(null)
  const [editPackageSelection, setEditPackageSelection] = useState<PackageSelectionData | null>(null)

  // Recurring Bookings State (for Create Modal - lifted to parent for StaffAvailabilityModal)
  const [createRecurringDates, setCreateRecurringDates] = useState<string[]>([])
  const [createRecurringPattern, setCreateRecurringPattern] = useState<RecurringPattern>('auto-monthly' as RecurringPattern)

  // Loading States for mutations
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { toast } = useToast()
  const { softDelete } = useSoftDelete('bookings')

  // Filter state management with useCalendarFilters hook
  const filterControls = useCalendarFilters()

  // Sync selectedDate/selectedDateRange with preset on initial load
  // This ensures the sidebar shows correct bookings when page loads with a saved preset
  useEffect(() => {
    const preset = filterControls.filters.preset
    if (!preset) return

    const today = new Date()

    switch (preset) {
      case 'today':
        setSelectedDate(today)
        setSelectedDateRange(null)
        break
      case 'week': {
        const weekStart = startOfWeek(today)
        const weekEnd = endOfWeek(today)
        setSelectedDate(null)
        setSelectedDateRange({ start: weekStart, end: weekEnd })
        break
      }
      case 'month': {
        const monthStart = startOfMonth(today)
        const monthEnd = endOfMonth(today)
        setSelectedDate(null)
        setSelectedDateRange({ start: monthStart, end: monthEnd })
        break
      }
      case 'upcoming': {
        const upcomingEnd = new Date(today)
        upcomingEnd.setDate(today.getDate() + 30)
        setSelectedDate(null)
        setSelectedDateRange({ start: today, end: upcomingEnd })
        break
      }
      case 'pending':
      case 'confirmed':
        // Status presets: no date selection, show all matching
        setSelectedDate(null)
        setSelectedDateRange(null)
        break
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Callback สำหรับ Preset buttons ให้เปลี่ยน currentDate
  const handlePresetDateChange = useCallback((preset: string) => {
    const today = new Date()

    switch (preset) {
      case 'today':
        setCurrentDate(today)
        setSelectedDate(today)
        setSelectedDateRange(null)
        break
      case 'week': {
        // แสดงทุก bookings ในสัปดาห์นี้
        const weekStart = startOfWeek(today)
        const weekEnd = endOfWeek(today)
        setCurrentDate(weekStart)
        setSelectedDate(null)
        setSelectedDateRange({ start: weekStart, end: weekEnd })
        break
      }
      case 'month': {
        // แสดงทุก bookings ในเดือนนี้
        const monthStart = startOfMonth(today)
        const monthEnd = endOfMonth(today)
        setCurrentDate(monthStart)
        setSelectedDate(null)
        setSelectedDateRange({ start: monthStart, end: monthEnd })
        break
      }
      case 'upcoming': {
        // แสดง bookings ที่กำลังจะมาถึง (วันนี้เป็นต้นไป 30 วัน)
        const upcomingEnd = new Date(today)
        upcomingEnd.setDate(today.getDate() + 30)
        setCurrentDate(today)
        setSelectedDate(null)
        setSelectedDateRange({ start: today, end: upcomingEnd })
        break
      }
      case 'pending':
      case 'confirmed': {
        // Status-based presets: clear date filter to show all matching bookings
        setSelectedDate(null)
        setSelectedDateRange(null)
        break
      }
    }
  }, [])

  // Callback สำหรับคลิกวันในปฏิทิน (clear date range)
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date)
    setSelectedDateRange(null) // Clear date range เมื่อเลือกวัน
  }, [])

  // ใช้ custom hooks สำหรับโหลดข้อมูล
  const { packages: servicePackages } = useServicePackages()
  const { staffList } = useStaffList({ role: 'staff', enableRealtime: false })
  const { teamsList: teams } = useTeamsList({ enableRealtime: false })

  // คำนวณ date range สำหรับ month view
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  // Memoize filters object เพื่อป้องกัน query key เปลี่ยนตลอดเวลา
  // searchQuery ไม่รวมใน query เพราะเป็น client-side filter
  // Extract filter values to separate variables for stable dependencies
  const staffIds = filterControls.filters.staffIds
  const teamIds = filterControls.filters.teamIds
  const statuses = filterControls.filters.statuses
  const searchQuery = filterControls.filters.searchQuery

  const bookingFilters = useMemo(() => {
    // ถ้าไม่มี filter เลย return undefined (stable reference)
    if (!staffIds.length && !teamIds.length && !statuses.length && !searchQuery) {
      return undefined
    }

    return {
      staffIds: staffIds.length > 0 ? staffIds : undefined,
      teamIds: teamIds.length > 0 ? teamIds : undefined,
      statuses: statuses.length > 0 ? statuses : undefined,
      // searchQuery จะถูก filter client-side ใน booking-queries.ts
      searchQuery: searchQuery || undefined,
    }
  }, [staffIds, teamIds, statuses, searchQuery])

  // โหลด bookings ตาม date range และ filters (from useCalendarFilters)
  const {
    bookings,
    isLoading,
    refetch: refetchBookings,
  } = useBookingsByDateRange({
    dateRange: {
      start: format(monthStart, 'yyyy-MM-dd'),
      end: format(monthEnd, 'yyyy-MM-dd'),
    },
    filters: bookingFilters,
  })

  // Service packages โหลดผ่าน useServicePackages hook แล้ว
  // Staff list โหลดผ่าน useStaffList hook แล้ว
  // Teams list โหลดผ่าน useTeamsList hook แล้ว
  // Bookings โหลดผ่าน useBookingsByDateRange hook แล้ว (พร้อม filters ทั้งหมดใน query)

  // OPTIMIZATION: Pre-calculate bookings grouped by date for O(1) lookup
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

  // Helper function: Get bookings for a specific date using O(1) Map lookup
  const getBookingsForDate = useCallback((date: Date): Booking[] => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return bookingsByDate.get(dateKey) || []
  }, [bookingsByDate])

  // Helper function: Check if two time ranges overlap
  const checkTimeOverlap = useCallback((
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }

    const s1 = toMinutes(start1)
    const e1 = toMinutes(end1)
    const s2 = toMinutes(start2)
    const e2 = toMinutes(end2)

    return s1 < e2 && e1 > s2
  }, [])

  // CONFLICT DETECTION: Pre-calculate conflicts for all bookings
  // Optimized with sorted time check for better performance
  const conflictMap = useMemo(() => {
    const map = new Map<string, Set<string>>() // Map<bookingId, Set<conflictingBookingIds>>

    bookings.forEach((booking) => {
      // Skip cancelled and no_show bookings
      if (booking.status === 'cancelled' || booking.status === 'no_show') return

      const conflicts = new Set<string>()

      // Find other bookings on the same date
      const sameDayBookings = bookingsByDate.get(booking.booking_date) || []

      // Sort by start time for early termination optimization
      const sortedBookings = [...sameDayBookings].sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      )

      const bookingEndTime = booking.end_time || booking.start_time

      sortedBookings.forEach((other) => {
        // Skip self, cancelled, and no_show
        if (
          other.id === booking.id ||
          other.status === 'cancelled' ||
          other.status === 'no_show'
        ) return

        // Early termination: if other booking starts after current booking ends, no more overlaps possible
        if (other.start_time > bookingEndTime) return

        // Check if assigned to same staff or team
        const sameStaff = booking.staff_id && booking.staff_id === other.staff_id
        const sameTeam = booking.team_id && booking.team_id === other.team_id

        if (!sameStaff && !sameTeam) return

        // Check time overlap
        const overlap = checkTimeOverlap(
          booking.start_time,
          bookingEndTime,
          other.start_time,
          other.end_time || other.start_time
        )

        if (overlap) {
          conflicts.add(other.id)
        }
      })

      if (conflicts.size > 0) {
        map.set(booking.id, conflicts)
      }
    })

    return map
  }, [bookings, bookingsByDate, checkTimeOverlap])

  // Pre-calculate conflict IDs grouped by date for efficient calendar rendering
  const conflictIdsByDate = useMemo(() => {
    const dateMap = new Map<string, Set<string>>() // Map<date, Set<conflictingBookingIds>>

    conflictMap.forEach((conflicts, bookingId) => {
      // Find the booking to get its date
      const booking = bookings.find(b => b.id === bookingId)
      if (!booking) return

      const date = booking.booking_date

      // Initialize Set for this date if not exists
      if (!dateMap.has(date)) {
        dateMap.set(date, new Set<string>())
      }

      const dateConflicts = dateMap.get(date)!

      // Add the booking itself and all its conflicts
      dateConflicts.add(bookingId)
      conflicts.forEach(id => dateConflicts.add(id))
    })

    return dateMap
  }, [conflictMap, bookings])

  // Helper function: Calculate end time from start time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    if (!startTime) return ''
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60) % 24
    const endMinutes = totalMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
  }

  // Create Booking Form Helpers
  const createForm = {
    formData: createFormData,
    handleChange: <K extends keyof BookingFormState>(field: K, value: BookingFormState[K]) => {
      setCreateFormData(prev => ({ ...prev, [field]: value }))
    },
    setValues: (values: Partial<BookingFormState>) => {
      setCreateFormData(prev => ({ ...prev, ...values }))
    },
    reset: () => {
      setCreateFormData({})
      setCreateAssignmentType('none')
    }
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

  const handleCreateBooking = (date: Date) => {
    // Pre-fill booking date
    const formattedDate = format(date, 'yyyy-MM-dd')
    setSelectedCreateDate(formattedDate)
    setCreateFormData({ booking_date: formattedDate })
    setIsCreateOpen(true)
  }

  const handleEditBooking = (booking: Booking) => {
    // Populate edit form with booking data
    setEditFormData({
      service_package_id: booking.service_package_id,
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
    setIsDetailOpen(false)
  }

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const openBookingDetail = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailOpen(true)
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

  const handleStatusChange = useCallback(async (bookingId: string, currentStatus: string, newStatus: string) => {
    if (currentStatus === newStatus) return

    setIsUpdatingStatus(true)

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Status changed to ${newStatus}`,
      })

      // Update selected booking if it's the same one
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: newStatus })
      }

      // Refetch bookings to update data
      await refetchBookings()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }, [toast, selectedBooking, refetchBookings])

  // Status transition validation (from useBookingStatusManager logic)
  const getValidTransitions = useCallback((currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['in_progress', 'cancelled', 'no_show'],
      in_progress: ['completed', 'cancelled'],
      completed: [], // Final state
      cancelled: [], // Final state
      no_show: [], // Final state
    }
    return transitions[currentStatus] || []
  }, [])

  // Get available statuses (current + valid transitions)
  const getAvailableStatuses = useCallback((currentStatus: string): string[] => {
    const validTransitions = getValidTransitions(currentStatus)
    return [currentStatus, ...validTransitions]
  }, [getValidTransitions])

  // Inline status change handler for BookingCard (without currentStatus parameter)
  const handleInlineStatusChange = useCallback(async (bookingId: string, newStatus: string) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (!booking) return

    // Validate transition before making the change
    const validTransitions = getValidTransitions(booking.status)
    if (!validTransitions.includes(newStatus) && booking.status !== newStatus) {
      toast({
        title: 'Invalid Status Transition',
        description: `Cannot change from "${booking.status}" to "${newStatus}".`,
        variant: 'destructive',
      })
      return
    }

    await handleStatusChange(bookingId, booking.status, newStatus)
  }, [bookings, handleStatusChange, getValidTransitions, toast])

  const handleMarkAsPaid = async (bookingId: string, method: string = 'cash') => {
    setIsUpdatingPayment(true)

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

      // Refetch bookings to update data
      await refetchBookings()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingPayment(false)
    }
  }

  const handleDelete = async (bookingId: string) => {
    setIsDeleting(true)

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
      setIsDetailOpen(false)

      // Refetch bookings to update data
      await refetchBookings()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const archiveBooking = async (bookingId: string) => {
    const result = await softDelete(bookingId)
    if (result.success) {
      setIsDetailOpen(false)
      // Refetch bookings after delete
      refetchBookings()
    }
  }

  // Generate calendar days (Memoized to prevent recalculation on every render)
  const calendarDays = useMemo(() => {
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [monthStart, monthEnd])

  // Memoize selected date/range bookings to prevent recalculation
  const selectedDateBookings = useMemo(() => {
    // ถ้าเลือก single date → แสดง bookings ของวันนั้น
    if (selectedDate) {
      return getBookingsForDate(selectedDate)
    }

    // ถ้าเลือก date range → แสดง bookings ทั้งหมดใน range
    if (selectedDateRange) {
      return bookings.filter((booking) => {
        const bookingDate = new Date(booking.booking_date)
        return bookingDate >= selectedDateRange.start && bookingDate <= selectedDateRange.end
      })
    }

    // ถ้าไม่มี date selection แต่มี active filters (preset, search, staff, team)
    // → แสดง bookings ทั้งหมดที่ผ่าน filters แล้ว
    if (filterControls.hasActiveFilters) {
      return bookings
    }

    return []
  }, [selectedDate, selectedDateRange, getBookingsForDate, bookings, filterControls.hasActiveFilters])

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Page Header - Always show */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted-foreground">View and manage your bookings</p>
          <Button variant="outline" disabled>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>

        {/* Filters skeleton */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-8 w-[380px]" />
              <Skeleton className="h-6 w-px" />
              <Skeleton className="h-8 flex-1 min-w-[200px]" />
              <Skeleton className="h-8 flex-1 min-w-[200px]" />
              <Skeleton className="h-8 flex-1 min-w-[200px]" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Skeleton */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-2xl">
                  {format(currentDate, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar Skeleton */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-display">Select a date</CardTitle>
              <p className="text-sm text-muted-foreground">
                Click on a date to view bookings
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mobile Calendar View - แสดงเฉพาะ mobile */}
      <div className="block md:hidden h-[calc(100vh-120px)]">
        <CalendarErrorBoundary>
          <MobileCalendar
            currentDate={currentDate}
            selectedDate={selectedDate}
            bookings={bookings}
            conflictMap={conflictMap}
            bookingsByDate={bookingsByDate}
            onDateSelect={handleDateClick}
            onMonthChange={setCurrentDate}
            onBookingClick={openBookingDetail}
            onCreateBooking={handleCreateBooking}
            onStatusChange={handleInlineStatusChange}
            getAvailableStatuses={getAvailableStatuses}
          />
        </CalendarErrorBoundary>
      </div>

      {/* Desktop View - ซ่อนบน mobile */}
      <div className="hidden md:block space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[40px]">
          <p className="text-sm text-muted-foreground">View and manage your bookings</p>
          <Button onClick={goToToday} variant="outline">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>

        {/* New Filter System (Sprint 2 - UX Improvements) */}
        <CalendarFilters
          filterControls={filterControls}
          onPresetDateChange={handlePresetDateChange}
        />

        <CalendarErrorBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-2xl">
                    {format(currentDate, 'MMMM yyyy')}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToPreviousMonth}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToNextMonth}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days - OPTIMIZED: Use memoized CalendarCell component */}
                {calendarDays.map((day, index) => {
                  const dayBookings = getBookingsForDate(day)
                  const dateStr = format(day, 'yyyy-MM-dd')

                  // Get pre-calculated conflict IDs for this date (OPTIMIZED)
                  const dayConflictIds = conflictIdsByDate.get(dateStr) || new Set<string>()

                  return (
                    <CalendarCell
                      key={index}
                      day={day}
                      currentDate={currentDate}
                      selectedDate={selectedDate}
                      dayBookings={dayBookings}
                      conflictingBookingIds={dayConflictIds}
                      onDateClick={handleDateClick}
                      onCreateBooking={handleCreateBooking}
                    />
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm font-semibold mb-2">Status Legend:</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>Pending</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Confirmed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Cancelled</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-gray-500" />
                    <span>No Show</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking List Sidebar */}
          <BookingListSidebar
            selectedDate={selectedDate}
            selectedDateRange={selectedDateRange}
            bookings={selectedDateBookings}
            conflictMap={conflictMap}
            onBookingClick={openBookingDetail}
            onStatusChange={handleInlineStatusChange}
            getAvailableStatuses={getAvailableStatuses}
          />
          </div>
        </CalendarErrorBoundary>
      </div>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        booking={selectedBooking}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={() => selectedBooking && handleEditBooking(selectedBooking)}
        onCancel={archiveBooking}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onMarkAsPaid={handleMarkAsPaid}
        getStatusBadge={getStatusBadge}
        getPaymentStatusBadge={getPaymentStatusBadge}
        getAvailableStatuses={getAvailableStatuses}
        getStatusLabel={getStatusLabel}
        isUpdatingStatus={isUpdatingStatus}
        isUpdatingPayment={isUpdatingPayment}
        isDeleting={isDeleting}
      />

      {/* Create Booking Modal */}
      <BookingCreateModal
        isOpen={isCreateOpen && !isCreateAvailabilityOpen}
        onClose={() => {
          setIsCreateOpen(false)
          setSelectedCreateDate('')
          setCreatePackageSelection(null)
          setCreateRecurringDates([])
          createForm.reset()
        }}
        onSuccess={() => {
          refetchBookings()
          setCreatePackageSelection(null)
          setCreateRecurringDates([])
        }}
        servicePackages={servicePackages}
        staffMembers={staffList}
        teams={teams}
        onOpenAvailabilityModal={() => {
          setIsCreateAvailabilityOpen(true)
        }}
        onBeforeOpenAvailability={(formData) => {
          // Sync form data from BookingCreateModal to createForm before opening availability modal
          createForm.setValues({
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
        assignmentType={createAssignmentType}
        setAssignmentType={setCreateAssignmentType}
        calculateEndTime={calculateEndTime}
        packageSelection={createPackageSelection}
        setPackageSelection={setCreatePackageSelection}
        defaultDate={selectedCreateDate}
        defaultStaffId={createForm.formData.staff_id}
        defaultTeamId={createForm.formData.team_id}
        recurringDates={createRecurringDates}
        setRecurringDates={setCreateRecurringDates}
        recurringPattern={createRecurringPattern}
        setRecurringPattern={setCreateRecurringPattern}
      />

      {/* Edit Booking Modal */}
      {selectedBooking && (
        <BookingEditModal
          isOpen={isEditOpen && !isEditAvailabilityOpen}
          onClose={() => {
            setIsEditOpen(false)
            editForm.reset()
          }}
          booking={selectedBooking}
          onSuccess={() => {
            refetchBookings()
            setEditPackageSelection(null) // Clear selection after success
          }}
          servicePackages={servicePackages}
          staffMembers={staffList}
          teams={teams}
          onOpenAvailabilityModal={() => {
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

      {/* Staff Availability Modal - Create */}
      {(createFormData.service_package_id || createFormData.package_v2_id) && createFormData.booking_date && createFormData.start_time && (
        <StaffAvailabilityModal
          isOpen={isCreateAvailabilityOpen}
          onClose={() => {
            setIsCreateAvailabilityOpen(false)
            setIsCreateOpen(true)
          }}
          assignmentType={createAssignmentType === 'staff' ? 'individual' : 'team'}
          onSelectStaff={(staffId) => {
            createForm.handleChange('staff_id', staffId)
            createForm.handleChange('team_id', '') // Clear team when staff is selected
            setIsCreateAvailabilityOpen(false)
            setIsCreateOpen(true)
            toast({
              title: 'Staff Selected',
              description: 'Staff member has been assigned to the booking',
            })
          }}
          onSelectTeam={(teamId) => {
            createForm.handleChange('team_id', teamId)
            createForm.handleChange('staff_id', '') // Clear staff when team is selected
            setIsCreateAvailabilityOpen(false)
            setIsCreateOpen(true)
            toast({
              title: 'Team Selected',
              description: 'Team has been assigned to the booking',
            })
          }}
          date={createRecurringDates.length === 0 ? (createFormData.booking_date || '') : undefined}
          dates={createRecurringDates.length > 0 ? createRecurringDates : undefined}
          startTime={createFormData.start_time || ''}
          endTime={
            createFormData.service_package_id && createFormData.start_time
              ? calculateEndTime(
                  createFormData.start_time,
                  servicePackages.find(pkg => pkg.id === createFormData.service_package_id)?.duration_minutes || 0
                )
              : createFormData.end_time || ''
          }
          servicePackageId={createFormData.service_package_id || createFormData.package_v2_id || ''}
          servicePackageName={
            servicePackages.find(pkg => pkg.id === createFormData.service_package_id)?.name ||
            createPackageSelection?.packageName
          }
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
            editFormData.service_package_id && editFormData.start_time
              ? calculateEndTime(
                  editFormData.start_time,
                  servicePackages.find(pkg => pkg.id === editFormData.service_package_id)?.duration_minutes || 0
                )
              : editFormData.end_time || ''
          }
          servicePackageId={editFormData.service_package_id || editFormData.package_v2_id || ''}
          servicePackageName={
            servicePackages.find(pkg => pkg.id === editFormData.service_package_id)?.name ||
            editPackageSelection?.packageName
          }
          currentAssignedStaffId={editFormData.staff_id}
          currentAssignedTeamId={editFormData.team_id}
          excludeBookingId={selectedBooking?.id}
        />
      )}
    </div>
  )
}
