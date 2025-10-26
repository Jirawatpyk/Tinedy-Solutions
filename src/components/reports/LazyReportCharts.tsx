/**
 * Lazy-loaded Report Chart Components
 *
 * Wraps report tab components that use charts with lazy loading and Suspense.
 * This improves the initial load time of the reports page.
 */

import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load report tab components
const RevenueBookingsTabLazy = lazy(() => import('./tabs/RevenueBookingsTab').then(m => ({ default: m.RevenueBookingsTab })))
const CustomersTabLazy = lazy(() => import('./tabs/CustomersTab').then(m => ({ default: m.CustomersTab })))
const StaffTabLazy = lazy(() => import('./tabs/StaffTab').then(m => ({ default: m.StaffTab })))
const TeamsTabLazy = lazy(() => import('./tabs/TeamsTab').then(m => ({ default: m.TeamsTab })))

// Loading skeleton for report tabs
const ReportTabSkeleton = () => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
    <Skeleton className="h-[400px] w-full" />
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-[300px]" />
      <Skeleton className="h-[300px]" />
    </div>
  </div>
)

// Wrapper component with Suspense
interface LazyTabProps {
  children: React.ReactNode
}

function LazyTabWrapper({ children }: LazyTabProps) {
  return (
    <Suspense fallback={<ReportTabSkeleton />}>
      {children}
    </Suspense>
  )
}

// Export lazy-loaded report tabs
export function LazyRevenueBookingsTab(props: React.ComponentProps<typeof RevenueBookingsTabLazy>) {
  return (
    <LazyTabWrapper>
      <RevenueBookingsTabLazy {...props} />
    </LazyTabWrapper>
  )
}

export function LazyCustomersTab(props: React.ComponentProps<typeof CustomersTabLazy>) {
  return (
    <LazyTabWrapper>
      <CustomersTabLazy {...props} />
    </LazyTabWrapper>
  )
}

export function LazyStaffTab(props: React.ComponentProps<typeof StaffTabLazy>) {
  return (
    <LazyTabWrapper>
      <StaffTabLazy {...props} />
    </LazyTabWrapper>
  )
}

export function LazyTeamsTab(props: React.ComponentProps<typeof TeamsTabLazy>) {
  return (
    <LazyTabWrapper>
      <TeamsTabLazy {...props} />
    </LazyTabWrapper>
  )
}

export { ReportTabSkeleton }
