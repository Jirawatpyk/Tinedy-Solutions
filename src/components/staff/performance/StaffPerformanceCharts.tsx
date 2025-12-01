import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, TrendingUp } from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface MonthlyPerformanceData {
  month: string
  bookings: number
  revenue: number
  completionRate: number
}

interface StaffPerformanceChartsProps {
  monthlyData: MonthlyPerformanceData[]
}

export const StaffPerformanceCharts = memo(function StaffPerformanceCharts({
  monthlyData,
}: StaffPerformanceChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Monthly Bookings Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            Monthly Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] sm:h-[300px] text-center">
              <Activity className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm sm:text-base text-muted-foreground">No booking data available</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Data will appear here once bookings are created
              </p>
            </div>
          ) : (
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bookings" fill="#4F46E5" name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] sm:h-[300px] text-center">
              <TrendingUp className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm sm:text-base text-muted-foreground">No revenue data available</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Revenue trends will appear here once payments are received
              </p>
            </div>
          ) : (
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) =>
                      `฿${value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Revenue (฿)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
})
