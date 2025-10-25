import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Briefcase,
  Activity,
  Package,
  DollarSign,
  Target,
  Award,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { MetricCard } from '@/components/reports/MetricCard'
import { CHART_COLORS } from '@/types/reports'
import {
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

interface StaffMetrics {
  totalStaff: number
  activeStaff: number
  averageJobsPerStaff: number
  averageRevenuePerStaff: number
}

interface StaffPerformanceData {
  id: string
  name: string
  email: string
  totalJobs: number
  completedJobs: number
  revenue: number
  completionRate: number
  avgJobValue: number
  utilizationRate: number
}

interface StaffTabProps {
  staffMetrics: StaffMetrics
  staffPerformance: StaffPerformanceData[]
  dateRange: string
}

// OPTIMIZED: Memoize tab component
function StaffTabComponent({
  staffMetrics,
  staffPerformance,
}: StaffTabProps) {
  return (
    <div className="space-y-6">
      {/* Staff Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Staff"
          value={staffMetrics.totalStaff}
          icon={Briefcase}
          iconClassName="h-4 w-4 text-tinedy-blue"
        />

        <MetricCard
          variant="subtitle"
          title="Active Staff"
          value={staffMetrics.activeStaff}
          icon={Activity}
          iconClassName="h-4 w-4 text-green-500"
          valueClassName="text-2xl font-bold text-green-600"
          subtitle="With assigned bookings"
        />

        <MetricCard
          variant="subtitle"
          title="Avg Jobs/Staff"
          value={staffMetrics.averageJobsPerStaff.toFixed(1)}
          icon={Package}
          iconClassName="h-4 w-4 text-purple-500"
          valueClassName="text-2xl font-bold text-purple-600"
          subtitle="Completed jobs"
        />

        <MetricCard
          title="Avg Revenue/Staff"
          value={formatCurrency(staffMetrics.averageRevenuePerStaff)}
          icon={DollarSign}
          iconClassName="h-4 w-4 text-tinedy-yellow"
        />
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
                  tickFormatter={(value) => `฿${value}`}
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
    </div>
  )
}

// Export memoized component
export const StaffTab = React.memo(StaffTabComponent)
