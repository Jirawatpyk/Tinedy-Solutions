import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Booking } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/common/StatCard/StatCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useSoftDelete } from '@/hooks/use-soft-delete'
import { BookingDetailModal } from './booking-detail-modal'
import { BookingCreateModal, BookingEditModal } from '@/components/booking'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import { CalendarCell } from '@/components/calendar/CalendarCell'
import { BookingCard } from '@/components/calendar/BookingCard'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { TEAMS_WITH_LEAD_QUERY, transformTeamsData } from '@/lib/booking-utils'
import { formatCurrency, getBangkokDateString } from '@/lib/utils'
import type { PackageSelectionData } from '@/components/service-packages'
import type { BookingFormState } from '@/hooks/useBookingForm'
import { useServicePackages } from '@/hooks/useServicePackages'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
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
  addMonths,
  subMonths,
} from 'date-fns'

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

// BookingFormData replaced with BookingFormState from @/hooks/useBookingForm

export function AdminCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [staffMembers, setStaffMembers] = useState<Staff[]>([])
  // ใช้ custom hook สำหรับโหลด packages ทั้ง V1 และ V2
  const { packages: servicePackages } = useServicePackages()
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [selectedStaff, setSelectedStaff] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'staff' | 'team' | 'all'>('all')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Create Booking Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
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

  const { toast } = useToast()
  const { softDelete } = useSoftDelete('bookings')

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

  // Service packages โหลดผ่าน useServicePackages hook แล้ว (ไม่ต้องมี fetchServicePackages อีกต่อไป)

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
          profiles!bookings_staff_id_fkey (
            full_name
          ),
          ${TEAMS_WITH_LEAD_QUERY},
          service_packages (
            name,
            service_type
          ),
          service_packages_v2:package_v2_id (
            name,
            service_type
          )
        `)
        .gte('booking_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('booking_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('start_time')

      if (error) throw error
      // Transform array relations to single objects and merge V1/V2 packages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedData = (data || []).map((booking: any) => {
        const servicePackages = booking.service_packages || booking.service_packages_v2

        return {
          ...booking,
          customers: Array.isArray(booking.customers) ? booking.customers[0] : booking.customers,
          profiles: Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles,
          teams: transformTeamsData(booking.teams),
          service_packages: Array.isArray(servicePackages) ? servicePackages[0] : servicePackages,
        }
      })
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

  // OPTIMIZATION 1: Memoize filtered bookings instead of using useCallback + useEffect
  const filteredBookings = useMemo(() => {
    let filtered = bookings

    // Filter by view mode
    if (viewMode === 'staff') {
      // Staff view - only show bookings with staff_id (exclude team bookings)
      filtered = filtered.filter(b => b.staff_id !== null)
      if (selectedStaff !== 'all') {
        filtered = filtered.filter(b => b.staff_id === selectedStaff)
      }
    } else if (viewMode === 'team') {
      // Team view - only show bookings with teams
      filtered = filtered.filter(b => b.team_id !== null)
      if (selectedTeam !== 'all') {
        filtered = filtered.filter(b => b.team_id === selectedTeam)
      }
    }
    // If viewMode === 'all', no filtering by staff/team (show all bookings)

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(b => b.status === selectedStatus)
    }

    return filtered
  }, [bookings, selectedTeam, selectedStaff, selectedStatus, viewMode])

  // OPTIMIZATION 2: Pre-calculate bookings grouped by date for O(1) lookup
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>()
    filteredBookings.forEach(booking => {
      const dateKey = booking.booking_date // Already in 'yyyy-MM-dd' format
      const existing = map.get(dateKey)
      if (existing) {
        existing.push(booking) // Mutate existing array instead of creating new one
      } else {
        map.set(dateKey, [booking])
      }
    })
    return map
  }, [filteredBookings])

  // OPTIMIZATION 3: Memoize month stats calculation
  const monthStats = useMemo(() => {
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
  }, [filteredBookings])

  // Helper function: Get bookings for a specific date using O(1) Map lookup
  const getBookingsForDate = useCallback((date: Date): Booking[] => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return bookingsByDate.get(dateKey) || []
  }, [bookingsByDate])

  useEffect(() => {
    // OPTIMIZE: Run all queries in parallel for better performance
    // Service packages โหลดผ่าน useServicePackages hook อัตโนมัติแล้ว
    Promise.all([
      fetchBookings(),
      fetchTeams(),
      fetchStaffMembers()
    ])
  }, [currentDate, fetchBookings, fetchTeams, fetchStaffMembers])

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

      // Update bookings in state without full refetch (ป้องกัน modal reload)
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking.id === bookingId
            ? { ...booking, status: newStatus }
            : booking
        )
      )
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
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

      // Update bookings list without refetching all data
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? {
          ...b,
          payment_status: 'paid',
          payment_method: method,
          amount_paid: b.total_price,
          payment_date: getBangkokDateString(),
        } : b)
      )
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (bookingId: string) => {
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

      // Remove booking from state without refetch
      setBookings(prevBookings => prevBookings.filter(b => b.id !== bookingId))
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete booking',
        variant: 'destructive',
      })
    }
  }

  const archiveBooking = async (bookingId: string) => {
    const result = await softDelete(bookingId)
    if (result.success) {
      setIsDetailOpen(false)
      // Remove booking from state without refetch
      setBookings(prevBookings => prevBookings.filter(b => b.id !== bookingId))
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
        {/* Page Header - Always show */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted-foreground">View and manage your bookings</p>
          <Button variant="outline" disabled>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>

        {/* Stats Cards skeleton */}
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCard
              key={i}
              title=""
              value={0}
              isLoading={true}
            />
          ))}
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-muted-foreground">View and manage your bookings</p>
        <Button onClick={goToToday} variant="outline">
          <CalendarIcon className="h-4 w-4 mr-2" />
          Today
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Bookings"
          value={monthStats.totalBookings}
          description="This month"
          icon={CalendarIcon}
        />

        <StatCard
          title="Confirmed"
          value={monthStats.confirmedBookings}
          description="Active bookings"
          icon={CheckCircle}
        />

        <StatCard
          title="Completed"
          value={monthStats.completedBookings}
          description="Jobs done"
          icon={TrendingUp}
        />

        <StatCard
          title="Revenue"
          value={formatCurrency(monthStats.totalRevenue)}
          description="Paid bookings"
          icon={DollarSign}
        />
      </div>

      {/* Filters and View Mode */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium whitespace-nowrap">View Mode:</label>
              <div className="inline-flex rounded-md shadow-sm w-full max-w-[380px]" role="group">
                <Button
                  variant={viewMode === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('all')}
                  className="rounded-r-none flex-1 h-8 text-xs"
                >
                  All Bookings
                </Button>
                <Button
                  variant={viewMode === 'staff' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('staff')}
                  className="rounded-none border-l-0 flex-1 h-8 text-xs"
                >
                  Staff View
                </Button>
                <Button
                  variant={viewMode === 'team' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('team')}
                  className="rounded-l-none border-l-0 flex-1 h-8 text-xs"
                >
                  Team View
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-border mx-1"></div>

            {/* Staff Filter */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="text-xs font-medium whitespace-nowrap">Staff:</label>
              <Select
                value={selectedStaff}
                onValueChange={setSelectedStaff}
                disabled={viewMode !== 'staff'}
              >
                <SelectTrigger className="w-full h-8 text-xs">
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
              <label className="text-xs font-medium whitespace-nowrap">Team:</label>
              <Select
                value={selectedTeam}
                onValueChange={setSelectedTeam}
                disabled={viewMode !== 'team'}
              >
                <SelectTrigger className="w-full h-8 text-xs">
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
              <label className="text-xs font-medium whitespace-nowrap">Status:</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full h-8 text-xs">
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

              {/* Calendar days - OPTIMIZED: Use memoized CalendarCell component */}
              {calendarDays.map((day, index) => (
                <CalendarCell
                  key={index}
                  day={day}
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  dayBookings={getBookingsForDate(day)}
                  onDateClick={setSelectedDate}
                  onCreateBooking={handleCreateBooking}
                />
              ))}
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
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onClick={openBookingDetail}
                  />
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
        onCancel={archiveBooking}
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
        isOpen={isCreateOpen && !isCreateAvailabilityOpen}
        onClose={() => {
          setIsCreateOpen(false)
          setCreatePackageSelection(null); createForm.reset();
        }}
        onSuccess={() => {
          fetchBookings()
          setCreatePackageSelection(null) // Clear selection after success
        }}
        servicePackages={servicePackages}
        staffMembers={staffMembers}
        teams={teams}
        onOpenAvailabilityModal={() => {
          setIsCreateAvailabilityOpen(true)
        }}
        createForm={createForm}
        assignmentType={createAssignmentType}
        setAssignmentType={setCreateAssignmentType}
        calculateEndTime={calculateEndTime}
        packageSelection={createPackageSelection}
        setPackageSelection={setCreatePackageSelection}
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
            fetchBookings()
            setEditPackageSelection(null) // Clear selection after success
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
          packageSelection={editPackageSelection}
          setPackageSelection={setEditPackageSelection}
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
          date={createFormData.booking_date || ''}
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
