import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import {
  Calendar,
  Users,
  DollarSign,
  Clock,
  Phone,
  MapPin,
  User,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Award,
  Package,
  Target,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getErrorMessage } from '@/lib/error-utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { BookingDetailModal } from './booking-detail-modal'
import { BookingEditModal } from '@/components/booking'
import type { ServicePackage } from '@/types'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import { useToast } from '@/hooks/use-toast'

interface Stats {
  totalBookings: number
  totalRevenue: number
  totalCustomers: number
  pendingBookings: number
}

interface StatsChange {
  bookingsChange: number
  revenueChange: number
  customersChange: number
  pendingChange: number
}

interface BookingStatus {
  status: string
  count: number
  color: string
  [key: string]: string | number
}

interface TodayBooking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  address: string
  city: string
  state: string
  zip_code: string
  staff_id: string | null
  team_id: string | null
  service_package_id: string
  notes: string | null
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
  service_packages: {
    name: string
    service_type: string
  } | null
  profiles: {
    full_name: string
  } | null
  teams: {
    name: string
  } | null
}

interface DailyRevenue {
  date: string
  revenue: number
}

interface StaffMember {
  id: string
  full_name: string
  email: string
  role: string
}

interface Team {
  id: string
  name: string
}

interface MiniStats {
  topService: { name: string; count: number } | null
  avgBookingValue: number
  completionRate: number
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

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    pendingBookings: 0,
  })
  const [statsChange, setStatsChange] = useState<StatsChange>({
    bookingsChange: 0,
    revenueChange: 0,
    customersChange: 0,
    pendingChange: 0,
  })
  const [bookingsByStatus, setBookingsByStatus] = useState<BookingStatus[]>([])
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [miniStats, setMiniStats] = useState<MiniStats>({
    topService: null,
    avgBookingValue: 0,
    completionRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<TodayBooking | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [appointmentsPage, setAppointmentsPage] = useState(1)
  const appointmentsPerPage = 5
  const [actionLoading, setActionLoading] = useState<{
    statusChange: boolean
    delete: boolean
    markAsPaid: boolean
  }>({
    statusChange: false,
    delete: false,
    markAsPaid: false,
  })

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editAssignmentType, setEditAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [editFormData, setEditFormData] = useState<BookingFormData>({})
  const [isEditAvailabilityOpen, setIsEditAvailabilityOpen] = useState(false)

  // Data for modals
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [showChartLabels, setShowChartLabels] = useState(false)

  const { toast } = useToast()

  // Memoize chart data calculations
  const pieChartTotal = useMemo(() => {
    return bookingsByStatus.reduce((sum, item) => sum + item.count, 0)
  }, [bookingsByStatus])

  const paginatedAppointments = useMemo(() => {
    return todayBookings.slice(
      (appointmentsPage - 1) * appointmentsPerPage,
      appointmentsPage * appointmentsPerPage
    )
  }, [todayBookings, appointmentsPage, appointmentsPerPage])

  const totalPages = useMemo(() => {
    return Math.ceil(todayBookings.length / appointmentsPerPage)
  }, [todayBookings.length, appointmentsPerPage])

  useEffect(() => {
    // Run all data fetching in parallel for better performance
    Promise.all([
      fetchDashboardData(),
      fetchServicePackages(),
      fetchStaffMembers(),
      fetchTeams()
    ])
  }, [])

  // Show chart labels after animation completes
  useEffect(() => {
    if (!loading && bookingsByStatus.length > 0) {
      const timer = setTimeout(() => {
        setShowChartLabels(true)
      }, 400) // Show halfway through animation for smoother appearance
      return () => clearTimeout(timer)
    }
  }, [loading, bookingsByStatus])

  const fetchServicePackages = async () => {
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
  }

  const fetchStaffMembers = async () => {
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
  }

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

  const fetchDashboardData = async () => {
    try {
      // Calculate dates first
      const nowToday = new Date()
      const bangkokOffsetToday = 7 * 60 * 60 * 1000
      const bangkokTimeToday = new Date(nowToday.getTime() + bangkokOffsetToday)
      const todayStr = bangkokTimeToday.toISOString().split('T')[0]
      const todayStart = `${todayStr}T00:00:00+07:00`
      const todayEnd = `${todayStr}T23:59:59+07:00`
      const today = todayStr

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

      // OPTIMIZE: Run ALL queries in parallel using Promise.all
      const [
        totalBookingsRes,
        completedBookingsRes,
        totalCustomersRes,
        pendingBookingsRes,
        todayBookingsRes,
        todayRevenueRes,
        todayCustomersRes,
        todayPendingRes,
        allBookingsStatusRes,
        todayBookingsDataRes,
        revenueDataRes,
      ] = await Promise.all([
        // Total stats
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('total_price').eq('status', 'completed'),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),

        // Today's stats
        supabase.from('bookings').select('*', { count: 'exact' }).gte('created_at', todayStart).lte('created_at', todayEnd),
        supabase.from('bookings').select('total_price').eq('status', 'completed').gte('updated_at', todayStart).lte('updated_at', todayEnd),
        supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', todayStart).lte('created_at', todayEnd),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending').gte('created_at', todayStart).lte('created_at', todayEnd),

        // Bookings by status
        supabase.from('bookings').select('status'),

        // Today's bookings detail
        supabase.from('bookings').select(`
          *,
          customers (id, full_name, phone, email),
          service_packages (name, service_type),
          profiles (full_name),
          teams (name)
        `).eq('booking_date', today).order('start_time', { ascending: true }),

        // Revenue data
        supabase.from('bookings').select('booking_date, total_price').eq('status', 'completed').gte('booking_date', sevenDaysAgoStr).order('booking_date', { ascending: true }),
      ])

      // Process total revenue
      const totalRevenue = completedBookingsRes.data?.reduce(
        (sum, booking) => sum + Number(booking.total_price),
        0
      ) || 0

      // Process today's revenue
      const todayRevenue = todayRevenueRes.data?.reduce(
        (sum, booking) => sum + Number(booking.total_price),
        0
      ) || 0

      // Set stats
      setStats({
        totalBookings: totalBookingsRes.count || 0,
        totalRevenue,
        totalCustomers: totalCustomersRes.count || 0,
        pendingBookings: pendingBookingsRes.count || 0,
      })

      setStatsChange({
        bookingsChange: todayBookingsRes.count || 0,
        revenueChange: todayRevenue,
        customersChange: todayCustomersRes.count || 0,
        pendingChange: todayPendingRes.count || 0,
      })

      // Process bookings by status
      const statusCounts: Record<string, number> = {}
      allBookingsStatusRes.data?.forEach((booking) => {
        statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1
      })

      const statusColors: Record<string, string> = {
        confirmed: '#3b82f6',
        pending: '#f59e0b',
        in_progress: '#8b5cf6',
        completed: '#10b981',
        cancelled: '#ef4444',
      }

      const statusData: BookingStatus[] = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
        count,
        color: statusColors[status] || '#6b7280',
      }))

      setBookingsByStatus(statusData)

      // Set today's bookings
      setTodayBookings((todayBookingsDataRes.data as TodayBooking[]) || [])

      // Process revenue data
      const revenueByDate: Record<string, number> = {}
      for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const dateStr = date.toISOString().split('T')[0]
        revenueByDate[dateStr] = 0
      }

      revenueDataRes.data?.forEach((item) => {
        const dateStr = item.booking_date
        revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + Number(item.total_price)
      })

      const revenueArray: DailyRevenue[] = Object.entries(revenueByDate).map(([date, revenue]) => ({
        date: format(new Date(date), 'dd MMM', { locale: th }),
        revenue,
      }))

      setDailyRevenue(revenueArray)

      // Calculate Mini Stats
      // 1. Top Service
      const serviceCount: Record<string, { name: string; count: number }> = {}
      allBookingsStatusRes.data?.forEach((booking: Record<string, unknown>) => {
        const serviceName = booking.service_packages?.name
        if (serviceName) {
          if (!serviceCount[serviceName]) {
            serviceCount[serviceName] = { name: serviceName, count: 0 }
          }
          serviceCount[serviceName].count++
        }
      })

      // Get all bookings with service packages for mini stats
      const { data: allBookingsWithServices } = await supabase
        .from('bookings')
        .select('total_price, status, service_packages(name)')

      // Recalculate service count from full data
      const fullServiceCount: Record<string, { name: string; count: number }> = {}
      allBookingsWithServices?.forEach((booking: Record<string, unknown>) => {
        const serviceName = booking.service_packages?.name
        if (serviceName) {
          if (!fullServiceCount[serviceName]) {
            fullServiceCount[serviceName] = { name: serviceName, count: 0 }
          }
          fullServiceCount[serviceName].count++
        }
      })

      const topService = Object.values(fullServiceCount).sort((a, b) => b.count - a.count)[0] || null

      // 2. Average Booking Value
      const totalBookingValue = allBookingsWithServices?.reduce(
        (sum, booking) => sum + Number(booking.total_price),
        0
      ) || 0
      const avgBookingValue = allBookingsWithServices && allBookingsWithServices.length > 0
        ? totalBookingValue / allBookingsWithServices.length
        : 0

      // 3. Completion Rate
      const completedCount = allBookingsWithServices?.filter(b => b.status === 'completed').length || 0
      const completionRate = allBookingsWithServices && allBookingsWithServices.length > 0
        ? (completedCount / allBookingsWithServices.length) * 100
        : 0

      setMiniStats({
        topService,
        avgBookingValue,
        completionRate,
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
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

  const handleStatusChange = useCallback(async (bookingId: string, currentStatus: string, newStatus: string) => {
    if (currentStatus === newStatus) return

    setActionLoading(prev => ({ ...prev, statusChange: true }))
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

      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: newStatus })
      }

      fetchDashboardData()
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setActionLoading(prev => ({ ...prev, statusChange: false }))
    }
  }, [selectedBooking, toast])

  const deleteBooking = useCallback(async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return

    setActionLoading(prev => ({ ...prev, delete: true }))
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
      fetchDashboardData()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete booking',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(prev => ({ ...prev, delete: false }))
    }
  }, [toast])

  const markAsPaid = useCallback(async (bookingId: string, method: string = 'cash') => {
    setActionLoading(prev => ({ ...prev, markAsPaid: true }))
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

      // Update today bookings list without refetching all data
      setTodayBookings(prev =>
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
    } finally {
      setActionLoading(prev => ({ ...prev, markAsPaid: false }))
    }
  }, [selectedBooking, toast])

  const openBookingDetail = useCallback((booking: TodayBooking) => {
    setSelectedBooking(booking)
    setIsDetailOpen(true)
  }, [])

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

  const handleEditBooking = (booking: TodayBooking) => {
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
    setIsDetailOpen(false)
  }


  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-6 w-40" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Today's Appointments skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-48" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-56" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
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
      <div>
        <h1 className="text-3xl font-display font-bold text-tinedy-dark">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-tinedy-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.totalBookings}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                All time bookings
              </p>
              <div className={`flex items-center gap-1 text-xs font-semibold ${statsChange.bookingsChange > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                {statsChange.bookingsChange > 0 && <TrendingUp className="h-3 w-3" />}
                <span>+{statsChange.bookingsChange} today</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-tinedy-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                From completed bookings
              </p>
              <div className={`flex items-center gap-1 text-xs font-semibold ${statsChange.revenueChange > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                {statsChange.revenueChange > 0 && <TrendingUp className="h-3 w-3" />}
                <span>+{formatCurrency(statsChange.revenueChange)} today</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-tinedy-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.totalCustomers}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                Active customers
              </p>
              <div className={`flex items-center gap-1 text-xs font-semibold ${statsChange.customersChange > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                {statsChange.customersChange > 0 && <TrendingUp className="h-3 w-3" />}
                <span>+{statsChange.customersChange} today</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.pendingBookings}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                Awaiting confirmation
              </p>
              <div className={`flex items-center gap-1 text-xs font-semibold ${statsChange.pendingChange > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                {statsChange.pendingChange > 0 && <TrendingUp className="h-3 w-3" />}
                <span>+{statsChange.pendingChange} today</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mini Stats - Quick Insights */}
      <Card className="bg-gradient-to-br from-tinedy-blue/5 to-transparent">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-tinedy-dark">
            <Target className="h-5 w-5 text-tinedy-blue" />
            Quick Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Most Popular Service */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Most Popular Service</p>
                <p className="text-lg font-bold text-tinedy-dark">
                  {miniStats.topService ? miniStats.topService.name : 'N/A'}
                </p>
                {miniStats.topService && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {miniStats.topService.count} bookings
                  </p>
                )}
              </div>
            </div>

            {/* Average Booking Value */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Average Booking Value</p>
                <p className="text-lg font-bold text-tinedy-dark">
                  {formatCurrency(miniStats.avgBookingValue)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Per booking
                </p>
              </div>
            </div>

            {/* Completion Rate */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                <Award className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-lg font-bold text-tinedy-dark">
                  {miniStats.completionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Success rate
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Bookings Status */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Calendar className="h-5 w-5 text-tinedy-blue" />
              Bookings Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsByStatus.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No bookings yet
              </p>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={bookingsByStatus as Record<string, unknown>[]}
                      cx="50%"
                      cy="50%"
                      labelLine={showChartLabels}
                      label={showChartLabels ? (props) => {
                        const entry = props.payload as BookingStatus
                        const percent = props.percent as number
                        return `${entry.status}: ${(percent * 100).toFixed(0)}%`
                      } : false}
                      outerRadius={90}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="count"
                      paddingAngle={2}
                      nameKey="status"
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {bookingsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const percent = ((value / pieChartTotal) * 100).toFixed(0)
                        return [`${value} bookings (${percent}%)`, name]
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Status Count Summary */}
                <div className="flex flex-wrap justify-center gap-4 pt-2 border-t">
                  {bookingsByStatus.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm font-medium text-tinedy-dark">
                        {entry.status}
                      </span>
                      <span className="text-sm font-bold text-tinedy-dark">
                        {entry.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-tinedy-green" />
              Revenue (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Calendar className="h-5 w-5 text-tinedy-blue" />
            Today's Appointments ({todayBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todayBookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No appointments for today
              </p>
            ) : (
              <>
                {paginatedAppointments.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-4 cursor-pointer"
                  onClick={() => openBookingDetail(booking)}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-tinedy-dark">
                          {booking.customers?.full_name || 'Unknown Customer'}
                          <span className="ml-2 text-sm font-mono text-muted-foreground font-normal">#{booking.id.slice(0, 8)}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.customers?.email || 'No email'}
                        </p>
                      </div>
                      <div className="sm:hidden">
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center">
                        <Badge variant="outline" className="mr-2">
                          {booking.service_packages?.service_type || 'service'}
                        </Badge>
                        {booking.service_packages?.name || 'Unknown Service'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{booking.customers?.phone || 'No phone'}</span>
                    </div>
                    {booking.address && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          {[booking.address, booking.city, booking.state, booking.zip_code]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                    {booking.profiles && (
                      <p className="text-sm text-tinedy-blue flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Staff: {booking.profiles.full_name}
                      </p>
                    )}
                    {booking.teams && (
                      <p className="text-sm text-tinedy-green flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Team: {booking.teams.name}
                      </p>
                    )}
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-4">
                    <div className="flex-1 sm:flex-none">
                      <p className="font-semibold text-tinedy-dark text-lg">
                        {formatCurrency(Number(booking.total_price))}
                      </p>
                      <div className="mt-1 sm:hidden">
                        {getPaymentStatusBadge(booking.payment_status)}
                      </div>
                    </div>
                    <div className="hidden sm:flex sm:flex-col sm:gap-2 sm:items-end">
                      {getStatusBadge(booking.status)}
                      {getPaymentStatusBadge(booking.payment_status)}
                    </div>
                  </div>
                </div>
              ))}

                {/* Pagination */}
                {todayBookings.length > appointmentsPerPage && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {(appointmentsPage - 1) * appointmentsPerPage + 1} to{' '}
                      {Math.min(appointmentsPage * appointmentsPerPage, todayBookings.length)} of{' '}
                      {todayBookings.length} appointments
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAppointmentsPage(prev => Math.max(1, prev - 1))}
                        disabled={appointmentsPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAppointmentsPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={appointmentsPage >= totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        booking={selectedBooking}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={() => selectedBooking && handleEditBooking(selectedBooking)}
        onDelete={deleteBooking}
        onStatusChange={handleStatusChange}
        onMarkAsPaid={markAsPaid}
        getStatusBadge={getStatusBadge}
        getPaymentStatusBadge={getPaymentStatusBadge}
        getAvailableStatuses={getAvailableStatuses}
        getStatusLabel={getStatusLabel}
        actionLoading={actionLoading}
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
            fetchDashboardData()
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
