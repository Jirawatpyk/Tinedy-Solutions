import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { BarChart3 } from 'lucide-react'

/**
 * Performance stats type for the chart
 * Matches the shape passed from dashboard.tsx
 */
interface PerformanceStats {
  totalJobs: number
  completedJobs: number
  completionRate: number
  averageRating: number
  totalRevenue: number
  monthlyData: {
    month: string
    jobs: number
    revenue: number
  }[]
}

interface PerformanceChartProps {
  stats: PerformanceStats
}

// Custom Tooltip Component
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string }>
  label?: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[120px]">
        <p className="font-medium text-gray-900 mb-1.5 text-xs">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-500">
                {entry.dataKey === 'tasks' ? 'Tasks' : 'Revenue'}
              </span>
            </span>
            <span className="font-semibold text-gray-900">
              {entry.dataKey === 'revenue'
                ? `฿${entry.value.toLocaleString()}`
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function PerformanceChart({ stats }: PerformanceChartProps) {
  // Format month data for charts
  const chartData = stats.monthlyData.map((item) => ({
    month: format(new Date(item.month + '-01'), 'MMM', { locale: enUS }),
    tasks: item.jobs,
    revenue: item.revenue,
  }))

  // Check if we have meaningful revenue data
  const hasRevenueData = stats.monthlyData.some(item => item.revenue > 0)

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Performance (6 Months)
          </CardTitle>
          {/* Compact Legend */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span className="text-muted-foreground">Tasks</span>
            </span>
            {hasRevenueData && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Revenue</span>
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: hasRevenueData ? 45 : 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="tasksGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f3f4f6"
            />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              dy={5}
            />

            {/* Left Y-Axis for Tasks */}
            <YAxis
              yAxisId="tasks"
              orientation="left"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={25}
              allowDecimals={false}
            />

            {/* Right Y-Axis for Revenue (only if has data) */}
            {hasRevenueData && (
              <YAxis
                yAxisId="revenue"
                orientation="right"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
                  return `฿${value}`
                }}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            {/* Bar for Tasks */}
            <Bar
              yAxisId="tasks"
              dataKey="tasks"
              fill="url(#tasksGradient)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />

            {/* Line for Revenue (only if has data) */}
            {hasRevenueData && (
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
