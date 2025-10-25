import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  UserCheck,
  Repeat,
  DollarSign,
  TrendingUp,
  Mail,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { MetricCard } from '@/components/reports/MetricCard'
import { getCustomerAcquisitionTrend, getCustomerCLVDistribution, getCustomerSegmentation, getRepeatCustomerRateTrend, getDateRangePreset, type CustomerWithBookings } from '@/lib/analytics'
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
  return (
    <div className="space-y-6">
      {/* Customer Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard
          title="Total Customers"
          value={customerMetrics.total}
          icon={Users}
          iconClassName="h-4 w-4 text-tinedy-blue"
        />

        <MetricCard
          title="New This Month"
          value={customerMetrics.newThisMonth}
          icon={UserCheck}
          iconClassName="h-4 w-4 text-green-500"
          valueClassName="text-2xl font-bold text-green-600"
        />

        <MetricCard
          variant="subtitle"
          title="Returning Customers"
          value={customerMetrics.returning}
          icon={Repeat}
          iconClassName="h-4 w-4 text-purple-500"
          valueClassName="text-2xl font-bold text-purple-600"
          subtitle={`${customerMetrics.retentionRate.toFixed(1)}% retention rate`}
        />

        <MetricCard
          variant="subtitle"
          title="Avg Customer Lifetime Value"
          value={formatCurrency(customerMetrics.averageCLV)}
          icon={DollarSign}
          iconClassName="h-4 w-4 text-tinedy-yellow"
          subtitle="Revenue per customer"
          className="sm:col-span-2"
        />
      </div>

      {/* Customer Analytics Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer Acquisition Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Customer Acquisition Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={getCustomerAcquisitionTrend(
                  customersWithBookings,
                  getDateRangePreset(dateRange).start,
                  getDateRangePreset(dateRange).end
                )}
              >
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
          </CardContent>
        </Card>

        {/* Customer Lifetime Value Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Customer Lifetime Value Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getCustomerCLVDistribution(customersWithBookings)}>
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
          </CardContent>
        </Card>
      </div>

      {/* Customer Analytics Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer Segmentation */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Segmentation by Booking Frequency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getCustomerSegmentation(customersWithBookings)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: PieLabelRenderProps) => {
                    const percent = Number(props.percent || 0)
                    return percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getCustomerSegmentation(customersWithBookings).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 gap-2 mt-4">
              {getCustomerSegmentation(customersWithBookings).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Repeat Customer Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Repeat Customer Rate Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={getRepeatCustomerRateTrend(
                  customersWithBookings,
                  getDateRangePreset(dateRange).start,
                  getDateRangePreset(dateRange).end
                )}
              >
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
    </div>
  )
}

// Export memoized component
export const CustomersTab = React.memo(CustomersTabComponent)
