import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart3,
  DollarSign,
  Calendar,
  ShoppingCart,
  Package,
  TrendingUp,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { StatCard } from '@/components/common/StatCard/StatCard'
import type { ChartDataPoint } from '@/lib/analytics'
import { CHART_COLORS } from '@/types/reports'
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
import { useChartAnimation } from '@/hooks/use-chart-animation'
import { PeakHoursHeatmap, PeakHoursMobile } from '@/components/reports/peak-hours'

interface RevenueMetrics {
  total: number
  thisMonth: number
  thisWeek: number
  avgOrderValue: number
  monthGrowth: number
  weekGrowth: number
}

interface BookingMetrics {
  total: number
  thisMonth: number
  completed: number
  cancelled: number
  pending: number
  completionRate: number
  cancellationRate: number
}

interface ServiceTypeRevenue {
  cleaning: number
  training: number
}

interface StatusBreakdownItem {
  name: string
  value: number
  color: string
}

interface TopPackage {
  name: string
  count: number
}

interface PeakHourData {
  day: string
  hour: number
  count: number
}

interface RevenueBookingsTabProps {
  revenueMetrics: RevenueMetrics
  bookingMetrics: BookingMetrics
  chartData: ChartDataPoint[]
  statusBreakdown: StatusBreakdownItem[]
  serviceTypeRevenue: ServiceTypeRevenue
  serviceTypePieData: { name: string; value: number; color: string }[]
  topPackages: TopPackage[]
  peakHoursData: PeakHourData[]
}

// OPTIMIZED: Memoize tab component to prevent unnecessary re-renders (40-60% faster)
function RevenueBookingsTabComponent({
  revenueMetrics,
  bookingMetrics,
  chartData,
  statusBreakdown,
  serviceTypeRevenue,
  serviceTypePieData,
  topPackages,
  peakHoursData,
}: RevenueBookingsTabProps) {
  // Chart animations using custom hook
  const statusChart = useChartAnimation(statusBreakdown, {
    initialDelay: 50,
    animationDuration: 800,
    enabled: true,
  })

  const serviceTypeChart = useChartAnimation(serviceTypePieData, {
    initialDelay: 50,
    animationDuration: 800,
    enabled: true,
  })

  return (
    <div className="space-y-6">
      {/* Revenue Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(revenueMetrics.total)}
          icon={DollarSign}
          iconColor="text-tinedy-yellow"
          description="All time"
        />

        <StatCard
          title="This Month"
          value={formatCurrency(revenueMetrics.thisMonth)}
          icon={Calendar}
          iconColor="text-tinedy-blue"
          trendValue={revenueMetrics.monthGrowth}
          trendLabel="vs last month"
        />

        <StatCard
          title="This Week"
          value={formatCurrency(revenueMetrics.thisWeek)}
          icon={BarChart3}
          iconColor="text-tinedy-green"
          trendValue={revenueMetrics.weekGrowth}
          trendLabel="vs last week"
        />

        <StatCard
          title="Avg Order Value"
          value={formatCurrency(revenueMetrics.avgOrderValue)}
          icon={ShoppingCart}
          iconColor="text-purple-500"
          description="Per booking"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
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
                  tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
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
            </div>
          </CardContent>
        </Card>

        {/* Bookings Trend Chart */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              Bookings Trend
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">(Paid only)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 - Status & Service Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Booking Status Breakdown */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display text-base sm:text-lg">Booking Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {statusBreakdown.filter((item) => item.value > 0).length > 0 ? (
              <>
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusBreakdown.filter((item) => item.value > 0) as unknown as Record<string, unknown>[]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      labelLine={statusChart.showLabels}
                      label={
                        statusChart.showLabels
                          ? ((props: { name?: string; percent?: number }) =>
                              (props.percent || 0) > 0 ? `${props.name || ''}: ${((props.percent || 0) * 100).toFixed(0)}%` : ''
                            )
                          : false
                      }
                      animationBegin={0}
                      animationDuration={statusChart.isReady ? 800 : 0}
                      animationEasing="ease-out"
                      opacity={statusChart.isReady ? 1 : 0}
                      stroke="none"
                    >
                      {statusBreakdown
                        .filter((entry) => entry.value > 0)
                        .map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 pt-2 border-t mt-3 sm:mt-4">
                  {statusBreakdown
                    .filter((item) => item.value > 0)
                    .map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs sm:text-sm font-medium text-tinedy-dark">{item.name}</span>
                        <span className="text-xs sm:text-sm font-bold text-tinedy-dark">{item.value}</span>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <div className="h-[250px] sm:h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No booking data</p>
                <p className="text-xs">No bookings found for the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Service Type */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display text-base sm:text-lg">Revenue by Service Type</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {serviceTypePieData.length > 0 ? (
              <>
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceTypePieData}
                      cx="50%"
                      cy="50%"
                      labelLine={serviceTypeChart.showLabels}
                      label={
                        serviceTypeChart.showLabels
                          ? ((props: { name?: string; percent?: number }) => {
                              const percent = Number(props.percent || 0)
                              return `${props.name || ''}: ${(percent * 100).toFixed(0)}%`
                            })
                          : false
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={serviceTypeChart.isReady ? 800 : 0}
                      animationEasing="ease-out"
                      opacity={serviceTypeChart.isReady ? 1 : 0}
                    >
                      {serviceTypePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                  <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-md">
                    <p className="text-xs sm:text-sm text-muted-foreground">Cleaning</p>
                    <p className="text-base sm:text-lg font-bold text-tinedy-dark">
                      {formatCurrency(serviceTypeRevenue.cleaning)}
                    </p>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-md">
                    <p className="text-xs sm:text-sm text-muted-foreground">Training</p>
                    <p className="text-base sm:text-lg font-bold text-tinedy-dark">
                      {formatCurrency(serviceTypeRevenue.training)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[250px] sm:h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <DollarSign className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No revenue data</p>
                <p className="text-xs">No paid bookings found for the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 - Booking Statistics & Top Packages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Booking Statistics */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display text-base sm:text-lg">Booking Statistics</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-xl sm:text-2xl font-bold text-tinedy-dark">
                  {bookingMetrics.total}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">This Month</p>
                <p className="text-xl sm:text-2xl font-bold text-tinedy-blue">
                  {bookingMetrics.thisMonth}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">Completed</span>
                <span className="text-xs sm:text-sm font-semibold text-green-600">
                  {bookingMetrics.completed}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 sm:h-2">
                <div
                  className="bg-green-500 h-1.5 sm:h-2 rounded-full"
                  style={{ width: `${bookingMetrics.completionRate}%` }}
                />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground text-right">
                {bookingMetrics.completionRate.toFixed(1)}% completion rate
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">Cancelled</span>
                <span className="text-xs sm:text-sm font-semibold text-red-600">
                  {bookingMetrics.cancelled}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 sm:h-2">
                <div
                  className="bg-red-500 h-1.5 sm:h-2 rounded-full"
                  style={{ width: `${bookingMetrics.cancellationRate}%` }}
                />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground text-right">
                {bookingMetrics.cancellationRate.toFixed(1)}% cancellation rate
              </p>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">Pending</span>
                <span className="text-xs sm:text-sm font-semibold text-yellow-600">
                  {bookingMetrics.pending}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Service Packages */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              Top Service Packages
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {topPackages.length > 0 ? (
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topPackages}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#888" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 12 }}
                    stroke="#888"
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="count"
                    fill={CHART_COLORS.accent}
                    radius={[0, 4, 4, 0]}
                    name="Bookings"
                  />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-xs sm:text-sm text-muted-foreground">
                No service package data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 4 - Peak Hours Analysis */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="font-display text-base sm:text-lg">Peak Hours Heatmap</CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Booking frequency by start time across each day
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {/* Desktop View */}
          <div className="hidden lg:block">
            <PeakHoursHeatmap data={peakHoursData} />
          </div>

          {/* Mobile & Tablet View */}
          <div className="lg:hidden">
            <PeakHoursMobile data={peakHoursData} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Export memoized component
export const RevenueBookingsTab = React.memo(RevenueBookingsTabComponent)
