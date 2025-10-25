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
import type { TeamWithBookings } from '@/types/reports'
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
  teamsWithBookings: TeamWithBookings[]
  dateRange: string
}

// OPTIMIZED: Memoize tab component
function TeamsTabComponent({
  teamsWithBookings,
}: TeamsTabProps) {
  return (
    <div className="space-y-6">
      {/* Team Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Teams"
          value={teamsWithBookings.length}
          icon={BriefcaseBusiness}
          iconClassName="h-4 w-4 text-tinedy-blue"
        />

        <MetricCard
          variant="subtitle"
          title="Active Teams"
          value={teamsWithBookings.filter(t => t.bookings.length > 0).length}
          icon={Activity}
          iconClassName="h-4 w-4 text-green-500"
          valueClassName="text-2xl font-bold text-green-600"
          subtitle="With assigned jobs"
        />

        <MetricCard
          variant="subtitle"
          title="Total Team Jobs"
          value={teamsWithBookings.reduce((sum, team) => sum + team.bookings.length, 0)}
          icon={Package}
          iconClassName="h-4 w-4 text-purple-500"
          valueClassName="text-2xl font-bold text-purple-600"
          subtitle="All team bookings"
        />

        <MetricCard
          title="Team Revenue"
          value={formatCurrency(
            teamsWithBookings.reduce((sum, team) =>
              sum + team.bookings
                .filter(b => b.status === 'completed')
                .reduce((s, b) => s + Number(b.total_price), 0),
              0
            )
          )}
          icon={DollarSign}
          iconClassName="h-4 w-4 text-tinedy-yellow"
        />
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
                    Rate
                  </th>
                  <th className="pb-2 font-semibold text-sm text-muted-foreground text-right">
                    Utilization
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
                        <td className="py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  team.completionRate >= 80
                                    ? 'bg-green-500'
                                    : team.completionRate >= 60
                                    ? 'bg-yellow-500'
                                    : 'bg-orange-500'
                                }`}
                                style={{ width: `${team.completionRate}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">
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
          {teamsWithBookings.length > 0 && (
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
export const TeamsTab = React.memo(TeamsTabComponent)
