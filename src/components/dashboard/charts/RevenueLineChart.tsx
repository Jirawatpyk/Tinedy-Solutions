import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { memo } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import { useChartAnimation } from '@/hooks/use-chart-animation'

interface RevenueData {
  date: string
  revenue: number
}

interface RevenueLineChartProps {
  data: RevenueData[]
  title?: string
  height?: number
  showGrid?: boolean
  animate?: boolean
}

function RevenueLineChartComponent({
  data,
  title = 'Revenue (Last 7 Days)',
  height = 300,
  showGrid = true,
  animate = true,
}: RevenueLineChartProps) {
  const chart = useChartAnimation(data, {
    initialDelay: 50,
    animationDuration: 1000,
    enabled: animate,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-tinedy-green" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div style={{ minHeight: height }}>
            <EmptyState
              icon={DollarSign}
              title="No revenue data available"
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#e5e7eb' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#e5e7eb' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ color: '#111827', fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#22c55e"
                strokeWidth={2}
                strokeOpacity={chart.isReady ? 1 : 0}
                dot={{
                  fill: '#22c55e',
                  r: 4,
                  strokeWidth: 2,
                  stroke: '#fff',
                  opacity: chart.isReady ? 1 : 0
                }}
                activeDot={{
                  r: 6,
                  strokeWidth: 2,
                  stroke: '#fff',
                  fill: '#22c55e'
                }}
                isAnimationActive={chart.isReady}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// Custom comparison function to prevent re-render if data content is the same
const arePropsEqual = (
  prevProps: RevenueLineChartProps,
  nextProps: RevenueLineChartProps
) => {
  // Check if arrays have same length
  if (prevProps.data.length !== nextProps.data.length) return false

  // Check if all items are equal
  const dataEqual = prevProps.data.every((item, index) => {
    const nextItem = nextProps.data[index]
    return item.date === nextItem.date && item.revenue === nextItem.revenue
  })

  return (
    dataEqual &&
    prevProps.title === nextProps.title &&
    prevProps.height === nextProps.height &&
    prevProps.showGrid === nextProps.showGrid &&
    prevProps.animate === nextProps.animate
  )
}

export const RevenueLineChart = memo(RevenueLineChartComponent, arePropsEqual)
