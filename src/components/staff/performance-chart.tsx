import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { type PerformanceStats } from '@/hooks/use-staff-profile'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { TrendingUp } from 'lucide-react'

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
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-3 min-w-[140px]">
        <p className="font-medium text-gray-900 mb-2 text-sm">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">
                {entry.dataKey === 'Jobs' ? 'Tasks' : 'Revenue'}
              </span>
            </span>
            <span className="font-semibold text-gray-900">
              {entry.dataKey === 'Revenue'
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
    month: format(new Date(item.month + '-01'), 'MMM yy', { locale: enUS }),
    Jobs: item.jobs,
    Revenue: item.revenue,
  }))

  // Calculate totals for summary
  const totalJobs = stats.monthlyData.reduce((sum, item) => sum + item.jobs, 0)
  const totalRevenue = stats.monthlyData.reduce((sum, item) => sum + item.revenue, 0)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Performance Overview
            </CardTitle>
            <CardDescription className="mt-1">
              Tasks and revenue trends over the past 6 months
            </CardDescription>
          </div>
          {/* Summary badges */}
          <div className="flex gap-2">
            <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium">
              {totalJobs} Tasks
            </div>
            <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium">
              ฿{totalRevenue.toLocaleString()}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              {/* Gradient for bars */}
              <linearGradient id="jobsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7} />
              </linearGradient>
              {/* Gradient for line area */}
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
            />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              dy={8}
            />

            {/* Left Y-Axis for Jobs */}
            <YAxis
              yAxisId="jobs"
              orientation="left"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={35}
              label={{
                value: 'Tasks',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#3b82f6', fontSize: 11, fontWeight: 500 },
              }}
            />

            {/* Right Y-Axis for Revenue */}
            <YAxis
              yAxisId="revenue"
              orientation="right"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={(value) => {
                if (value >= 1000) {
                  return `฿${(value / 1000).toFixed(0)}k`
                }
                return `฿${value}`
              }}
              label={{
                value: 'Revenue',
                angle: 90,
                position: 'insideRight',
                style: { textAnchor: 'middle', fill: '#22c55e', fontSize: 11, fontWeight: 500 },
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              formatter={(value) => (
                <span className="text-sm text-gray-600">
                  {value === 'Jobs' ? 'Tasks' : 'Revenue'}
                </span>
              )}
            />

            {/* Bar for Jobs */}
            <Bar
              yAxisId="jobs"
              dataKey="Jobs"
              fill="url(#jobsGradient)"
              radius={[6, 6, 0, 0]}
              barSize={32}
            />

            {/* Line for Revenue */}
            <Line
              yAxisId="revenue"
              type="monotone"
              dataKey="Revenue"
              stroke="#22c55e"
              strokeWidth={3}
              dot={{ fill: '#22c55e', strokeWidth: 2, stroke: '#fff', r: 5 }}
              activeDot={{ r: 7, stroke: '#22c55e', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
