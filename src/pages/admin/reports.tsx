import { useState, useMemo, useEffect } from 'react'
import { isWithinInterval } from 'date-fns'
import { usePermissions } from '@/hooks/use-permissions'
import { useReportStats } from '@/hooks/useReportStats'
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
} from '@/lib/analytics'
import { RevenueBookingsTab } from '@/components/reports/tabs/RevenueBookingsTab'
import { CustomersTab } from '@/components/reports/tabs/CustomersTab'
import { StaffTab } from '@/components/reports/tabs/StaffTab'
import { TeamsTab } from '@/components/reports/tabs/TeamsTab'

export function AdminReports() {
  // React Query - Fetch all reports data (replaces 9 useState + 4 fetch functions)
  const {
    bookings,
    customers,
    customersWithBookings,
    staff,
    staffWithBookings,
    teams,
    teamsWithBookings,
    isLoading,
    error,
  } = useReportStats()

  // UI states only
  const [dateRange, setDateRange] = useState('thisMonth')
  const [activeTab, setActiveTab] = useState('revenue')
  const { toast } = useToast()
  const { role } = usePermissions()

  // Show error toast if query fails (use useEffect to avoid infinite loop)
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load reports data. Please refresh the page.',
        variant: 'destructive',
      })
    }
  }, [error, toast])

  // ===================================================================
  // React Query Migration Complete
  // - Migrated to reports-queries.ts + useReportStats hook
  // - Removed ~306 lines of manual fetching code
  // - Reduced from 12 useState to 3 UI states
  // ===================================================================

  const handleExport = (exportType: string) => {
    try {
      let success = false

      switch (exportType) {
        // Revenue & Bookings exports
        case 'revenue-summary':
          success = exportRevenueBookings(bookings, dateRange, 'summary', role)
          break
        case 'bookings-list':
          success = exportRevenueBookings(bookings, dateRange, 'detailed', role)
          break
        case 'revenue-by-service':
          success = exportRevenueByServiceType(bookings, dateRange, role)
          break
        case 'peak-hours':
          success = exportPeakHours(bookings, dateRange)
          break
        case 'top-packages':
          success = exportTopServicePackages(bookings, dateRange, 10)
          break

        // Customers exports
        case 'customers-all': {
          const topCustomersData = getTopCustomers(customersWithBookings, 10)
          success = exportCustomers(customers, topCustomersData, 'all')
          break
        }

        // Staff exports
        case 'staff-performance': {
          // Use filtered staff data based on selected date range
          const { start, end } = getDateRangePreset(dateRange)
          const filteredStaff = staffWithBookings.map((staffMember) => ({
            ...staffMember,
            bookings: staffMember.bookings.filter((booking) =>
              isWithinInterval(new Date(booking.booking_date), { start, end })
            ),
          }))
          const staffPerformanceData = getStaffPerformance(filteredStaff)
          success = exportStaffPerformance(staffPerformanceData, role)
          break
        }

        // Teams exports
        case 'teams-performance': {
          // Use filtered teams data based on selected date range
          const { start, end } = getDateRangePreset(dateRange)
          const filteredTeams = teamsWithBookings.map((team) => ({
            ...team,
            bookings: team.bookings.filter((booking) =>
              isWithinInterval(new Date(booking.booking_date), { start, end })
            ),
          }))
          success = exportTeamPerformance(filteredTeams, role)
          break
        }

        default:
          console.warn('Unknown export type:', exportType)
      }

      // Show appropriate toast based on result
      if (success) {
        toast({
          title: 'Export successful',
          description: 'Data exported to CSV successfully',
        })
      } else {
        toast({
          title: 'No data to export',
          description: 'There is no data available for the selected criteria',
        })
      }
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export failed',
        description: 'An error occurred while exporting data',
        variant: 'destructive',
      })
    }
  }

  // Calculate chart data with useMemo (no need for useEffect + useState)
  const chartData = useMemo(() => {
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
    return generateChartData(mappedBookings, start, end)
  }, [bookings, dateRange])

  // Filter bookings by date range for all charts
  const filteredBookings = useMemo(() => {
    const { start, end } = getDateRangePreset(dateRange)
    return bookings.filter((booking) =>
      isWithinInterval(new Date(booking.booking_date), { start, end })
    )
  }, [bookings, dateRange])

  // Calculate all useMemo values BEFORE any conditional returns (Rules of Hooks)
  const mappedBookings = useMemo(
    () => filteredBookings.map((b) => ({
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
    [filteredBookings]
  )

  // Calculate top service packages by booking count
  const topPackages = useMemo(() => {
    const packageCounts = filteredBookings.reduce((acc, booking) => {
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
  }, [filteredBookings])

  // Filter staff bookings by date range
  const filteredStaffWithBookings = useMemo(() => {
    const { start, end } = getDateRangePreset(dateRange)
    return staffWithBookings.map((staffMember) => ({
      ...staffMember,
      bookings: staffMember.bookings.filter((booking) =>
        isWithinInterval(new Date(booking.booking_date), { start, end })
      ),
    }))
  }, [staffWithBookings, dateRange])

  // Filter team bookings by date range
  const filteredTeamsWithBookings = useMemo(() => {
    const { start, end } = getDateRangePreset(dateRange)
    return teamsWithBookings.map((team) => ({
      ...team,
      bookings: team.bookings.filter((booking) =>
        isWithinInterval(new Date(booking.booking_date), { start, end })
      ),
    }))
  }, [teamsWithBookings, dateRange])

  // Filter customer bookings by date range
  const filteredCustomersWithBookings = useMemo(() => {
    const { start, end } = getDateRangePreset(dateRange)
    return customersWithBookings.map((customer) => ({
      ...customer,
      bookings: customer.bookings.filter((booking) =>
        isWithinInterval(new Date(booking.booking_date), { start, end })
      ),
    }))
  }, [customersWithBookings, dateRange])

  // Calculate all-time bookings (not filtered by date range) for Total Revenue
  const allTimeBookings = useMemo(
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

  // Calculate metrics from all-time bookings (not filtered by date range)
  const revenueMetrics = useMemo(() => {
    return calculateRevenueMetrics(allTimeBookings)
  }, [allTimeBookings])

  const bookingMetrics = useMemo(() => calculateBookingMetrics(mappedBookings), [mappedBookings])
  const serviceTypeRevenue = useMemo(() => getRevenueByServiceType(mappedBookings), [mappedBookings])
  const statusBreakdown = useMemo(() => getBookingStatusBreakdown(mappedBookings), [mappedBookings])
  const peakHoursData = useMemo(() => getPeakHoursData(mappedBookings), [mappedBookings])
  const customerMetrics = useMemo(() => {
    // Use all-time data for accurate customer stats (not filtered by date range)
    return calculateCustomerMetrics(customersWithBookings, allTimeBookings)
  }, [customersWithBookings, allTimeBookings])
  const topCustomers = useMemo(() => {
    return getTopCustomers(filteredCustomersWithBookings, 10)
  }, [filteredCustomersWithBookings])
  const staffMetrics = useMemo(() =>
    // Use all-time data for staff metrics (not filtered by date range)
    calculateStaffMetrics(staff, staffWithBookings),
    [staff, staffWithBookings]
  )
  const staffPerformance = useMemo(() => getStaffPerformance(filteredStaffWithBookings), [filteredStaffWithBookings])
  const teamMetrics = useMemo(() =>
    // Use all-time data for team metrics (not filtered by date range)
    calculateTeamMetrics(teams, teamsWithBookings),
    [teams, teamsWithBookings]
  )
  const teamPerformance = useMemo(() => getTeamPerformance(filteredTeamsWithBookings), [filteredTeamsWithBookings])

  const serviceTypePieData = useMemo(
    () => [
      { name: 'Cleaning', value: serviceTypeRevenue.cleaning, color: '#2e4057' },
      { name: 'Training', value: serviceTypeRevenue.training, color: '#8fb996' },
    ].filter(item => item.value > 0),
    [serviceTypeRevenue]
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Page header - Always show */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Revenue insights and business metrics
          </p>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[40px]">
        <p className="text-sm text-muted-foreground">
          Revenue insights and business metrics
        </p>
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
            customersWithBookings={filteredCustomersWithBookings}
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
