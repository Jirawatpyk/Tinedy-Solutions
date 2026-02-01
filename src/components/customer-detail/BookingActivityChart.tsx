import { memo, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface ChartDataPoint {
  month: string
  monthKey: string
  completed: number
  cancelled: number
  pending: number
  total: number
}

interface BookingForChart {
  booking_date: string
  status: string
}

interface BookingActivityChartProps {
  bookings: BookingForChart[]
}

const BookingActivityChart = memo(function BookingActivityChart({
  bookings,
}: BookingActivityChartProps) {
  const chartData = useMemo(() => {
    const monthsMap = new Map<string, ChartDataPoint>()
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const currentMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    )

    bookings.forEach((booking) => {
      const bookingDate = new Date(booking.booking_date)
      if (bookingDate >= sixMonthsAgo && bookingDate <= currentMonthEnd) {
        const monthKey = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`
        const monthName = bookingDate.toLocaleDateString('en-US', {
          month: 'short',
        })

        if (!monthsMap.has(monthKey)) {
          monthsMap.set(monthKey, {
            month: monthName,
            monthKey,
            completed: 0,
            cancelled: 0,
            pending: 0,
            total: 0,
          })
        }

        const monthData = monthsMap.get(monthKey)!
        monthData.total++
        if (booking.status === 'completed') monthData.completed++
        else if (booking.status === 'cancelled') monthData.cancelled++
        else if (booking.status === 'pending') monthData.pending++
      }
    })

    return Array.from(monthsMap.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
    )
  }, [bookings])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-tinedy-blue" />
          Booking Activity (Last 6 Months)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              stroke="#888888"
            />
            <YAxis tick={{ fontSize: 12 }} stroke="#888888" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Bar
              dataKey="completed"
              fill="#10b981"
              name="Completed"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="pending"
              fill="#f59e0b"
              name="Pending"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="cancelled"
              fill="#ef4444"
              name="Cancelled"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})

export default BookingActivityChart
