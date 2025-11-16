import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { memo, useState, useEffect } from 'react'

interface BookingStatus {
  status: string
  count: number
  color: string
}

interface BookingStatusChartProps {
  data: BookingStatus[]
}

function BookingStatusChartComponent({ data }: BookingStatusChartProps) {
  const [showLabels, setShowLabels] = useState(false)

  useEffect(() => {
    // Hide labels when data changes
    setShowLabels(false)
    // Show labels slightly before animation completes (600ms out of 800ms)
    const timer = setTimeout(() => {
      setShowLabels(true)
    }, 600)
    return () => clearTimeout(timer)
  }, [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Calendar className="h-5 w-5 text-tinedy-blue" />
          Bookings Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No bookings yet
          </p>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data as unknown as Record<string, unknown>[]}
                  cx="50%"
                  cy="50%"
                  labelLine={showLabels}
                  label={
                    showLabels
                      ? ((props) => {
                          const entry = props as unknown as { payload: BookingStatus; percent: number }
                          return `${entry.payload.status}: ${(entry.percent * 100).toFixed(0)}%`
                        })
                      : false
                  }
                  outerRadius={90}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="count"
                  paddingAngle={2}
                  nameKey="status"
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const total = data.reduce((sum, item) => sum + item.count, 0)
                    const percent = ((value / total) * 100).toFixed(0)
                    return [`${value} bookings (${percent}%)`, name]
                  }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Status Count Summary */}
            <div className="flex flex-wrap justify-center gap-4 pt-2 border-t">
              {data.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm font-medium text-tinedy-dark">
                    {entry.status}
                  </span>
                  <span className="text-sm font-bold text-tinedy-dark">
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

export const BookingStatusChart = memo(BookingStatusChartComponent)
