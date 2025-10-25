import type { Customer } from '@/types'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  XCircle,
  Activity,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { formatTime } from '@/lib/booking-utils'

interface Staff {
  id: string
  full_name: string
  email: string
  role: string
  phone?: string
  avatar_url?: string
}

interface Stats {
  totalBookings: number
  completedBookings: number
  pendingBookings: number
  cancelledRate: number
  totalRevenue: number
  averageRating: number
}

interface MonthlyData {
  month: string
  bookings: number
  revenue: number
  completionRate: number
}

export function AdminStaffPerformance() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [staff, setStaff] = useState<Staff | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    cancelledRate: 0,
    totalRevenue: 0,
    averageRating: 0,
  })
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStaffData = useCallback(async () => {
    if (!id) {
      setError('No staff ID provided')
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, phone, avatar_url')
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) {
        setError('Staff member not found')
        return
      }
      setStaff(data)
      setError(null)
    } catch (error) {
      console.error('Error fetching staff:', error)
      setError('Failed to load staff data')
      toast({
        title: 'Error',
        description: 'Failed to load staff data',
        variant: 'destructive',
      })
    }
  }, [id, toast])

  const fetchBookings = useCallback(async () => {
    if (!id) return

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_price,
          payment_status,
          created_at,
          service_packages (name, price),
          customers (full_name)
        `)
        .eq('staff_id', id)
        .order('booking_date', { ascending: false })

      if (error) throw error

      interface BookingRaw {
        id: string
        booking_date: string
        start_time: string
        end_time: string
        status: string
        total_price: number
        payment_status: string
        created_at: string
        service_packages: { name: string; price: number } | { name: string; price: number }[] | null
        customers: Customer | Customer[] | null
      }

      const transformedData = (data || []).map((booking: BookingRaw): Booking => ({
        ...booking,
        service_packages: Array.isArray(booking.service_packages)
          ? booking.service_packages[0] || null
          : booking.service_packages,
        customers: Array.isArray(booking.customers)
          ? booking.customers[0] || null
          : booking.customers,
      }))

      setBookings(transformedData)
      calculateStats(transformedData)
      calculateMonthlyData(transformedData)
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      })
    }
  }, [id, toast])

  const calculateStats = (bookingsData: Booking[]) => {
    const total = bookingsData.length
    const completed = bookingsData.filter((b) => b.status === 'completed').length
    const pending = bookingsData.filter((b) => b.status === 'pending').length
    const cancelled = bookingsData.filter((b) => b.status === 'cancelled').length
    const cancelledRate = total > 0 ? (cancelled / total) * 100 : 0
    const totalRevenue = bookingsData
      .filter((b) => b.payment_status === 'paid')
      .reduce((sum, b) => sum + b.total_price, 0)

    setStats({
      totalBookings: total,
      completedBookings: completed,
      pendingBookings: pending,
      cancelledRate: Number(cancelledRate.toFixed(1)),
      totalRevenue,
      averageRating: 0, // TODO: Implement rating system
    })
  }

  const calculateMonthlyData = (bookingsData: Booking[]) => {
    const monthlyMap = new Map<string, { bookings: number; revenue: number; completed: number }>()

    bookingsData.forEach((booking) => {
      const date = new Date(booking.booking_date)
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { bookings: 0, revenue: 0, completed: 0 })
      }

      const current = monthlyMap.get(monthKey)!
      current.bookings += 1
      if (booking.payment_status === 'paid') {
        current.revenue += booking.total_price
      }
      if (booking.status === 'completed') {
        current.completed += 1
      }
    })

    const data = Array.from(monthlyMap.entries())
      .map(([month, stats]) => ({
        month,
        bookings: stats.bookings,
        revenue: stats.revenue,
        completionRate: stats.bookings > 0 ? (stats.completed / stats.bookings) * 100 : 0,
      }))
      .reverse()
      .slice(0, 6)
      .reverse()

    setMonthlyData(data)
  }

  useEffect(() => {
    setLoading(true)
    // OPTIMIZE: Run both queries in parallel for better performance
    Promise.all([
      fetchStaffData(),
      fetchBookings()
    ]).finally(() => {
      setLoading(false)
    })
  }, [fetchStaffData, fetchBookings])

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !staff) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <XCircle className="h-16 w-16 text-red-500" />
        <h2 className="text-2xl font-bold">{error || 'Staff Not Found'}</h2>
        <p className="text-muted-foreground">Unable to load staff member details</p>
        <Button onClick={() => navigate('/admin/staff')}>Back to Staff List</Button>
      </div>
    )
  }

  const recentBookings = bookings.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/staff')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-full bg-tinedy-blue flex items-center justify-center text-white font-semibold text-2xl">
            {staff.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-tinedy-dark">
              {staff.full_name}
            </h1>
            <p className="text-muted-foreground">{staff.role} " {staff.email}</p>
          </div>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">All time bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedBookings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalBookings > 0
                ? `${((stats.completedBookings / stats.totalBookings) * 100).toFixed(1)}% completion rate`
                : 'No bookings'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Revenue generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled Rate</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelledRate}%</div>
            <p className="text-xs text-muted-foreground">Cancellation rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Bookings Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Monthly Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <Activity className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No booking data available</p>
                <p className="text-sm text-muted-foreground mt-1">Data will appear here once bookings are created</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bookings" fill="#4F46E5" name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No revenue data available</p>
                <p className="text-sm text-muted-foreground mt-1">Revenue trends will appear here once payments are received</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Revenue (฿)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No bookings found</p>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((booking) => {
                const statusColors = {
                  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
                  in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
                  completed: 'bg-green-100 text-green-800 border-green-300',
                  cancelled: 'bg-red-100 text-red-800 border-red-300',
                }

                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-xs font-mono text-muted-foreground min-w-[90px]">
                        #{booking.id.slice(0, 8)}
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-tinedy-dark">
                          {booking.service_packages?.name || 'Service'}
                        </div>
                        <div className="text-muted-foreground">
                          {booking.customers?.full_name || 'Customer'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <div className="font-medium">{booking.booking_date}</div>
                        <div className="text-muted-foreground text-xs">
                          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </div>
                      </div>
                      <Badge
                        className={
                          statusColors[booking.status as keyof typeof statusColors]
                        }
                      >
                        {booking.status}
                      </Badge>
                      <div className="font-semibold text-green-600 min-w-[80px] text-right">
                        ฿{booking.total_price.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
