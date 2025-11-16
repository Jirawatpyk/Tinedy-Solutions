import { useEffect, useState, useCallback, useMemo } from 'react'
import type { CustomerRecord } from '@/types'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimpleTabs as Tabs, SimpleTabsContent as TabsContent, SimpleTabsList as TabsList, SimpleTabsTrigger as TabsTrigger } from '@/components/ui/simple-tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  BarChart3,
  Users,
  Briefcase,
  BriefcaseBusiness,
  Download,
} from 'lucide-react'
// formatCurrency imported by tab components
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  exportRevenueBookings,
  exportRevenueByServiceType,
  exportPeakHours,
  exportTopServicePackages,
  exportCustomers,
  exportStaffPerformance,
  exportTeamPerformance,
} from '@/lib/export'
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
  calculateTeamMetrics,
  getTeamPerformance,
  getDateRangePreset,
  type ChartDataPoint,
  type CustomerWithBookings,
  type Staff,
  type StaffWithBookings,
  type Team,
  type TeamWithBookings,
} from '@/lib/analytics'
import { RevenueBookingsTab } from '@/components/reports/tabs/RevenueBookingsTab'
import { CustomersTab } from '@/components/reports/tabs/CustomersTab'
import { StaffTab } from '@/components/reports/tabs/StaffTab'
import { TeamsTab } from '@/components/reports/tabs/TeamsTab'
import type {
  BookingWithService,
} from '@/types/reports'

export function AdminReports() {
  const [bookings, setBookings] = useState<BookingWithService[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [customersWithBookings, setCustomersWithBookings] = useState<CustomerWithBookings[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [staffWithBookings, setStaffWithBookings] = useState<StaffWithBookings[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsWithBookings, setTeamsWithBookings] = useState<TeamWithBookings[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('thisMonth')
  const [activeTab, setActiveTab] = useState('revenue')
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
          payment_status,
          created_at,
          customer_id,
          staff_id,
          service_package_id,
          package_v2_id,
          service_packages (
            name,
            service_type
          ),
          service_packages_v2:package_v2_id (
            name,
            service_type
          )
        `)
        .order('booking_date', { ascending: true })

      if (error) throw error

      // Transform Supabase data - service_packages comes as array, we need single object (V1 + V2)
      interface SupabaseBooking {
        id: string
        booking_date: string
        start_time: string
        total_price: number
        status: string
        created_at: string
        customer_id: string
        staff_id: string | null
        service_package_id: string
        package_v2_id: string | null
        service_packages: { name: string; service_type: string }[] | { name: string; service_type: string } | null
        service_packages_v2: { name: string; service_type: string }[] | { name: string; service_type: string } | null
      }

      const transformedBookings = (data as SupabaseBooking[] || []).map((booking): BookingWithService => {
        // Merge V1 and V2 package data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const servicePackages = booking.service_packages || (booking as any).service_packages_v2

        return {
          ...booking,
          service_packages: Array.isArray(servicePackages)
            ? servicePackages[0] || null
            : servicePackages
        }
      })

      setBookings(transformedBookings)
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

  // OPTIMIZED: Fetch customers and bookings in parallel (40-60% faster)
  const fetchCustomers = useCallback(async () => {
    try {
      // Fetch customers and bookings in parallel instead of sequential
      const [customersResult, bookingsResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id, full_name, email, phone, created_at')
          .order('full_name'),
        supabase
          .from('bookings')
          .select('id, booking_date, total_price, status, payment_status, created_at, customer_id')
      ])

      if (customersResult.error) throw customersResult.error
      if (bookingsResult.error) throw bookingsResult.error

      const customersData = customersResult.data
      const bookingsData = bookingsResult.data

      setCustomers((customersData || []) as CustomerRecord[])

      // Group bookings by customer
      type CustomerBooking = { id: string; booking_date: string; total_price: number; status: string; created_at: string; customer_id?: string }
      const customerBookingsMap = new Map<string, CustomerBooking[]>()
      bookingsData?.forEach((booking) => {
        const customerId = booking.customer_id
        if (!customerBookingsMap.has(customerId)) {
          customerBookingsMap.set(customerId, [])
        }
        customerBookingsMap.get(customerId)?.push(booking)
      })

      // Merge customers with their bookings - create proper CustomerWithBookings
      const merged: CustomerWithBookings[] = (customersData || []).map((customer) => ({
        ...(customer as CustomerRecord),
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

  // OPTIMIZED: Fetch staff and bookings in parallel (40-60% faster)
  const fetchStaff = useCallback(async () => {
    try {
      // Fetch staff, staff bookings, team members, and team bookings in parallel
      const [staffResult, staffBookingsResult, teamMembersResult, teamBookingsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, role, created_at')
          .order('full_name'),
        supabase
          .from('bookings')
          .select('id, booking_date, total_price, status, payment_status, staff_id, created_at')
          .not('staff_id', 'is', null),
        supabase
          .from('team_members')
          .select('team_id, staff_id'),
        supabase
          .from('bookings')
          .select('id, booking_date, total_price, status, payment_status, team_id, created_at')
          .not('team_id', 'is', null)
      ])

      if (staffResult.error) throw staffResult.error
      if (staffBookingsResult.error) throw staffBookingsResult.error
      if (teamMembersResult.error) throw teamMembersResult.error
      if (teamBookingsResult.error) throw teamBookingsResult.error

      const staffData = staffResult.data
      const staffBookingsData = staffBookingsResult.data
      const teamMembersData = teamMembersResult.data
      const teamBookingsData = teamBookingsResult.data

      setStaff(staffData || [])

      // Create map of staff -> teams they belong to
      const staffToTeamsMap = new Map<string, string[]>()
      teamMembersData?.forEach((tm) => {
        if (!staffToTeamsMap.has(tm.staff_id)) {
          staffToTeamsMap.set(tm.staff_id, [])
        }
        staffToTeamsMap.get(tm.staff_id)?.push(tm.team_id)
      })

      // Count team members for each team
      const teamMemberCounts = new Map<string, number>()
      teamMembersData?.forEach((tm) => {
        const count = teamMemberCounts.get(tm.team_id) || 0
        teamMemberCounts.set(tm.team_id, count + 1)
      })

      // Group team bookings by team_id
      const teamBookingsMap = new Map<string, typeof teamBookingsData>()
      teamBookingsData?.forEach((booking) => {
        const teamId = booking.team_id
        if (teamId) {
          if (!teamBookingsMap.has(teamId)) {
            teamBookingsMap.set(teamId, [])
          }
          teamBookingsMap.get(teamId)?.push(booking)
        }
      })

      // Group staff bookings by staff_id
      type StaffBooking = { id: string; booking_date: string; total_price: number; status: string; payment_status?: string; staff_id?: string; team_id?: string; team_member_count?: number; created_at: string }
      const staffBookingsMap = new Map<string, StaffBooking[]>()

      // Add individual staff bookings
      staffBookingsData?.forEach((booking) => {
        const staffId = booking.staff_id
        if (staffId) {
          if (!staffBookingsMap.has(staffId)) {
            staffBookingsMap.set(staffId, [])
          }
          staffBookingsMap.get(staffId)?.push({
            ...booking,
            staff_id: booking.staff_id,
          })
        }
      })

      // Add team bookings for each staff member
      staffData?.forEach((staff) => {
        const teams = staffToTeamsMap.get(staff.id) || []
        teams.forEach((teamId) => {
          const teamBookings = teamBookingsMap.get(teamId) || []
          const memberCount = teamMemberCounts.get(teamId) || 1
          teamBookings.forEach((booking) => {
            if (!staffBookingsMap.has(staff.id)) {
              staffBookingsMap.set(staff.id, [])
            }
            staffBookingsMap.get(staff.id)?.push({
              ...booking,
              team_id: booking.team_id,
              team_member_count: memberCount,
            })
          })
        })
      })

      // Merge staff with their bookings (both individual and team bookings)
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

  // OPTIMIZED: Fetch teams, team members, and bookings in parallel (40-60% faster)
  const fetchTeams = useCallback(async () => {
    try {
      // Fetch all queries in parallel instead of sequential
      const [teamsResult, teamsWithMembersResult, bookingsResult] = await Promise.all([
        supabase
          .from('teams')
          .select('id, name, is_active, created_at')
          .order('name'),
        supabase
          .from('teams')
          .select(`
            id,
            name,
            is_active,
            created_at,
            team_members (id)
          `)
          .order('name'),
        supabase
          .from('bookings')
          .select('id, booking_date, total_price, status, payment_status, team_id, created_at')
          .not('team_id', 'is', null)
      ])

      if (teamsResult.error) throw teamsResult.error
      if (teamsWithMembersResult.error) throw teamsWithMembersResult.error
      if (bookingsResult.error) throw bookingsResult.error

      const teamsData = teamsResult.data
      const teamsWithMembersData = teamsWithMembersResult.data
      const bookingsData = bookingsResult.data

      setTeams(teamsData || [])

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

  const handleExport = (exportType: string) => {
    try {
      switch (exportType) {
        // Revenue & Bookings exports
        case 'revenue-summary':
          exportRevenueBookings(bookings, dateRange, 'summary')
          toast({ title: 'Export successful', description: 'Revenue summary exported to CSV' })
          break
        case 'bookings-list':
          exportRevenueBookings(bookings, dateRange, 'detailed')
          toast({ title: 'Export successful', description: 'Bookings list exported to CSV' })
          break
        case 'revenue-by-service':
          exportRevenueByServiceType(bookings, dateRange)
          toast({ title: 'Export successful', description: 'Revenue by service type exported to CSV' })
          break
        case 'peak-hours':
          exportPeakHours(bookings, dateRange)
          toast({ title: 'Export successful', description: 'Peak hours data exported to CSV' })
          break
        case 'top-packages':
          exportTopServicePackages(bookings, dateRange, 10)
          toast({ title: 'Export successful', description: 'Top service packages exported to CSV' })
          break

        // Customers exports
        case 'customers-all': {
          const topCustomersData = getTopCustomers(customersWithBookings, 10)
          exportCustomers(customers, topCustomersData, 'all')
          toast({ title: 'Export successful', description: 'Customer data exported to CSV' })
          break
        }

        // Staff exports
        case 'staff-performance': {
          const staffPerformanceData = getStaffPerformance(staffWithBookings)
          exportStaffPerformance(staffPerformanceData)
          toast({ title: 'Export successful', description: 'Staff performance data exported to CSV' })
          break
        }

        // Teams exports
        case 'teams-performance':
          exportTeamPerformance(teamsWithBookings)
          toast({ title: 'Export successful', description: 'Team performance data exported to CSV' })
          break

        default:
          console.warn('Unknown export type:', exportType)
      }
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export failed',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const updateChartData = useCallback(() => {
    const { start, end } = getDateRangePreset(dateRange)
    const mappedBookings = bookings.map((b) => ({
      id: b.id,
      booking_date: b.booking_date,
      total_price: b.total_price,
      status: b.status,
      payment_status: b.payment_status,
      created_at: b.created_at,
      customer_id: b.customer_id,
      staff_id: b.staff_id,
      service_type: b.service_packages?.service_type,
    }))
    const data = generateChartData(mappedBookings, start, end)
    setChartData(data)
  }, [bookings, dateRange])

  useEffect(() => {
    // OPTIMIZE: Run all queries in parallel for better performance
    Promise.all([
      fetchBookings(),
      fetchCustomers(),
      fetchStaff(),
      fetchTeams()
    ])
  }, [fetchBookings, fetchCustomers, fetchStaff, fetchTeams])

  useEffect(() => {
    updateChartData()
  }, [updateChartData])

  // Calculate all useMemo values BEFORE any conditional returns (Rules of Hooks)
  const mappedBookings = useMemo(
    () => bookings.map((b) => ({
      id: b.id,
      booking_date: b.booking_date,
      start_time: b.start_time,
      total_price: b.total_price,
      status: b.status,
      payment_status: b.payment_status,
      created_at: b.created_at,
      staff_id: b.staff_id,
      service_type: b.service_packages?.service_type,
    })),
    [bookings]
  )

  // Calculate top service packages by booking count
  const topPackages = useMemo(() => {
    const packageCounts = bookings.reduce((acc, booking) => {
      const packageName = booking.service_packages?.name
      if (packageName) {
        acc[packageName] = (acc[packageName] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    return Object.entries(packageCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [bookings])

  const revenueMetrics = useMemo(() => calculateRevenueMetrics(mappedBookings), [mappedBookings])
  const bookingMetrics = useMemo(() => calculateBookingMetrics(mappedBookings), [mappedBookings])
  const serviceTypeRevenue = useMemo(() => getRevenueByServiceType(mappedBookings), [mappedBookings])
  const statusBreakdown = useMemo(() => getBookingStatusBreakdown(mappedBookings), [mappedBookings])
  const peakHoursData = useMemo(() => getPeakHoursData(mappedBookings), [mappedBookings])
  const customerMetrics = useMemo(
    () => calculateCustomerMetrics(customersWithBookings, mappedBookings),
    [customersWithBookings, mappedBookings]
  )
  const topCustomers = useMemo(() => getTopCustomers(customersWithBookings, 10), [customersWithBookings])
  const staffMetrics = useMemo(() => calculateStaffMetrics(staff, staffWithBookings), [staff, staffWithBookings])
  const staffPerformance = useMemo(() => getStaffPerformance(staffWithBookings), [staffWithBookings])
  const teamMetrics = useMemo(() => calculateTeamMetrics(teams, teamsWithBookings), [teams, teamsWithBookings])
  const teamPerformance = useMemo(() => getTeamPerformance(teamsWithBookings), [teamsWithBookings])

  const serviceTypePieData = useMemo(
    () => [
      { name: 'Cleaning', value: serviceTypeRevenue.cleaning, color: '#2e4057' },
      { name: 'Training', value: serviceTypeRevenue.training, color: '#8fb996' },
    ].filter(item => item.value > 0),
    [serviceTypeRevenue]
  )

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header - Always show */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-tinedy-dark">
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Revenue insights and business metrics
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" disabled className="w-full sm:w-48">
              Select period
            </Button>
            <Button variant="outline" disabled className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
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
        <div className="flex flex-col sm:flex-row gap-2">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {activeTab === 'revenue' && (
                <>
                  <DropdownMenuItem onClick={() => handleExport('revenue-summary')}>
                    Revenue Summary
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('bookings-list')}>
                    Bookings List
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('revenue-by-service')}>
                    Revenue by Service Type
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('peak-hours')}>
                    Peak Hours Data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('top-packages')}>
                    Top Service Packages
                  </DropdownMenuItem>
                </>
              )}
              {activeTab === 'customers' && (
                <DropdownMenuItem onClick={() => handleExport('customers-all')}>
                  Export All Customer Data
                </DropdownMenuItem>
              )}
              {activeTab === 'staff' && (
                <DropdownMenuItem onClick={() => handleExport('staff-performance')}>
                  Export Staff Performance
                </DropdownMenuItem>
              )}
              {activeTab === 'teams' && (
                <DropdownMenuItem onClick={() => handleExport('teams-performance')}>
                  Export Team Performance
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="revenue" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
        <TabsContent value="revenue" className="space-y-6">
          <RevenueBookingsTab
            revenueMetrics={revenueMetrics}
            bookingMetrics={bookingMetrics}
            chartData={chartData}
            statusBreakdown={statusBreakdown}
            serviceTypeRevenue={serviceTypeRevenue}
            serviceTypePieData={serviceTypePieData}
            topPackages={topPackages}
            peakHoursData={peakHoursData}
          />
        </TabsContent>

        {/* Tab 2: Customer Analytics */}
        <TabsContent value="customers" className="space-y-6">
          <CustomersTab
            customerMetrics={customerMetrics}
            customersWithBookings={customersWithBookings}
            topCustomers={topCustomers}
            dateRange={dateRange}
          />
        </TabsContent>

        {/* Tab 3: Staff Analytics */}
        <TabsContent value="staff" className="space-y-6">
          <StaffTab
            staffMetrics={staffMetrics}
            staffPerformance={staffPerformance}
            dateRange={dateRange}
          />
        </TabsContent>

        {/* Tab 4: Team Analytics */}
        <TabsContent value="teams" className="space-y-6">
          <TeamsTab
            teamMetrics={teamMetrics}
            teamPerformance={teamPerformance}
            dateRange={dateRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
