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
        .order('booking_date', { ascending: false })

      if (error) throw error

      // Group bookings by month
      const monthlyMap = new Map<string, number>()

      bookings?.forEach((booking) => {
        const date = new Date(booking.booking_date)
        const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, 0)
        }

        monthlyMap.set(monthKey, monthlyMap.get(monthKey)! + 1)
      })

      // Convert to array and get last 6 months
      const data = Array.from(monthlyMap.entries())
        .map(([month, bookings]) => ({
          month,
          bookings,
        }))
        .reverse()
        .slice(0, 6)
        .reverse()

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
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Monthly Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Monthly Bookings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {monthlyData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <Activity className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No booking data available</p>
            <p className="text-sm text-muted-foreground mt-1">Data will appear here once bookings are created</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="bookings" fill="#4F46E5" name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
