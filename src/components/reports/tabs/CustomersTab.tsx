import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  UserCheck,
  Repeat,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { StatCard } from '@/components/common/StatCard/StatCard'
import { TopCustomersCard } from '@/components/reports/TopCustomersCard'
import { getCustomerAcquisitionTrend, getCustomerCLVDistribution, getCustomerSegmentation, getRepeatCustomerRateTrend, getDateRangePreset, type CustomerWithBookings } from '@/lib/analytics'
import { CHART_COLORS } from '@/types/reports'
import { useChartAnimation } from '@/hooks/use-chart-animation'
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
import type { PieLabelRenderProps } from 'recharts'

interface CustomerMetrics {
  total: number
  newThisMonth: number
  returning: number
  retentionRate: number
  averageCLV: number
}

interface TopCustomer {
  id: string
  name: string
  email: string
  totalBookings: number
  totalRevenue: number
  lastBookingDate: string
}

interface CustomersTabProps {
  customerMetrics: CustomerMetrics
  customersWithBookings: CustomerWithBookings[]
  topCustomers: TopCustomer[]
  dateRange: string
}

// OPTIMIZED: Memoize tab component
function CustomersTabComponent({
  customerMetrics,
  customersWithBookings,
  topCustomers,
  dateRange,
}: CustomersTabProps) {
  // Memoize date range preset to avoid recalculation
  const dateRangePreset = React.useMemo(
    () => getDateRangePreset(dateRange),
    [dateRange]
  )

  // Memoize Customer Acquisition Trend data
  const acquisitionTrendData = React.useMemo(
    () => getCustomerAcquisitionTrend(
      customersWithBookings,
      dateRangePreset.start,
      dateRangePreset.end
    ),
    [customersWithBookings, dateRangePreset]
  )

  // Memoize CLV Distribution data
  const clvDistributionData = React.useMemo(
    () => getCustomerCLVDistribution(customersWithBookings),
    [customersWithBookings]
  )

  // Memoize Repeat Customer Rate data
  const repeatRateTrendData = React.useMemo(
    () => getRepeatCustomerRateTrend(
      customersWithBookings,
      dateRangePreset.start,
      dateRangePreset.end
    ),
    [customersWithBookings, dateRangePreset]
  )

  // Prepare segmentation data for animation
  const segmentationData = React.useMemo(() => {
    const data = getCustomerSegmentation(customersWithBookings)
    const total = data.reduce((sum, item) => sum + item.value, 0)
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
    }))
  }, [customersWithBookings])

  // Chart animation
  const segmentationChart = useChartAnimation(segmentationData, {
    initialDelay: 50,
    animationDuration: 800,
    enabled: true
  })

  // Check if CLV data has values
  const hasClvData = React.useMemo(
    () => clvDistributionData.some(d => d.count > 0),
    [clvDistributionData]
  )

  return (
    <div className="space-y-6">
      {/* Customer Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Customers"
          value={customerMetrics.total}
          icon={Users}
          iconColor="text-tinedy-blue"
        />

        <StatCard
          title="New This Month"
          value={customerMetrics.newThisMonth}
          icon={UserCheck}
          iconColor="text-green-500"
          valueClassName="text-green-600"
        />

        <StatCard
          title="Returning Customers"
          value={customerMetrics.returning}
          icon={Repeat}
          iconColor="text-purple-500"
          valueClassName="text-purple-600"
          description={`${customerMetrics.retentionRate.toFixed(1)}% retention rate`}
        />

        <StatCard
          title="Avg CLV"
          value={formatCurrency(customerMetrics.averageCLV)}
          icon={DollarSign}
          iconColor="text-tinedy-yellow"
          description="Revenue per customer"
        />
      </div>

      {/* Customer Analytics Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer Acquisition Trend */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              Customer Acquisition Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
              <LineChart data={acquisitionTrendData}>
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
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.primary, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="New Customers"
                />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Customer Lifetime Value Distribution */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              Customer Lifetime Value Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {!hasClvData ? (
              <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-xs sm:text-sm text-muted-foreground">
                No customer data available for selected period
              </div>
            ) : (
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clvDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="range"
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
                      dataKey="count"
                      fill={CHART_COLORS.secondary}
                      radius={[4, 4, 0, 0]}
                      name="Customers"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Analytics Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer Segmentation */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Customer Segmentation by Booking Frequency
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentationData}
                  cx="50%"
                  cy="50%"
                  labelLine={segmentationChart.showLabels}
                  label={segmentationChart.showLabels ? (props: PieLabelRenderProps) => {
                    const percent = Number(props.percent || 0)
                    return percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                  } : false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={segmentationChart.isReady ? 800 : 0}
                  opacity={segmentationChart.isReady ? 1 : 0}
                >
                  {segmentationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-3 sm:mt-4">
              {segmentationData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 sm:p-3 border rounded-md">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs sm:text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs sm:text-sm text-muted-foreground">{item.value}</span>
                    <span className="text-xs sm:text-sm font-semibold">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Repeat Customer Rate Trend */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
              <Repeat className="h-4 w-4 sm:h-5 sm:w-5" />
              Repeat Customer Rate Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
              <LineChart data={repeatRateTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value: number) => `${value}%`}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke={CHART_COLORS.success}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.success, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Repeat Rate %"
                />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            Top 10 Customers by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <TopCustomersCard customers={topCustomers} />
        </CardContent>
      </Card>
    </div>
  )
}

// Export memoized component
export const CustomersTab = React.memo(CustomersTabComponent)
