import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Target, Package, DollarSign, Award } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { MiniStats } from '@/types/dashboard'

interface QuickInsightsProps {
  miniStats: MiniStats
  loading: boolean
}

/**
 * QuickInsights Component
 *
 * แสดง mini statistics (Most Popular Service, Avg Booking Value, Completion Rate)
 * ใช้ React.memo เพื่อป้องกัน unnecessary re-renders
 *
 * @performance Memoized - re-render เฉพาะเมื่อ miniStats หรือ loading เปลี่ยน
 */
const QuickInsightsComponent = ({ miniStats, loading }: QuickInsightsProps) => {
  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-tinedy-blue/5 to-transparent">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-tinedy-dark">
            <Target className="h-5 w-5 text-tinedy-blue" />
            Quick Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg border">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-tinedy-blue/5 to-transparent">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-tinedy-dark">
          <Target className="h-5 w-5 text-tinedy-blue" />
          Quick Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Most Popular Service */}
          <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Most Popular Service
              </p>
              <p className="text-lg font-bold text-tinedy-dark">
                {miniStats.topService ? miniStats.topService.name : 'N/A'}
              </p>
              {miniStats.topService && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {miniStats.topService.count} bookings
                </p>
              )}
            </div>
          </div>

          {/* Average Booking Value */}
          <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Average Booking Value
              </p>
              <p className="text-lg font-bold text-tinedy-dark">
                {formatCurrency(miniStats.avgBookingValue)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Per booking</p>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
              <Award className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
              <p className="text-lg font-bold text-tinedy-dark">
                {miniStats.completionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Success rate</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Memoized QuickInsights
 *
 * Custom comparison function เพื่อ optimize re-renders
 * Re-render เฉพาะเมื่อ:
 * - loading เปลี่ยน
 * - miniStats object เปลี่ยน (topService, avgBookingValue, completionRate)
 */
export const QuickInsights = memo(
  QuickInsightsComponent,
  (prevProps, nextProps) => {
    // Compare loading state first
    if (prevProps.loading !== nextProps.loading) return false

    // If loading, skip further comparison
    if (nextProps.loading) return true

    // Compare miniStats object fields
    const statsEqual =
      prevProps.miniStats.avgBookingValue === nextProps.miniStats.avgBookingValue &&
      prevProps.miniStats.completionRate === nextProps.miniStats.completionRate &&
      prevProps.miniStats.topService?.name === nextProps.miniStats.topService?.name &&
      prevProps.miniStats.topService?.count === nextProps.miniStats.topService?.count

    // Return true to skip re-render, false to re-render
    return statsEqual
  }
)
