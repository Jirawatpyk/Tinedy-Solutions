import type { CustomerRecord, Booking } from '@/types'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
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
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, Download, Clock, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns'
import { BookingDetailModal } from './booking-detail-modal'
import { BookingEditModal } from '@/components/booking'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import { formatTime } from '@/lib/booking-utils'
import { getErrorMessage } from '@/lib/error-utils'
import type { ServicePackage , UserProfile } from '@/types'

interface Staff {
  id: string
  full_name: string
  email: string
  role: string
}

interface Team {
  id: string
  name: string
}

interface BookingFormData {
  customer_id?: string
  full_name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  service_package_id?: string
  booking_date?: string
  start_time?: string
  end_time?: string
  total_price?: number
  staff_id?: string
  team_id?: string
  notes?: string
  status?: string
}

interface BookingRaw {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  staff_id: string | null
  team_id: string | null
  total_price: number
  address: string
  city: string
  state: string
  zip_code: string
  service_package_id: string
  notes: string | null
  payment_status?: string
  payment_method?: string
  amount_paid?: number
  payment_date?: string
  payment_notes?: string
  service_packages: ServicePackage[] | ServicePackage | null
  customers: CustomerRecord[] | CustomerRecord | null
  profiles: UserProfile[] | UserProfile | null
  teams: { name: string }[] | { name: string } | null
}

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
  const [staffMembers, setStaffMembers] = useState<Staff[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string>('all')
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'staff' | 'team' | 'all'>('staff')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [weekDates, setWeekDates] = useState<Date[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editAssignmentType, setEditAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [editFormData, setEditFormData] = useState<BookingFormData>({})
  const [isEditAvailabilityOpen, setIsEditAvailabilityOpen] = useState(false)

  const { toast } = useToast()

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

  const fetchStaffMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('role', 'staff')
        .order('full_name')

      if (error) throw error
      setStaffMembers(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
      toast({
        title: 'Error',
        description: 'Failed to load staff members',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchTeams = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive',
      })
    }
  }, [toast])

  const fetchBookings = useCallback(async () => {
    if (weekDates.length === 0) return

    try {
      // Format dates in local timezone YYYY-MM-DD
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const startDate = formatLocalDate(weekDates[0])
      const endDate = formatLocalDate(weekDates[6])

      let query = supabase
        .from('bookings')
        .select(`
          *,
          service_packages (name, service_type),
          customers (id, full_name, email),
          profiles (full_name),
          teams (name)
        `)
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .order('booking_date')
        .order('start_time')

      // Filter based on view mode
      if (viewMode === 'staff') {
        // Staff view - only show bookings with staff_id (exclude team bookings)
        query = query.not('staff_id', 'is', null)

        if (selectedStaff && selectedStaff !== 'all') {
          query = query.eq('staff_id', selectedStaff)
        }
      } else if (viewMode === 'team') {
        // Team view mode - only show bookings that have a team
        query = query.not('team_id', 'is', null)

        if (selectedTeam && selectedTeam !== 'all') {
          query = query.eq('team_id', selectedTeam)
        }
      }
      // If viewMode === 'all', no filter - show everything

      const { data, error } = await query

      if (error) throw error

      const transformedData = (data || []).map((booking: BookingRaw): Booking => ({
        ...booking,
        service_packages: Array.isArray(booking.service_packages)
          ? booking.service_packages[0] || null
          : booking.service_packages,
        customers: Array.isArray(booking.customers)
          ? booking.customers[0] || null
          : booking.customers,
        profiles: Array.isArray(booking.profiles)
          ? booking.profiles[0] || null
          : booking.profiles,
        teams: Array.isArray(booking.teams)
          ? booking.teams[0] || null
          : booking.teams,
      }))

      setBookings(transformedData)
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      })
    }
  }, [selectedStaff, selectedTeam, weekDates, viewMode, toast])

  const fetchServicePackages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('service_packages')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setServicePackages(data || [])
    } catch (error) {
      console.error('Error fetching service packages:', error)
    }
  }, [])

  useEffect(() => {
    fetchStaffMembers()
    fetchTeams()
    fetchServicePackages()
  }, [fetchStaffMembers, fetchTeams, fetchServicePackages])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const getBookingsForDay = (dayIndex: number) => {
    const date = weekDates[dayIndex]
    if (!date) return []

    // Format date in local timezone YYYY-MM-DD
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    return bookings.filter((booking) => booking.booking_date === dateStr)
  }

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

  const doBookingsOverlap = (booking1: Booking, booking2: Booking) => {
    const [start1Hour, start1Min] = booking1.start_time.split(':').map(Number)
    const [end1Hour, end1Min] = booking1.end_time.split(':').map(Number)
    const [start2Hour, start2Min] = booking2.start_time.split(':').map(Number)
    const [end2Hour, end2Min] = booking2.end_time.split(':').map(Number)

    const start1 = start1Hour * 60 + start1Min
    const end1 = end1Hour * 60 + end1Min
    const start2 = start2Hour * 60 + start2Min
    const end2 = end2Hour * 60 + end2Min

    return start1 < end2 && start2 < end1
  }

  const getBookingLayout = (dayBookings: Booking[]) => {
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
  }

  const getWeekStats = () => {
    const totalBookings = bookings.length
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'in_progress').length
    const completedBookings = bookings.filter(b => b.status === 'completed').length

    // Find busiest day
    const bookingsByDay = DAYS_OF_WEEK.map((_, index) => ({
      day: DAYS_OF_WEEK[index],
      count: getBookingsForDay(index).length
    }))
    const busiestDay = bookingsByDay.reduce((max, day) => day.count > max.count ? day : max, bookingsByDay[0])

    return {
      totalBookings,
      confirmedBookings,
      completedBookings,
      busiestDay: busiestDay.day,
      busiestDayCount: busiestDay.count
    }
  }

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
    handleChange: <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => {
      setEditFormData(prev => ({ ...prev, [field]: value }))
    },
    setValues: (values: Partial<BookingFormData>) => {
      setEditFormData(prev => ({ ...prev, ...values }))
    },
    reset: () => {
      setEditFormData({})
      setEditAssignmentType('none')
    }
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
      fetchBookings()

      // Update selected booking if it's open
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: newStatus })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
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
      fetchBookings()
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
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
          payment_date: new Date().toISOString().split('T')[0],
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
          payment_date: new Date().toISOString().split('T')[0],
        })
      }

      fetchBookings()
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
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

  const selectedStaffData = staffMembers.find((s) => s.id === selectedStaff)
  const selectedTeamData = teams.find((t) => t.id === selectedTeam)
  const weekStats = getWeekStats()
  const weekStart = weekDates[0] ? format(weekDates[0], 'MMM dd') : ''
  const weekEnd = weekDates[6] ? format(weekDates[6], 'MMM dd, yyyy') : ''

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header - Always show */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-tinedy-dark">
              Weekly Schedule
            </h1>
            <p className="text-muted-foreground mt-1">
              View weekly booking schedules for staff and teams
            </p>
          </div>
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4 mr-2" />
            Export Schedule
          </Button>
        </div>

        {/* Week Stats skeleton */}
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <Skeleton className="h-10 flex-1 min-w-[250px]" />
              <Skeleton className="h-10 flex-1 min-w-[250px]" />
              <Skeleton className="h-8 w-px" />
              <Skeleton className="h-10 w-[380px]" />
            </div>
          </CardContent>
        </Card>

        {/* Week navigation skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-tinedy-dark">
            Weekly Schedule
          </h1>
          <p className="text-muted-foreground mt-1">
            View weekly booking schedules for staff and teams
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Schedule
        </Button>
      </div>

      {/* Week Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekStats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekStats.confirmedBookings}</div>
            <p className="text-xs text-muted-foreground">Active bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekStats.completedBookings}</div>
            <p className="text-xs text-muted-foreground">Jobs done</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Busiest Day</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekStats.busiestDay}</div>
            <p className="text-xs text-muted-foreground">{weekStats.busiestDayCount} bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Mode */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">View Mode:</Label>
              <div className="inline-flex rounded-md shadow-sm w-full max-w-[400px]" role="group">
                <Button
                  variant={viewMode === 'staff' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('staff')}
                  className="rounded-r-none flex-1"
                >
                  Staff View
                </Button>
                <Button
                  variant={viewMode === 'team' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('team')}
                  className="rounded-none border-l-0 flex-1"
                >
                  Team View
                </Button>
                <Button
                  variant={viewMode === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('all')}
                  className="rounded-l-none border-l-0 flex-1"
                >
                  All Bookings
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-border mx-2"></div>

            {/* Staff Filter */}
            <div className="flex items-center gap-2 flex-1 min-w-[250px]">
              <Label htmlFor="staff_select" className="whitespace-nowrap">
                Select Staff:
              </Label>
              <Select
                value={selectedStaff}
                onValueChange={setSelectedStaff}
                disabled={viewMode !== 'staff'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Filter */}
            <div className="flex items-center gap-2 flex-1 min-w-[250px]">
              <Label htmlFor="team_select" className="whitespace-nowrap">
                Select Team:
              </Label>
              <Select
                value={selectedTeam}
                onValueChange={setSelectedTeam}
                disabled={viewMode !== 'team'}
              >
                <SelectTrigger className="w-full">
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
                const dateStr = date
                  ? format(date, 'MMM d')
                  : ''
                const dayBookings = getBookingsForDay(dayIndex)
                const isToday = date && format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

                return (
                  <div key={dayIndex} className="flex-1 min-w-[120px]">
                    {/* Day header */}
                    <div className={`h-12 border-b text-center font-medium text-sm text-muted-foreground flex flex-col items-center justify-center ${isToday ? 'bg-tinedy-blue/10 border-tinedy-blue' : ''}`}>
                      <div className={isToday ? 'text-tinedy-blue font-bold' : ''}>{day}</div>
                      <div className={`text-xs font-semibold ${isToday ? 'text-tinedy-blue' : 'text-muted-foreground'}`}>
                        {dateStr}
                      </div>
                    </div>

                    {/* Timeline area */}
                    <div className={`relative border-r ${isToday ? 'bg-tinedy-blue/5' : 'bg-gray-50/50'}`} style={{ height: '720px' }}>
                      {/* Hour lines */}
                      {TIME_SLOTS.map((_, index) => (
                        <div
                          key={index}
                          className="absolute w-full border-t border-gray-200"
                          style={{ top: `${(index / TIME_SLOTS.length) * 100}%` }}
                        />
                      ))}

                      {/* Booking bars */}
                      {dayBookings.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <p className="text-xs text-muted-foreground">No bookings</p>
                        </div>
                      ) : (
                        getBookingLayout(dayBookings).map((layout) => {
                          const { booking, column, totalColumns } = layout
                          const position = calculateBookingPosition(
                            booking.start_time,
                            booking.end_time
                          )

                          const statusColors = {
                            pending: 'bg-yellow-400 hover:bg-yellow-500',
                            confirmed: 'bg-tinedy-blue hover:bg-tinedy-blue/90',
                            in_progress: 'bg-purple-500 hover:bg-purple-600',
                            completed: 'bg-green-500 hover:bg-green-600',
                            cancelled: 'bg-red-500 hover:bg-red-600',
                          }

                          const bgColor = statusColors[booking.status as keyof typeof statusColors] || 'bg-tinedy-blue'

                          const gap = 2
                          const widthPercent = (100 / totalColumns) - gap
                          const leftPercent = (column / totalColumns) * 100 + (gap / 2)

                          return (
                            <div
                              key={booking.id}
                              className={`absolute rounded-md ${bgColor} text-white shadow-sm transition-all cursor-pointer overflow-hidden group`}
                              style={{
                                top: position.top,
                                height: position.height,
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                              }}
                              onClick={() => handleBookingClick(booking)}
                              title={`${booking.service_packages?.name} - ${viewMode === 'staff' ? booking.customers?.full_name : booking.teams?.name || 'No Team'}\n${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}
                            >
                              <div className="px-2 py-1 h-full flex flex-col items-center justify-center text-xs">
                                <div className="font-semibold truncate text-center w-full">
                                  {formatTime(booking.start_time)}
                                </div>
                                <div className="text-[10px] truncate text-center w-full opacity-90">
                                  {viewMode === 'staff' ? booking.customers?.full_name : booking.teams?.name || 'No Team'}
                                </div>
                                <div className="text-[10px] truncate text-center w-full opacity-75">
                                  {booking.service_packages?.name}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
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
          isOpen={isEditOpen && !isEditAvailabilityOpen}
          onClose={() => {
            setIsEditOpen(false)
            editForm.reset()
          }}
          booking={selectedBooking}
          onSuccess={() => {
            fetchBookings()
          }}
          servicePackages={servicePackages}
          staffMembers={staffMembers}
          teams={teams}
          onOpenAvailabilityModal={() => {
            setIsEditAvailabilityOpen(true)
          }}
          editForm={editForm}
          assignmentType={editAssignmentType}
          onAssignmentTypeChange={setEditAssignmentType}
          calculateEndTime={calculateEndTime}
        />
      )}

      {/* Staff Availability Modal - Edit */}
      {editFormData.service_package_id && editFormData.booking_date && editFormData.start_time && (
        <StaffAvailabilityModal
          isOpen={isEditAvailabilityOpen}
          onClose={() => {
            setIsEditAvailabilityOpen(false)
          }}
          assignmentType={editAssignmentType === 'staff' ? 'individual' : 'team'}
          onSelectStaff={(staffId) => {
            editForm.handleChange('staff_id', staffId)
            setIsEditAvailabilityOpen(false)
            toast({
              title: 'Staff Selected',
              description: 'Staff member has been assigned to the booking',
            })
          }}
          onSelectTeam={(teamId) => {
            editForm.handleChange('team_id', teamId)
            setIsEditAvailabilityOpen(false)
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
              : (editFormData.end_time || '')
          }
          servicePackageId={editFormData.service_package_id || ''}
          servicePackageName={
            servicePackages.find(pkg => pkg.id === editFormData.service_package_id)?.name
          }
          currentAssignedStaffId={editFormData.staff_id}
          currentAssignedTeamId={editFormData.team_id}
          excludeBookingId={selectedBooking?.id}
        />
      )}
    </div>
  )
}
