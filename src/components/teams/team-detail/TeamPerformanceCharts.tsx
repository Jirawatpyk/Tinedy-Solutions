import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface MonthlyData {
  month: string
  bookings: number
}

interface TeamPerformanceChartsProps {
  teamId: string
}

export function TeamPerformanceCharts({ teamId }: TeamPerformanceChartsProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)

  const loadMonthlyData = useCallback(async () => {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('booking_date')
        .eq('team_id', teamId)
        .is('deleted_at', null)
        .order('booking_date', { ascending: false })

      if (error) throw error

      // Generate range: start of current month to 6 months from now
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const sixMonthsLater = new Date(now.getFullYear(), now.getMonth() + 6, 0)

      // Count bookings from start of current month to next 6 months with sort key
      const monthDataMap = new Map<string, { month: string; bookings: number; sortKey: string }>()

      bookings?.forEach((booking) => {
        const date = new Date(booking.booking_date)

        // Only count if booking is from start of current month to next 6 months
        if (date >= startOfMonth && date <= sixMonthsLater) {
          const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
          const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

          if (!monthDataMap.has(monthKey)) {
            monthDataMap.set(monthKey, { month: monthKey, bookings: 0, sortKey })
          }
          const current = monthDataMap.get(monthKey)!
          monthDataMap.set(monthKey, { ...current, bookings: current.bookings + 1 })
        }
      })

      // Convert to array and sort by sortKey
      const data = Array.from(monthDataMap.values())
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .map(({ month, bookings }) => ({ month, bookings }))

      setMonthlyData(data)
    } catch (error) {
      console.error('Error loading monthly data:', error)
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    loadMonthlyData()
  }, [loadMonthlyData])

  if (loading) {
    return (
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            Monthly Bookings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex items-center justify-center h-[200px] sm:h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
          <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
          Monthly Bookings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {monthlyData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] sm:h-[300px] text-center">
            <Activity className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-2 sm:mb-3" />
            <p className="text-sm sm:text-base text-muted-foreground">No booking data available</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Data will appear here once bookings are created</p>
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
  )
}
