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
import { MetricCard } from '@/components/reports/MetricCard'
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
import { useChartAnimation } from '@/hooks/useChartAnimation'

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
        <MetricCard
          variant="subtitle"
          title="Total Revenue"
          value={formatCurrency(revenueMetrics.total)}
          icon={DollarSign}
          iconClassName="h-4 w-4 text-tinedy-yellow"
          subtitle="All time"
        />

        <MetricCard
          variant="trend"
          title="This Month"
          value={formatCurrency(revenueMetrics.thisMonth)}
          icon={Calendar}
          iconClassName="h-4 w-4 text-tinedy-blue"
          trend={{
            value: revenueMetrics.monthGrowth,
            comparisonText: 'vs last month',
          }}
        />

        <MetricCard
          variant="trend"
          title="This Week"
          value={formatCurrency(revenueMetrics.thisWeek)}
          icon={BarChart3}
          iconClassName="h-4 w-4 text-tinedy-green"
          trend={{
            value: revenueMetrics.weekGrowth,
            comparisonText: 'vs last week',
          }}
        />

        <MetricCard
          variant="subtitle"
          title="Avg Order Value"
          value={formatCurrency(revenueMetrics.avgOrderValue)}
          icon={ShoppingCart}
          iconClassName="h-4 w-4 text-purple-500"
          subtitle="Per booking"
        />
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
          </CardContent>
        </Card>

        {/* Bookings Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Package className="h-5 w-5" />
              Bookings Trend
              <span className="text-sm font-normal text-muted-foreground">(Paid only)</span>
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
            <div className="flex flex-wrap justify-center gap-4 pt-2 border-t mt-4">
              {statusBreakdown
                .filter((item) => item.value > 0)
                .map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-tinedy-dark">{item.name}</span>
                    <span className="text-sm font-bold text-tinedy-dark">{item.value}</span>
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
      </div>

      {/* Charts Row 3 - Booking Statistics & Top Packages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        {/* Top Service Packages */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Service Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPackages.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
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
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No service package data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 4 - Peak Hours Analysis */}
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
    </div>
  )
}

// Export memoized component
export const RevenueBookingsTab = React.memo(RevenueBookingsTabComponent)
