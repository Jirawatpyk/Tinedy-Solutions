import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { memo } from 'react'
import { useChartAnimation } from '@/hooks/useChartAnimation'

interface BookingStatusData {
  status: string
  count: number
  color: string
}

interface BookingStatusPieChartProps {
  data: BookingStatusData[]
  title?: string
  height?: number
  animate?: boolean
}

function BookingStatusPieChartComponent({
  data,
  title = 'Bookings Status',
  height = 300,
  animate = true,
}: BookingStatusPieChartProps) {
  const chart = useChartAnimation(data, {
    initialDelay: 50,
    animationDuration: 800,
    enabled: animate,
  })

  const totalCount = data.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Calendar className="h-5 w-5 text-tinedy-blue" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
            No bookings data available
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={height}>
              <PieChart>
                <Pie
                  data={data as unknown as Record<string, unknown>[]}
                  cx="50%"
                  cy="50%"
                  labelLine={chart.showLabels}
                  label={
                    chart.showLabels
                      ? ((props) => {
                          const entry = props as unknown as {
                            payload: BookingStatusData
                            percent: number
                            cx: number
                            cy: number
                            midAngle: number
                            outerRadius: number
                          }
                          const RADIAN = Math.PI / 180
                          const radius = entry.outerRadius + 30
                          const x = entry.cx + radius * Math.cos(-entry.midAngle * RADIAN)
                          const y = entry.cy + radius * Math.sin(-entry.midAngle * RADIAN)

                          return (
                            <text
                              x={x}
                              y={y}
                              fill="#374151"
                              textAnchor={x > entry.cx ? 'start' : 'end'}
                              dominantBaseline="central"
                              fontSize="12"
                              fontWeight="600"
                            >
                              {`${entry.payload.status}: ${(entry.percent * 100).toFixed(0)}%`}
                            </text>
                          )
                        })
                      : false
                  }
                  outerRadius={80}
                  innerRadius={55}
                  fill="#8884d8"
                  dataKey="count"
                  paddingAngle={2}
                  nameKey="status"
                  animationBegin={0}
                  animationDuration={chart.isReady ? 800 : 0}
                  animationEasing="ease-out"
                  opacity={chart.isReady ? 1 : 0}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const percent = ((value / totalCount) * 100).toFixed(0)
                    return [`${value} bookings (${percent}%)`, name]
                  }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  labelStyle={{ color: '#111827', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Status Count Summary */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 pt-2 border-t">
              {data.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs sm:text-sm font-medium text-tinedy-dark whitespace-nowrap">
                    {entry.status}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-tinedy-dark">
                    {entry.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Custom comparison function to prevent re-render if data content is the same
const arePropsEqual = (
  prevProps: BookingStatusPieChartProps,
  nextProps: BookingStatusPieChartProps
) => {
  // Check if arrays have same length
  if (prevProps.data.length !== nextProps.data.length) return false

  // Check if all items are equal
  const dataEqual = prevProps.data.every((item, index) => {
    const nextItem = nextProps.data[index]
    return (
      item.status === nextItem.status &&
      item.count === nextItem.count &&
      item.color === nextItem.color
    )
  })

  return (
    dataEqual &&
    prevProps.title === nextProps.title &&
    prevProps.height === nextProps.height &&
    prevProps.animate === nextProps.animate
  )
}

export const BookingStatusPieChart = memo(BookingStatusPieChartComponent, arePropsEqual)
