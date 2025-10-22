import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  ShoppingCart,
  Package,
  Users,
  UserCheck,
  Repeat,
  Mail,
  Briefcase,
  Award,
  Activity,
  BriefcaseBusiness,
  Target,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  calculateRevenueMetrics,
  calculateBookingMetrics,
  generateChartData,
  getRevenueByServiceType,
  getBookingStatusBreakdown,
  getPeakHoursData,
  calculateCustomerMetrics,
  getTopCustomers,
  calculateStaffMetrics,
  getStaffPerformance,
  formatGrowth,
  getDateRangePreset,
  type ChartDataPoint,
} from '@/lib/analytics'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface BookingWithService {
  id: string
  booking_date: string
  start_time: string
  total_price: number
  status: string
  created_at: string
  customer_id: string
  service_packages: {
    service_type: string
  }[] | null
}

interface Customer {
  id: string
  full_name: string
  email: string
  phone?: string
  created_at: string
}

interface CustomerWithBookings extends Customer {
  bookings: { id: string; booking_date: string; total_price: number; status: string; created_at: string }[]
}

interface Staff {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

interface StaffWithBookings extends Staff {
  bookings: { id: string; booking_date: string; total_price: number; status: string; staff_id: string; created_at: string }[]
}

interface Team {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

interface TeamWithBookings extends Team {
  bookings: { id: string; booking_date: string; total_price: number; status: string; team_id: string; created_at: string }[]
  team_members: { id: string }[]
}

const CHART_COLORS = {
  primary: '#2e4057',
  secondary: '#8fb996',
  accent: '#e7d188',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
}

export function AdminReports() {
  const [bookings, setBookings] = useState<BookingWithService[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customersWithBookings, setCustomersWithBookings] = useState<CustomerWithBookings[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [staffWithBookings, setStaffWithBookings] = useState<StaffWithBookings[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsWithBookings, setTeamsWithBookings] = useState<TeamWithBookings[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('thisMonth')
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const { toast } = useToast()

  const fetchBookings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          total_price,
          status,
          created_at,
          customer_id,
          service_packages (
            service_type
          )
        `)
        .order('booking_date', { ascending: true })

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchCustomers = useCallback(async () => {
    try {
      // Fetch all customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, full_name, email, phone, created_at')
        .order('full_name')

      if (customersError) throw customersError
      setCustomers(customersData || [])

      // Fetch customers with their bookings for top customers calculation
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, booking_date, total_price, status, created_at, customer_id')

      if (bookingsError) throw bookingsError

      // Group bookings by customer
      type CustomerBooking = { id: string; booking_date: string; total_price: number; status: string; created_at: string }
      const customerBookingsMap = new Map<string, CustomerBooking[]>()
      bookingsData?.forEach((booking) => {
        const customerId = booking.customer_id
        if (!customerBookingsMap.has(customerId)) {
          customerBookingsMap.set(customerId, [])
        }
        customerBookingsMap.get(customerId)?.push(booking)
      })

      // Merge customers with their bookings
      const merged = (customersData || []).map((customer) => ({
        ...customer,
        bookings: customerBookingsMap.get(customer.id) || [],
      }))

      setCustomersWithBookings(merged)
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load customer data',
        variant: 'destructive',
      })
    }
  }, [toast])

  const fetchStaff = useCallback(async () => {
    try {
      // Fetch all staff members
      const { data: staffData, error: staffError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at')
        .order('full_name')

      if (staffError) throw staffError
      setStaff(staffData || [])

      // Fetch bookings assigned to staff
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, booking_date, total_price, status, staff_id, created_at')
        .not('staff_id', 'is', null)

      if (bookingsError) throw bookingsError

      // Group bookings by staff
      type StaffBooking = { id: string; booking_date: string; total_price: number; status: string; staff_id: string; created_at: string }
      const staffBookingsMap = new Map<string, StaffBooking[]>()
      bookingsData?.forEach((booking) => {
        const staffId = booking.staff_id
        if (staffId) {
          if (!staffBookingsMap.has(staffId)) {
            staffBookingsMap.set(staffId, [])
          }
          staffBookingsMap.get(staffId)?.push(booking)
        }
      })

      // Merge staff with their bookings
      const merged = (staffData || []).map((staffMember) => ({
        ...staffMember,
        bookings: staffBookingsMap.get(staffMember.id) || [],
      }))

      setStaffWithBookings(merged)
    } catch (error) {
      console.error('Error fetching staff:', error)
      toast({
        title: 'Error',
        description: 'Failed to load staff data',
        variant: 'destructive',
      })
    }
  }, [toast])

  const fetchTeams = useCallback(async () => {
    try {
      // Fetch all teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, is_active, created_at')
        .order('name')

      if (teamsError) throw teamsError
      setTeams(teamsData || [])

      // Fetch teams with members count
      const { data: teamsWithMembersData, error: teamsWithMembersError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          is_active,
          created_at,
          team_members (id)
        `)
        .order('name')

      if (teamsWithMembersError) throw teamsWithMembersError

      // Fetch bookings assigned to teams
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, booking_date, total_price, status, team_id, created_at')
        .not('team_id', 'is', null)

      if (bookingsError) throw bookingsError

      // Group bookings by team
      type TeamBooking = { id: string; booking_date: string; total_price: number; status: string; team_id: string; created_at: string }
      const teamBookingsMap = new Map<string, TeamBooking[]>()
      bookingsData?.forEach((booking) => {
        const teamId = booking.team_id
        if (teamId) {
          if (!teamBookingsMap.has(teamId)) {
            teamBookingsMap.set(teamId, [])
          }
          teamBookingsMap.get(teamId)?.push(booking)
        }
      })

      // Merge teams with their bookings
      type SupabaseTeam = {
        id: string
        name: string
        is_active: boolean
        created_at: string
        team_members: { id: string }[]
      }
      const merged = (teamsWithMembersData || []).map((team: SupabaseTeam) => ({
        id: team.id,
        name: team.name,
        is_active: team.is_active,
        created_at: team.created_at,
        team_members: team.team_members || [],
        bookings: teamBookingsMap.get(team.id) || [],
      }))

      setTeamsWithBookings(merged)
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast({
        title: 'Error',
        description: 'Failed to load team data',
        variant: 'destructive',
      })
    }
  }, [toast])

  const updateChartData = useCallback(() => {
    const { start, end } = getDateRangePreset(dateRange)
    const mappedBookings = bookings.map((b) => ({
      id: b.id,
      booking_date: b.booking_date,
      total_price: b.total_price,
      status: b.status,
      created_at: b.created_at,
      service_type: b.service_packages?.[0]?.service_type,
    }))
    const data = generateChartData(mappedBookings, start, end)
    setChartData(data)
  }, [bookings, dateRange])

  useEffect(() => {
    fetchBookings()
    fetchCustomers()
    fetchStaff()
    fetchTeams()
  }, [fetchBookings, fetchCustomers, fetchStaff, fetchTeams])

  useEffect(() => {
    updateChartData()
  }, [updateChartData])

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>

        {/* Tabs skeleton */}
        <Skeleton className="h-10 w-full" />

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-28" />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
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

  const mappedBookings = bookings.map((b) => ({
    id: b.id,
    booking_date: b.booking_date,
    start_time: b.start_time,
    total_price: b.total_price,
    status: b.status,
    created_at: b.created_at,
    service_type: b.service_packages?.[0]?.service_type,
  }))

  const revenueMetrics = calculateRevenueMetrics(mappedBookings)
  const bookingMetrics = calculateBookingMetrics(mappedBookings)
  const serviceTypeRevenue = getRevenueByServiceType(mappedBookings)
  const statusBreakdown = getBookingStatusBreakdown(mappedBookings)
  const peakHoursData = getPeakHoursData(mappedBookings)
  const customerMetrics = calculateCustomerMetrics(customers, mappedBookings)
  const topCustomers = getTopCustomers(customersWithBookings, 10)
  const staffMetrics = calculateStaffMetrics(staff, mappedBookings)
  const staffPerformance = getStaffPerformance(staffWithBookings)

  const serviceTypePieData = [
    { name: 'Cleaning', value: serviceTypeRevenue.cleaning, color: CHART_COLORS.primary },
    { name: 'Training', value: serviceTypeRevenue.training, color: CHART_COLORS.secondary },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-tinedy-dark">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Revenue insights and business metrics
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="last7days">Last 7 Days</SelectItem>
            <SelectItem value="last30days">Last 30 Days</SelectItem>
            <SelectItem value="thisWeek">This Week</SelectItem>
            <SelectItem value="lastWeek">Last Week</SelectItem>
            <SelectItem value="thisMonth">This Month</SelectItem>
            <SelectItem value="lastMonth">Last Month</SelectItem>
            <SelectItem value="last3months">Last 3 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Revenue & Bookings
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4" />
            Teams
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Revenue & Bookings Analytics */}
        <TabsContent value="revenue" className="space-y-6"
>

      {/* Revenue Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-tinedy-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {formatCurrency(revenueMetrics.total)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
            <Calendar className="h-4 w-4 text-tinedy-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {formatCurrency(revenueMetrics.thisMonth)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {revenueMetrics.monthGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <p
                className={`text-xs font-medium ${
                  revenueMetrics.monthGrowth >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {formatGrowth(revenueMetrics.monthGrowth)}
              </p>
              <p className="text-xs text-muted-foreground">vs last month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Week
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-tinedy-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {formatCurrency(revenueMetrics.thisWeek)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {revenueMetrics.weekGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <p
                className={`text-xs font-medium ${
                  revenueMetrics.weekGrowth >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {formatGrowth(revenueMetrics.weekGrowth)}
              </p>
              <p className="text-xs text-muted-foreground">vs last week</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Order Value
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {formatCurrency(revenueMetrics.avgOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per booking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.primary, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bookings Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Package className="h-5 w-5" />
              Bookings Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="bookings"
                  fill={CHART_COLORS.secondary}
                  radius={[4, 4, 0, 0]}
                  name="Bookings"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 - Status & Service Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Booking Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Booking Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={(props: { name?: string; percent?: number }) =>
                    (props.percent || 0) > 0 ? `${props.name || ''}: ${((props.percent || 0) * 100).toFixed(0)}%` : ''
                  }
                >
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {statusBreakdown.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                  <span className="text-sm font-semibold ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Service Type */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Revenue by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceTypePieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: { name?: string; percent?: number }) => {
                    const percent = Number(props.percent || 0)
                    return `${props.name || ''}: ${(percent * 100).toFixed(0)}%`
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {serviceTypePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Cleaning</p>
                <p className="text-lg font-bold text-tinedy-dark">
                  {formatCurrency(serviceTypeRevenue.cleaning)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Training</p>
                <p className="text-lg font-bold text-tinedy-dark">
                  {formatCurrency(serviceTypeRevenue.training)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Booking Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold text-tinedy-dark">
                  {bookingMetrics.total}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-tinedy-blue">
                  {bookingMetrics.thisMonth}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="text-sm font-semibold text-green-600">
                  {bookingMetrics.completed}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${bookingMetrics.completionRate}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {bookingMetrics.completionRate.toFixed(1)}% completion rate
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cancelled</span>
                <span className="text-sm font-semibold text-red-600">
                  {bookingMetrics.cancelled}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${bookingMetrics.cancellationRate}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {bookingMetrics.cancellationRate.toFixed(1)}% cancellation rate
              </p>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-sm font-semibold text-yellow-600">
                  {bookingMetrics.pending}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 - Peak Hours Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Peak Hours Heatmap</CardTitle>
          <p className="text-sm text-muted-foreground">
            Busiest booking times by day and hour
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-8 gap-1 text-xs">
                {/* Header row */}
                <div className="p-2"></div>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-2 text-center font-semibold">
                    {day}
                  </div>
                ))}

                {/* Hour rows */}
                {Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => (
                  <div key={hour} className="contents">
                    <div className="p-2 font-semibold">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => {
                      const data = peakHoursData.find(
                        (d) => d.day === day && d.hour === hour
                      )
                      const count = data?.count || 0
                      const maxCount = Math.max(...peakHoursData.map((d) => d.count))
                      const intensity = maxCount > 0 ? count / maxCount : 0
                      const bgColor = `rgba(46, 64, 87, ${intensity * 0.8 + 0.1})`

                      return (
                        <div
                          key={`${day}-${hour}`}
                          className="p-2 rounded text-center font-medium transition-all hover:scale-105"
                          style={{
                            backgroundColor: count > 0 ? bgColor : '#f3f4f6',
                            color: intensity > 0.5 ? 'white' : '#374151',
                          }}
                          title={`${day} ${hour}:00 - ${count} bookings`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span>Less busy</span>
            <div className="flex gap-1">
              {[0.2, 0.4, 0.6, 0.8, 1].map((intensity) => (
                <div
                  key={intensity}
                  className="w-6 h-4 rounded"
                  style={{ backgroundColor: `rgba(46, 64, 87, ${intensity})` }}
                />
              ))}
            </div>
            <span>More busy</span>
          </div>
        </CardContent>
      </Card>

        </TabsContent>

        {/* Tab 2: Customer Analytics */}
        <TabsContent value="customers" className="space-y-6">

        {/* Customer Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Customers
              </CardTitle>
              <Users className="h-4 w-4 text-tinedy-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-tinedy-dark">
                {customerMetrics.total}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                New This Month
              </CardTitle>
              <UserCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {customerMetrics.newThisMonth}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Returning Customers
              </CardTitle>
              <Repeat className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {customerMetrics.returning}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {customerMetrics.retentionRate.toFixed(1)}% retention rate
              </p>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Customer Lifetime Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-tinedy-yellow" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-tinedy-dark">
                {formatCurrency(customerMetrics.averageCLV)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Revenue per customer
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top 10 Customers by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-semibold text-sm text-muted-foreground">#</th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground">
                      Customer Name
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground">
                      Email
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Total Bookings
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Total Revenue
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Last Booking
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No customer data available
                      </td>
                    </tr>
                  ) : (
                    topCustomers.map((customer, index) => (
                      <tr key={customer.id} className="border-b hover:bg-accent/20">
                        <td className="py-3 text-sm">{index + 1}</td>
                        <td className="py-3 font-medium">{customer.name}</td>
                        <td className="py-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                        </td>
                        <td className="py-3 text-sm text-right">{customer.totalBookings}</td>
                        <td className="py-3 font-semibold text-right text-tinedy-dark">
                          {formatCurrency(customer.totalRevenue)}
                        </td>
                        <td className="py-3 text-sm text-muted-foreground text-right">
                          {new Date(customer.lastBookingDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        </TabsContent>

        {/* Tab 3: Staff Analytics */}
        <TabsContent value="staff" className="space-y-6">

        {/* Staff Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Staff
              </CardTitle>
              <Briefcase className="h-4 w-4 text-tinedy-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-tinedy-dark">
                {staffMetrics.totalStaff}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Staff
              </CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {staffMetrics.activeStaff}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                With assigned bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Jobs/Staff
              </CardTitle>
              <Package className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {staffMetrics.averageJobsPerStaff.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Completed jobs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Revenue/Staff
              </CardTitle>
              <DollarSign className="h-4 w-4 text-tinedy-yellow" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-tinedy-dark">
                {formatCurrency(staffMetrics.averageRevenuePerStaff)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue by Staff Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Revenue by Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={staffPerformance
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 10)
                    .map(staff => ({
                      name: staff.name,
                      revenue: staff.revenue,
                      jobs: staff.totalJobs,
                    }))
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    stroke="#888"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#888"
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="revenue"
                    fill={CHART_COLORS.primary}
                    radius={[4, 4, 0, 0]}
                    name="Revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Staff Workload Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Target className="h-5 w-5" />
                Staff Workload Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={staffPerformance
                      .filter(s => s.totalJobs > 0)
                      .map(staff => ({
                        name: staff.name,
                        value: staff.totalJobs,
                      }))
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 8)
                    }
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: { name?: string; percent?: number }) => {
                      const percent = Number(props.percent || 0)
                      return percent > 0.05 ? `${props.name || ''}: ${(percent * 100).toFixed(0)}%` : ''
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {staffPerformance.slice(0, 8).map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={[
                          CHART_COLORS.primary,
                          CHART_COLORS.secondary,
                          CHART_COLORS.accent,
                          CHART_COLORS.success,
                          CHART_COLORS.warning,
                          CHART_COLORS.danger,
                        ][index % 6]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {staffPerformance
                  .filter(s => s.totalJobs > 0)
                  .sort((a, b) => b.totalJobs - a.totalJobs)
                  .slice(0, 5)
                  .map((staff, index) => (
                    <div key={staff.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: [
                              CHART_COLORS.primary,
                              CHART_COLORS.secondary,
                              CHART_COLORS.accent,
                              CHART_COLORS.success,
                              CHART_COLORS.warning,
                            ][index],
                          }}
                        />
                        <span className="text-muted-foreground">{staff.name}</span>
                      </div>
                      <span className="font-semibold">{staff.totalJobs} jobs</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Award className="h-5 w-5" />
              Staff Performance Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-semibold text-sm text-muted-foreground">
                      Staff Name
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Total Jobs
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Completed
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Revenue
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Completion Rate
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Avg Job Value
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Utilization
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {staffPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No staff performance data available
                      </td>
                    </tr>
                  ) : (
                    staffPerformance
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((staff) => (
                        <tr key={staff.id} className="border-b hover:bg-accent/20">
                          <td className="py-3 font-medium">{staff.name}</td>
                          <td className="py-3 text-sm text-right">{staff.totalJobs}</td>
                          <td className="py-3 text-sm text-right text-green-600">
                            {staff.completedJobs}
                          </td>
                          <td className="py-3 font-semibold text-right text-tinedy-dark">
                            {formatCurrency(staff.revenue)}
                          </td>
                          <td className="py-3 text-sm text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${staff.completionRate}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">
                                {staff.completionRate.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-sm text-right text-muted-foreground">
                            {formatCurrency(staff.avgJobValue)}
                          </td>
                          <td className="py-3 text-sm text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    staff.utilizationRate >= 80
                                      ? 'bg-green-500'
                                      : staff.utilizationRate >= 60
                                      ? 'bg-yellow-500'
                                      : 'bg-orange-500'
                                  }`}
                                  style={{ width: `${staff.utilizationRate}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">
                                {staff.utilizationRate.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
            {staffPerformance.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">
                      High Utilization (&gt;80%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-muted-foreground">
                      Medium Utilization (60-80%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-muted-foreground">
                      Low Utilization (&lt;60%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        </TabsContent>

        {/* Tab 4: Team Analytics */}
        <TabsContent value="teams" className="space-y-6">

        {/* Team Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Teams
              </CardTitle>
              <BriefcaseBusiness className="h-4 w-4 text-tinedy-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-tinedy-dark">
                {teams.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Teams
              </CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {teamsWithBookings.filter(t => t.bookings.length > 0).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                With assigned jobs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Team Jobs
              </CardTitle>
              <Package className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {teamsWithBookings.reduce((sum, team) => sum + team.bookings.length, 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All team bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Team Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-tinedy-yellow" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-tinedy-dark">
                {formatCurrency(
                  teamsWithBookings.reduce((sum, team) =>
                    sum + team.bookings
                      .filter(b => b.status === 'completed')
                      .reduce((s, b) => s + Number(b.total_price), 0),
                    0
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Team Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue by Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={teamsWithBookings
                  .map(team => ({
                    name: team.name,
                    revenue: team.bookings
                      .filter(b => b.status === 'completed')
                      .reduce((sum, b) => sum + Number(b.total_price), 0),
                    jobs: team.bookings.length,
                  }))
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 10)
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="revenue"
                  fill={CHART_COLORS.secondary}
                  radius={[4, 4, 0, 0]}
                  name="Revenue"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Workload & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Team Workload Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Target className="h-5 w-5" />
                Team Workload Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={teamsWithBookings
                      .map(team => ({
                        name: team.name,
                        value: team.bookings.length,
                      }))
                      .filter(t => t.value > 0)
                    }
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: { name?: string; percent?: number }) => {
                      const percent = Number(props.percent || 0)
                      return percent > 0.05 ? `${props.name || ''}: ${(percent * 100).toFixed(0)}%` : ''
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {teamsWithBookings.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={[
                          CHART_COLORS.primary,
                          CHART_COLORS.secondary,
                          CHART_COLORS.accent,
                          CHART_COLORS.success,
                          CHART_COLORS.warning,
                          CHART_COLORS.danger,
                        ][index % 6]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {teamsWithBookings
                  .filter(t => t.bookings.length > 0)
                  .sort((a, b) => b.bookings.length - a.bookings.length)
                  .slice(0, 5)
                  .map((team, index) => (
                    <div key={team.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: [
                              CHART_COLORS.primary,
                              CHART_COLORS.secondary,
                              CHART_COLORS.accent,
                              CHART_COLORS.success,
                              CHART_COLORS.warning,
                            ][index],
                          }}
                        />
                        <span className="text-muted-foreground">{team.name}</span>
                      </div>
                      <span className="font-semibold">{team.bookings.length} jobs</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Completion Rate */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Award className="h-5 w-5" />
                Team Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamsWithBookings
                .filter(t => t.bookings.length > 0)
                .sort((a, b) => {
                  const aRate = a.bookings.filter(b => b.status === 'completed').length / a.bookings.length
                  const bRate = b.bookings.filter(b => b.status === 'completed').length / b.bookings.length
                  return bRate - aRate
                })
                .slice(0, 8)
                .map(team => {
                  const totalJobs = team.bookings.length
                  const completed = team.bookings.filter(b => b.status === 'completed').length
                  const completionRate = totalJobs > 0 ? (completed / totalJobs) * 100 : 0

                  return (
                    <div key={team.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{team.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {completed}/{totalJobs}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              completionRate >= 80
                                ? 'bg-green-500'
                                : completionRate >= 60
                                ? 'bg-yellow-500'
                                : 'bg-orange-500'
                            }`}
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold w-12 text-right">
                          {completionRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
            </CardContent>
          </Card>
        </div>

        {/* Team Performance Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5" />
              Team Performance Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-semibold text-sm text-muted-foreground">
                      Rank
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground">
                      Team Name
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Members
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Total Jobs
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Completed
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      In Progress
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Pending
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Revenue
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Avg/Member
                    </th>
                    <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                      Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamsWithBookings.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        No team performance data available
                      </td>
                    </tr>
                  ) : (
                    teamsWithBookings
                      .map(team => {
                        const totalJobs = team.bookings.length
                        const completed = team.bookings.filter(b => b.status === 'completed').length
                        const inProgress = team.bookings.filter(b => b.status === 'in_progress').length
                        const pending = team.bookings.filter(b => b.status === 'pending').length
                        const revenue = team.bookings
                          .filter(b => b.status === 'completed')
                          .reduce((sum, b) => sum + Number(b.total_price), 0)
                        const memberCount = team.team_members.length
                        const avgPerMember = memberCount > 0 ? revenue / memberCount : 0
                        const completionRate = totalJobs > 0 ? (completed / totalJobs) * 100 : 0

                        return {
                          id: team.id,
                          name: team.name,
                          memberCount,
                          totalJobs,
                          completed,
                          inProgress,
                          pending,
                          revenue,
                          avgPerMember,
                          completionRate,
                        }
                      })
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((team, index) => (
                        <tr key={team.id} className="border-b hover:bg-accent/20">
                          <td className="py-3 text-sm">
                            <div className="flex items-center gap-2">
                              {index === 0 && <Award className="h-4 w-4 text-tinedy-yellow" />}
                              <span className={index === 0 ? 'font-bold text-tinedy-yellow' : ''}>
                                #{index + 1}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 font-medium">{team.name}</td>
                          <td className="py-3 text-sm text-right">
                            <span className="inline-flex items-center justify-center rounded-full bg-tinedy-blue/10 px-2 py-1 text-xs font-medium text-tinedy-blue">
                              {team.memberCount}
                            </span>
                          </td>
                          <td className="py-3 text-sm text-right">{team.totalJobs}</td>
                          <td className="py-3 text-sm text-right text-green-600 font-semibold">
                            {team.completed}
                          </td>
                          <td className="py-3 text-sm text-right text-blue-600">
                            {team.inProgress}
                          </td>
                          <td className="py-3 text-sm text-right text-yellow-600">
                            {team.pending}
                          </td>
                          <td className="py-3 font-bold text-right text-tinedy-dark">
                            {formatCurrency(team.revenue)}
                          </td>
                          <td className="py-3 text-sm text-right text-muted-foreground">
                            {formatCurrency(team.avgPerMember)}
                          </td>
                          <td className="py-3 text-sm text-right">
                            <span
                              className={`font-semibold ${
                                team.completionRate >= 80
                                  ? 'text-green-600'
                                  : team.completionRate >= 60
                                  ? 'text-yellow-600'
                                  : 'text-orange-600'
                              }`}
                            >
                              {team.completionRate.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        </TabsContent>
      </Tabs>
    </div>
  )
}
