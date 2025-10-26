/**
 * Lazy-loaded Chart Components
 *
 * This file provides lazy-loaded wrappers for all chart components to improve initial bundle size.
 * The recharts library (~343KB) will only be loaded when charts are actually needed.
 */

import { lazy, Suspense, type ComponentType } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load all chart components
const RevenueChartLazy = lazy(() => import('../dashboard/RevenueChart').then(m => ({ default: m.RevenueChart })))
const BookingStatusChartLazy = lazy(() => import('../dashboard/BookingStatusChart').then(m => ({ default: m.BookingStatusChart })))
const PerformanceChartLazy = lazy(() => import('../staff/performance-chart').then(m => ({ default: m.PerformanceChart })))
const TeamPerformanceChartsLazy = lazy(() => import('../teams/team-detail/TeamPerformanceCharts').then(m => ({ default: m.TeamPerformanceCharts })))

// Chart loading fallback
const ChartSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-[300px] w-full" />
    <div className="flex gap-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-24" />
    </div>
  </div>
)

// Higher-order component to wrap charts with Suspense
function withChartSuspense<P extends object>(
  Component: ComponentType<P>,
  fallback: React.ReactNode = <ChartSkeleton />
) {
  return function ChartWithSuspense(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    )
  }
}

// Export lazy-loaded chart components
export const RevenueChart = withChartSuspense(RevenueChartLazy)
export const BookingStatusChart = withChartSuspense(BookingStatusChartLazy)
export const PerformanceChart = withChartSuspense(PerformanceChartLazy)
export const TeamPerformanceCharts = withChartSuspense(TeamPerformanceChartsLazy)

// Export ChartSkeleton for custom loading states
export { ChartSkeleton }
