import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { XCircle } from 'lucide-react'
import { useStaffPerformance } from '@/hooks/use-staff-performance'
import { StaffPerformanceHeader } from '@/components/staff/performance/StaffPerformanceHeader'
import { StaffStatsCards } from '@/components/staff/performance/StaffStatsCards'
import { StaffPerformanceCharts } from '@/components/staff/performance/StaffPerformanceCharts'
import { StaffRecentBookings } from '@/components/staff/performance/StaffRecentBookings'
import { ErrorBoundary, SectionErrorBoundary } from '@/components/ErrorBoundary'

export function AdminStaffPerformance() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Determine base path (admin or manager)
  const basePath = location.pathname.startsWith('/manager') ? '/manager' : '/admin'

  // Use custom hook for data fetching and stats calculation
  const { staff, bookings, stats, monthlyData, loading, error } = useStaffPerformance(id)

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !staff) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <XCircle className="h-16 w-16 text-red-500" />
        <h2 className="text-2xl font-bold">{error || 'Staff Not Found'}</h2>
        <p className="text-muted-foreground">Unable to load staff member details</p>
        <Button onClick={() => navigate(`${basePath}/staff`)}>Back to Staff List</Button>
      </div>
    )
  }

  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <div className="space-y-6">
        <SectionErrorBoundary sectionName="Staff Header">
          <StaffPerformanceHeader staff={staff} basePath={basePath} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Performance Stats">
          <StaffStatsCards stats={stats} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Performance Charts">
          <StaffPerformanceCharts monthlyData={monthlyData} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Recent Bookings">
          <StaffRecentBookings bookings={bookings} />
        </SectionErrorBoundary>
      </div>
    </ErrorBoundary>
  )
}
