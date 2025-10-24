import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { BookingDetailModal } from './booking-detail-modal'
import { BookingCreateModal, BookingEditModal } from '@/components/booking'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import { getErrorMessage } from '@/lib/error-utils'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Briefcase,
  Users,
  CheckCircle,
  TrendingUp,
  DollarSign,
} from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns'

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  customer_id: string
  staff_id: string | null
  team_id: string | null
  service_package_id: string
  notes: string | null
  address: string
  city: string
  state: string
  zip_code: string
  payment_status?: string
  payment_method?: string
  amount_paid?: number
  payment_date?: string
  payment_notes?: string
  customers: {
    id: string
    full_name: string
    phone: string
    email: string
  } | null
  profiles: {
    full_name: string
  } | null
  teams: {
    name: string
  } | null
  service_packages: {
    name: string
    service_type: string
  } | null
}

interface Team {
  id: string
  name: string
}

interface Staff {
  id: string
  full_name: string
  email: string
  role: string
}

interface ServicePackage {
  id: string
  name: string
  price: number
  duration_minutes: number
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
}

const STATUS_DOTS = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  in_progress: 'bg-purple-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
}

export function AdminCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [staffMembers, setStaffMembers] = useState<Staff[]>([])
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [selectedStaff, setSelectedStaff] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'staff' | 'team'>('staff')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Create Booking Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createAssignmentType, setCreateAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [createFormData, setCreateFormData] = useState<Record<string, any>>({})
  const [isCreateAvailabilityOpen, setIsCreateAvailabilityOpen] = useState(false)

  // Edit Booking Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editAssignmentType, setEditAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [editFormData, setEditFormData] = useState<Record<string, any>>({})
  const [isEditAvailabilityOpen, setIsEditAvailabilityOpen] = useState(false)

  const { toast } = useToast()

  const fetchTeams = useCallback(async () => {
    try {
      const { data, error} = await supabase
        .from('teams')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }, [])

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
      console.error('Error fetching staff members:', error)
    }
  }, [])

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

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customers!inner (
            id,
            full_name,
            phone,
            email
          ),
          profiles (
            full_name
          ),
          teams (
            name
          ),
          service_packages!inner (
            name,
            service_type
          )
        `)
        .gte('booking_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('booking_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('start_time')

      if (error) throw error
      // Transform array relations to single objects
      const transformedData = (data || []).map((booking) => ({
        ...booking,
        customers: Array.isArray(booking.customers) ? booking.customers[0] : booking.customers,
        profiles: Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles,
        teams: Array.isArray(booking.teams) ? booking.teams[0] : booking.teams,
        service_packages: Array.isArray(booking.service_packages) ? booking.service_packages[0] : booking.service_packages,
      }))
      setBookings(transformedData as Booking[])
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load calendar bookings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [currentDate, toast])

  const filterBookings = useCallback(() => {
    let filtered = bookings

    // Filter by view mode
    if (viewMode === 'staff') {
      // Staff view - filter by staff
      if (selectedStaff !== 'all') {
        filtered = filtered.filter(b => b.staff_id === selectedStaff)
      }
    } else {
      // Team view - only show bookings with teams
      filtered = filtered.filter(b => b.team_id !== null)
      if (selectedTeam !== 'all') {
        filtered = filtered.filter(b => b.team_id === selectedTeam)
      }
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(b => b.status === selectedStatus)
    }

    setFilteredBookings(filtered)
  }, [bookings, selectedTeam, selectedStaff, selectedStatus, viewMode])

  useEffect(() => {
    fetchBookings()
    fetchTeams()
    fetchStaffMembers()
    fetchServicePackages()
  }, [currentDate, fetchBookings, fetchTeams, fetchStaffMembers, fetchServicePackages])

  useEffect(() => {
    filterBookings()
  }, [filterBookings])

  const getBookingsForDate = (date: Date) => {
    return filteredBookings.filter((booking) =>
      isSameDay(new Date(booking.booking_date), date)
    )
  }

  // Helper function to format time without seconds
  const formatTimeWithoutSeconds = (time: string) => {
    return time.substring(0, 5) // Takes only HH:MM from HH:MM:SS
  }

  // Calculate month stats
  const getMonthStats = () => {
    const totalBookings = filteredBookings.length
    const confirmedBookings = filteredBookings.filter(
      b => b.status === 'confirmed' || b.status === 'in_progress'
    ).length
    const completedBookings = filteredBookings.filter(b => b.status === 'completed').length
    const totalRevenue = filteredBookings
      .filter(b => b.payment_status === 'paid')
      .reduce((sum, b) => sum + b.total_price, 0)

    return {
      totalBookings,
      confirmedBookings,
      completedBookings,
      totalRevenue
    }
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

  // Create Booking Form Helpers
  const createForm = {
    formData: createFormData,
    handleChange: (field: string, value: any) => {
      setCreateFormData(prev => ({ ...prev, [field]: value }))
    },
    setValues: (values: Record<string, any>) => {
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
    handleChange: (field: string, value: any) => {
      setEditFormData(prev => ({ ...prev, [field]: value }))
    },
    setValues: (values: Record<string, any>) => {
      setEditFormData(prev => ({ ...prev, ...values }))
    },
    reset: () => {
      setEditFormData({})
      setEditAssignmentType('none')
    }
  }

  const handleCreateBooking = (date: Date) => {
    // Pre-fill booking date
    setCreateFormData({ booking_date: format(date, 'yyyy-MM-dd') })
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
      notes: booking.notes,
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

  const handleStatusChange = async (bookingId: string, currentStatus: string, newStatus: string) => {
    if (currentStatus === newStatus) return

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

      // Update bookings list without refetching all data
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? {
          ...b,
          payment_status: 'paid',
          payment_method: method,
          amount_paid: b.total_price,
          payment_date: new Date().toISOString().split('T')[0],
        } : b)
      )
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (bookingId: string) => {
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
      setIsDetailOpen(false)
      fetchBookings()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete booking',
        variant: 'destructive',
      })
    }
  }


  // Generate calendar days
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate) : []

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Skeleton */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-40" />
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
              <Skeleton className="h-6 w-40" />
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

  const monthStats = getMonthStats()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-tinedy-dark">Calendar</h1>
          <p className="text-muted-foreground mt-1">View and manage your bookings</p>
        </div>
        <Button onClick={goToToday} variant="outline">
          <CalendarIcon className="h-4 w-4 mr-2" />
          Today
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthStats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthStats.confirmedBookings}</div>
            <p className="text-xs text-muted-foreground">Active bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthStats.completedBookings}</div>
            <p className="text-xs text-muted-foreground">Jobs done</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthStats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Paid bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Mode */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Staff Filter */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="text-sm font-medium whitespace-nowrap">Staff:</label>
              <Select
                value={selectedStaff}
                onValueChange={setSelectedStaff}
                disabled={viewMode === 'team'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Staff" />
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
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="text-sm font-medium whitespace-nowrap">Team:</label>
              <Select
                value={selectedTeam}
                onValueChange={setSelectedTeam}
                disabled={viewMode === 'staff'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Teams" />
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

            {/* Status Filter */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="text-sm font-medium whitespace-nowrap">Status:</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-border mx-2"></div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">View Mode:</label>
              <div className="inline-flex rounded-md shadow-sm w-full max-w-[250px]" role="group">
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
                  className="rounded-l-none border-l-0 flex-1"
                >
                  Team View
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                const dayBookings = getBookingsForDate(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                const isTodayDate = isToday(day)

                return (
                  <div
                    key={index}
                    className={`
                      relative min-h-20 p-2 border rounded-lg transition-all group
                      ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-background'}
                      ${isSelected ? 'ring-2 ring-tinedy-blue bg-blue-50' : ''}
                      ${isTodayDate && !isSelected ? 'ring-2 ring-tinedy-yellow' : ''}
                      hover:bg-accent/50
                    `}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`text-sm font-medium ${
                          isTodayDate ? 'text-tinedy-blue font-bold' : ''
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                      <div className="flex items-center gap-1">
                        {dayBookings.length > 0 && (
                          <span className="text-xs bg-tinedy-blue text-white rounded-full px-1.5">
                            {dayBookings.length}
                          </span>
                        )}
                        {/* Add Booking Button */}
                        {isCurrentMonth && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCreateBooking(day)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-green-600"
                            title="Create booking"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Booking dots */}
                    {dayBookings.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {dayBookings.slice(0, 3).map((booking) => (
                          <div
                            key={booking.id}
                            className={`w-2 h-2 rounded-full ${
                              STATUS_DOTS[booking.status as keyof typeof STATUS_DOTS]
                            }`}
                            title={booking.service_packages?.name || 'Booking'}
                          />
                        ))}
                        {dayBookings.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{dayBookings.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking List Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-display">
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </CardTitle>
            {selectedDateBookings.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedDateBookings.length} booking{selectedDateBookings.length > 1 ? 's' : ''}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Click on a date to view bookings
                </p>
              </div>
            ) : selectedDateBookings.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No bookings for this date</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {selectedDateBookings.map((booking) => (
                  <div
                    key={booking.id}
                    onClick={() => openBookingDetail(booking)}
                    className={`p-3 rounded-lg border-2 cursor-pointer hover:opacity-80 transition-opacity ${
                      STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS]
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-semibold">
                          {formatTimeWithoutSeconds(booking.start_time)} - {formatTimeWithoutSeconds(booking.end_time)}
                        </span>
                      </div>
                      <span className="text-xs font-medium uppercase px-2 py-0.5 rounded">
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{booking.customers?.full_name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{booking.service_packages?.name || 'N/A'}</span>
                      </div>
                      {booking.profiles && (
                        <div className="flex items-center gap-2 text-tinedy-blue">
                          <User className="h-3.5 w-3.5" />
                          <span>Staff: {booking.profiles.full_name}</span>
                        </div>
                      )}
                      {booking.teams && (
                        <div className="flex items-center gap-2 text-tinedy-green">
                          <Users className="h-3.5 w-3.5" />
                          <span>Team: {booking.teams.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        booking={selectedBooking}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={() => selectedBooking && handleEditBooking(selectedBooking)}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onMarkAsPaid={handleMarkAsPaid}
        getStatusBadge={getStatusBadge}
        getPaymentStatusBadge={getPaymentStatusBadge}
        getAvailableStatuses={getAvailableStatuses}
        getStatusLabel={getStatusLabel}
      />

      {/* Create Booking Modal */}
      <BookingCreateModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false)
          createForm.reset()
        }}
        onSuccess={() => {
          fetchBookings()
        }}
        servicePackages={servicePackages}
        staffMembers={staffMembers}
        teams={teams}
        onOpenAvailabilityModal={() => {
          setIsCreateOpen(false)
          setIsCreateAvailabilityOpen(true)
        }}
        createForm={createForm}
        assignmentType={createAssignmentType}
        setAssignmentType={setCreateAssignmentType}
        calculateEndTime={calculateEndTime}
      />

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
            fetchBookings()
          }}
          servicePackages={servicePackages}
          staffMembers={staffMembers}
          teams={teams}
          onOpenAvailabilityModal={() => {
            setIsEditOpen(false)
            setIsEditAvailabilityOpen(true)
          }}
          editForm={editForm}
          assignmentType={editAssignmentType}
          onAssignmentTypeChange={setEditAssignmentType}
          calculateEndTime={calculateEndTime}
        />
      )}

      {/* Staff Availability Modal - Create */}
      {createFormData.service_package_id && createFormData.booking_date && createFormData.start_time && (
        <StaffAvailabilityModal
          isOpen={isCreateAvailabilityOpen}
          onClose={() => {
            setIsCreateAvailabilityOpen(false)
            setIsCreateOpen(true)
          }}
          assignmentType={createAssignmentType === 'staff' ? 'individual' : 'team'}
          onSelectStaff={(staffId) => {
            createForm.handleChange('staff_id', staffId)
            setIsCreateAvailabilityOpen(false)
            setIsCreateOpen(true)
            toast({
              title: 'Staff Selected',
              description: 'Staff member has been assigned to the booking',
            })
          }}
          onSelectTeam={(teamId) => {
            createForm.handleChange('team_id', teamId)
            setIsCreateAvailabilityOpen(false)
            setIsCreateOpen(true)
            toast({
              title: 'Team Selected',
              description: 'Team has been assigned to the booking',
            })
          }}
          date={createFormData.booking_date}
          startTime={createFormData.start_time}
          endTime={
            createFormData.service_package_id
              ? calculateEndTime(
                  createFormData.start_time,
                  servicePackages.find(pkg => pkg.id === createFormData.service_package_id)?.duration_minutes || 0
                )
              : createFormData.end_time
          }
          servicePackageId={createFormData.service_package_id}
          servicePackageName={
            servicePackages.find(pkg => pkg.id === createFormData.service_package_id)?.name
          }
        />
      )}

      {/* Staff Availability Modal - Edit */}
      {editFormData.service_package_id && editFormData.booking_date && editFormData.start_time && (
        <StaffAvailabilityModal
          isOpen={isEditAvailabilityOpen}
          onClose={() => {
            setIsEditAvailabilityOpen(false)
            setIsEditOpen(true)
          }}
          assignmentType={editAssignmentType === 'staff' ? 'individual' : 'team'}
          onSelectStaff={(staffId) => {
            editForm.handleChange('staff_id', staffId)
            setIsEditAvailabilityOpen(false)
            setIsEditOpen(true)
            toast({
              title: 'Staff Selected',
              description: 'Staff member has been assigned to the booking',
            })
          }}
          onSelectTeam={(teamId) => {
            editForm.handleChange('team_id', teamId)
            setIsEditAvailabilityOpen(false)
            setIsEditOpen(true)
            toast({
              title: 'Team Selected',
              description: 'Team has been assigned to the booking',
            })
          }}
          date={editFormData.booking_date}
          startTime={editFormData.start_time}
          endTime={
            editFormData.service_package_id
              ? calculateEndTime(
                  editFormData.start_time,
                  servicePackages.find(pkg => pkg.id === editFormData.service_package_id)?.duration_minutes || 0
                )
              : editFormData.end_time
          }
          servicePackageId={editFormData.service_package_id}
          servicePackageName={
            servicePackages.find(pkg => pkg.id === editFormData.service_package_id)?.name
          }
          currentAssignedStaffId={editFormData.staff_id}
          currentAssignedTeamId={editFormData.team_id}
        />
      )}
    </div>
  )
}
