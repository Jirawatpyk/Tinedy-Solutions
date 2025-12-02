import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BriefcaseBusiness,
  Activity,
  Package,
  DollarSign,
  Target,
  Award,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { MetricCard } from '@/components/reports/MetricCard'
import { CHART_COLORS } from '@/types/reports'
import { useChartAnimation } from '@/hooks/useChartAnimation'
import type { TeamMetrics, TeamPerformance } from '@/lib/analytics'
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

interface TeamsTabProps {
  teamMetrics: TeamMetrics
  teamPerformance: TeamPerformance[]
  dateRange: string
}

// OPTIMIZED: Memoize tab component
function TeamsTabComponent({
  teamMetrics,
  teamPerformance,
}: TeamsTabProps) {
  // Prepare workload data for animation
  const workloadData = React.useMemo(() =>
    teamPerformance
      .map((team: TeamPerformance) => ({
        name: team.name,
        value: team.totalJobs,
      }))
      .filter((t: { value: number }) => t.value > 0),
    [teamPerformance]
  )

  // Chart animation
  const workloadChart = useChartAnimation(workloadData, {
    initialDelay: 50,
    animationDuration: 800,
    enabled: true
  })

  return (
    <div className="space-y-6">
      {/* Team Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Teams"
          value={teamMetrics.totalTeams}
          icon={BriefcaseBusiness}
          iconClassName="h-4 w-4 text-tinedy-blue"
        />

        <MetricCard
          variant="subtitle"
          title="Active Teams"
          value={teamMetrics.activeTeams}
          icon={Activity}
          iconClassName="h-4 w-4 text-green-500"
          valueClassName="text-2xl font-bold text-green-600"
          subtitle="With assigned jobs"
        />

        <MetricCard
          variant="subtitle"
          title="Total Team Jobs"
          value={teamMetrics.totalTeamBookings}
          icon={Package}
          iconClassName="h-4 w-4 text-purple-500"
          valueClassName="text-2xl font-bold text-purple-600"
          subtitle="All team bookings"
        />

        <MetricCard
          title="Team Revenue"
          value={formatCurrency(teamMetrics.totalTeamRevenue)}
          icon={DollarSign}
          iconClassName="h-4 w-4 text-tinedy-yellow"
        />
      </div>

      {/* Revenue by Team Chart */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
            Revenue by Team
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={teamPerformance
                .map(team => ({
                  name: team.name,
                  revenue: team.revenue,
                  jobs: team.totalJobs,
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
                fill={CHART_COLORS.secondary}
                radius={[4, 4, 0, 0]}
                name="Revenue"
              />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Team Workload & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Team Workload Distribution */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
              <Target className="h-4 w-4 sm:h-5 sm:w-5" />
              Team Workload Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {workloadData.length > 0 ? (
              <>
                <div className="h-[250px] sm:h-[300px]">
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
                      {workloadData.map((_: { name: string; value: number }, index: number) => (
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
                <div className="mt-3 sm:mt-4 space-y-2">
                  {teamPerformance
                    .filter((t: TeamPerformance) => t.totalJobs > 0)
                    .sort((a: TeamPerformance, b: TeamPerformance) => b.totalJobs - a.totalJobs)
                    .slice(0, 5)
                    .map((team: TeamPerformance, index: number) => (
                      <div key={team.id} className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
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
                        <span className="font-semibold">{team.totalJobs} jobs</span>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <div className="h-[250px] sm:h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <Target className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No workload data</p>
                <p className="text-xs">No team assignments found for the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Completion Rate */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
              <Award className="h-4 w-4 sm:h-5 sm:w-5" />
              Team Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            {teamPerformance.filter((t: TeamPerformance) => t.totalJobs > 0).length > 0 ? (
              teamPerformance
                .filter((t: TeamPerformance) => t.totalJobs > 0)
                .sort((a: TeamPerformance, b: TeamPerformance) => b.completionRate - a.completionRate)
                .slice(0, 8)
                .map((team: TeamPerformance) => {
                  const totalJobs = team.totalJobs
                  const completed = team.completed
                  const completionRate = team.completionRate

                  return (
                    <div key={team.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs sm:text-sm font-medium">{team.name}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {completed}/{totalJobs}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5 sm:h-2">
                          <div
                            className={`h-1.5 sm:h-2 rounded-full ${
                              completionRate >= 80
                                ? 'bg-green-500'
                                : completionRate >= 60
                                ? 'bg-yellow-500'
                                : 'bg-orange-500'
                            }`}
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <span className="text-[10px] sm:text-xs font-semibold w-10 sm:w-12 text-right">
                          {completionRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )
                })
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <Award className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No completion data</p>
                <p className="text-xs">No team jobs found for the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Comparison Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
            <BriefcaseBusiness className="h-4 w-4 sm:h-5 sm:w-5" />
            Team Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-2 font-semibold text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                    Rank
                  </th>
                  <th className="pb-2 font-semibold text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                    Team Name
                  </th>
                  <th className="pb-2 font-semibold text-xs sm:text-sm text-muted-foreground text-right whitespace-nowrap">
                    Members
                  </th>
                  <th className="pb-2 font-semibold text-xs sm:text-sm text-muted-foreground text-right whitespace-nowrap">
                    Total Jobs
                  </th>
                  <th className="pb-2 font-semibold text-xs sm:text-sm text-muted-foreground text-right whitespace-nowrap">
                    Completed
                  </th>
                  <th className="pb-2 font-semibold text-xs sm:text-sm text-muted-foreground text-right whitespace-nowrap">
                    In Progress
                  </th>
                  <th className="pb-2 font-semibold text-xs sm:text-sm text-muted-foreground text-right whitespace-nowrap">
                    Pending
                  </th>
                  <th className="pb-2 font-semibold text-xs sm:text-sm text-muted-foreground text-right whitespace-nowrap">
                    Revenue
                  </th>
                  <th className="pb-2 font-semibold text-xs sm:text-sm text-muted-foreground text-right whitespace-nowrap">
                    Rate
                  </th>
                  <th className="pb-2 font-semibold text-xs sm:text-sm text-muted-foreground text-right whitespace-nowrap">
                    Utilization
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
                      No team performance data available
                    </td>
                  </tr>
                ) : (
                  teamPerformance
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((team, index) => (
                      <tr key={team.id} className="border-b hover:bg-accent/20">
                        <td className="py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {index === 0 && <Award className="h-3 w-3 sm:h-4 sm:w-4 text-tinedy-yellow" />}
                            <span className={index === 0 ? 'font-bold text-tinedy-yellow' : ''}>
                              #{index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap">{team.name}</td>
                        <td className="py-2 sm:py-3 text-xs sm:text-sm text-right whitespace-nowrap">
                          <span className="inline-flex items-center justify-center rounded-full bg-tinedy-blue/10 px-2 py-1 text-[10px] sm:text-xs font-medium text-tinedy-blue">
                            {team.memberCount}
                          </span>
                        </td>
                        <td className="py-2 sm:py-3 text-xs sm:text-sm text-right whitespace-nowrap">{team.totalJobs}</td>
                        <td className="py-2 sm:py-3 text-xs sm:text-sm text-right text-green-600 font-semibold whitespace-nowrap">
                          {team.completed}
                        </td>
                        <td className="py-2 sm:py-3 text-xs sm:text-sm text-right text-blue-600 whitespace-nowrap">
                          {team.inProgress}
                        </td>
                        <td className="py-2 sm:py-3 text-xs sm:text-sm text-right text-yellow-600 whitespace-nowrap">
                          {team.pending}
                        </td>
                        <td className="py-2 sm:py-3 text-xs sm:text-sm font-bold text-right text-tinedy-dark whitespace-nowrap">
                          {formatCurrency(team.revenue)}
                        </td>
                        <td className="py-2 sm:py-3 text-xs sm:text-sm text-right whitespace-nowrap">
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
                        <td className="py-2 sm:py-3 text-xs sm:text-sm text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 sm:w-16 bg-gray-200 rounded-full h-1.5 sm:h-2">
                              <div
                                className={`h-1.5 sm:h-2 rounded-full ${
                                  team.completionRate >= 80
                                    ? 'bg-green-500'
                                    : team.completionRate >= 60
                                    ? 'bg-yellow-500'
                                    : 'bg-orange-500'
                                }`}
                                style={{ width: `${team.completionRate}%` }}
                              />
                            </div>
                            <span className="text-[10px] sm:text-xs font-medium">
                              {team.completionRate.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          {teamPerformance.length > 0 && (
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
export const TeamsTab = React.memo(TeamsTabComponent)
