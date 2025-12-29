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
import { StatCard } from '@/components/common/StatCard/StatCard'
import {
  StaffPerformanceTable,
  StaffPerformanceMobile,
  WorkloadDistributionMobile,
} from '@/components/reports/staff'
import { CHART_COLORS } from '@/types/reports'
import { useChartAnimation } from '@/hooks/useChartAnimation'
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
  // Prepare revenue data for charts
  const revenueData = React.useMemo(() =>
    staffPerformance
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(staff => ({
        name: staff.name,
        revenue: staff.revenue,
        jobs: staff.totalJobs,
      })),
    [staffPerformance]
  )

  // Prepare workload data for animation
  const workloadData = React.useMemo(() =>
    staffPerformance
      .filter(s => s.totalJobs > 0)
      .map(staff => ({
        name: staff.name,
        value: staff.totalJobs,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    [staffPerformance]
  )

  // Chart animation
  const workloadChart = useChartAnimation(workloadData, {
    initialDelay: 50,
    animationDuration: 800,
    enabled: true
  })

  return (
    <div className="space-y-6">
      {/* Staff Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Staff"
          value={staffMetrics.totalStaff}
          icon={Briefcase}
          iconColor="text-tinedy-blue"
        />

        <StatCard
          title="Active Staff"
          value={staffMetrics.activeStaff}
          icon={Activity}
          iconColor="text-green-500"
          valueClassName="text-green-600"
          description="With assigned bookings"
        />

        <StatCard
          title="Avg Jobs/Staff"
          value={staffMetrics.averageJobsPerStaff.toFixed(1)}
          icon={Package}
          iconColor="text-purple-500"
          valueClassName="text-purple-600"
          description="Completed jobs"
        />

        <StatCard
          title="Avg Revenue/Staff"
          value={formatCurrency(staffMetrics.averageRevenuePerStaff)}
          icon={DollarSign}
          iconColor="text-tinedy-yellow"
        />
      </div>

      {/* Staff Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Staff Chart */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              Revenue by Staff
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {revenueData.length > 0 ? (
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    stroke="#888"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#888"
                    tickFormatter={(value) => `฿${value}`}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="revenue"
                    fill={CHART_COLORS.primary}
                    radius={[4, 4, 0, 0]}
                    name="Revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] sm:h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <DollarSign className="h-10 w-10 sm:h-12 sm:w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No revenue data</p>
                <p className="text-xs">No staff revenue found for the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Workload Distribution */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
              <Target className="h-4 w-4 sm:h-5 sm:w-5" />
              Staff Workload Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {workloadData.length > 0 ? (
              <>
                {/* Desktop View - Pie Chart */}
                <div className="hidden lg:block">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={workloadData}
                        cx="50%"
                        cy="50%"
                        labelLine={workloadChart.showLabels}
                        label={workloadChart.showLabels ? (props: { name?: string; percent?: number }) => {
                          const percent = Number(props.percent || 0)
                          return percent > 0.05 ? `${props.name || ''}: ${(percent * 100).toFixed(0)}%` : ''
                        } : false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={workloadChart.isReady ? 800 : 0}
                        opacity={workloadChart.isReady ? 1 : 0}
                      >
                        {workloadData.map((_, index) => (
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
                  </div>
                  <div className="mt-4 space-y-2">
                    {staffPerformance
                      .filter(s => s.totalJobs > 0)
                      .sort((a, b) => b.totalJobs - a.totalJobs)
                      .slice(0, 5)
                      .map((staff, index) => (
                        <div key={staff.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
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
                </div>

                {/* Mobile View - Horizontal Bars */}
                <div className="lg:hidden">
                  <WorkloadDistributionMobile data={workloadData} />
                </div>
              </>
            ) : (
              <div className="h-[200px] sm:h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <Target className="h-10 w-10 sm:h-12 sm:w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No workload data</p>
                <p className="text-xs">No staff assignments found for the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff Performance Comparison */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
            <Award className="h-4 w-4 sm:h-5 sm:w-5" />
            Staff Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {/* Desktop View - Table */}
          <div className="hidden lg:block">
            <StaffPerformanceTable staffPerformance={staffPerformance} />
          </div>

          {/* Mobile View - Cards */}
          <div className="lg:hidden">
            <StaffPerformanceMobile staffPerformance={staffPerformance} />
          </div>

          {/* Legend - Show in both views */}
          {staffPerformance.length > 0 && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">
                    High Utilization (&gt;80%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-yellow-500" />
                  <span className="text-muted-foreground">
                    Medium Utilization (60-80%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-orange-500" />
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
