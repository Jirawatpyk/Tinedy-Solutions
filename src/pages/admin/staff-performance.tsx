import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { XCircle } from 'lucide-react'
import { useStaffPerformance } from '@/hooks/use-staff-performance'
import { StaffPerformanceHeader } from '@/components/staff/performance/StaffPerformanceHeader'
import type { UserRole } from '@/types/common'
import { StaffStatsCards } from '@/components/staff/performance/StaffStatsCards'
import { StaffPerformanceCharts } from '@/components/staff/performance/StaffPerformanceCharts'
import { StaffRecentBookings } from '@/components/staff/performance/StaffRecentBookings'
import { ErrorBoundary, SectionErrorBoundary } from '@/components/ErrorBoundary'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { getDeleteErrorMessage } from '@/lib/error-messages'
import { useEffect, useState } from 'react'
import { StaffEditDialog, type StaffForEdit } from '@/components/staff/StaffEditDialog'

export function AdminStaffPerformance() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  // Both admin and manager use /admin routes
  const basePath = '/admin'

  // Use custom hook for data fetching and stats calculation
  const { staff, stats, monthlyData, loading, error, refresh } = useStaffPerformance(id)

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [staffForEdit, setStaffForEdit] = useState<StaffForEdit | null>(null)

  // Fetch additional counts for delete warning
  const [staffCounts, setStaffCounts] = useState<{ booking_count: number; team_count: number }>({
    booking_count: 0,
    team_count: 0,
  })

  useEffect(() => {
    const fetchCounts = async () => {
      if (!id) return

      // Fetch booking count
      const { count: bookingCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', id)
        .is('deleted_at', null)

      // Fetch team membership count
      const { count: teamCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', id)
        .is('left_at', null)

      setStaffCounts({
        booking_count: bookingCount || 0,
        team_count: teamCount || 0,
      })
    }

    fetchCounts()
  }, [id])

  // Delete staff function
  const deleteStaff = async () => {
    if (!id) return

    try {
      // Call Edge Function to delete user from auth.users (will cascade to profiles)
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: id },
      })

      if (error) throw error
      if (!data?.success) {
        throw new Error(data?.error || data?.details || 'Failed to delete user')
      }

      toast.success(data.message || 'Staff member deleted successfully')

      // Navigate back to staff list
      navigate(`${basePath}/staff`)
    } catch (error) {
      console.error('[Delete Staff] Error:', error)
      const errorMessage = getDeleteErrorMessage('staff')
      toast.error(errorMessage.title, { description: errorMessage.description })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 sm:h-10 sm:w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 sm:h-8 w-48 sm:w-64" />
            <Skeleton className="h-3 sm:h-4 w-36 sm:w-48" />
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
                <Skeleton className="h-3 sm:h-4 w-3 sm:w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 sm:h-7 w-12 sm:w-16 mb-1" />
                <Skeleton className="h-2 sm:h-3 w-16 sm:w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 sm:h-6 w-32 sm:w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] sm:h-[300px] w-full" />
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
          <StaffPerformanceHeader
            staff={{
              ...staff,
              role: staff.role as UserRole,
              booking_count: staffCounts.booking_count,
              team_count: staffCounts.team_count,
            }}
            basePath={basePath}
            onEdit={() => {
              if (staff) {
                setStaffForEdit({
                  id: staff.id,
                  full_name: staff.full_name,
                  phone: staff.phone,
                  role: staff.role as 'admin' | 'manager' | 'staff',
                  staff_number: undefined, // Will be fetched in dialog
                  skills: undefined, // Will be fetched in dialog
                })
                setIsEditDialogOpen(true)
              }
            }}
            onDelete={deleteStaff}
          />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Performance Stats">
          <StaffStatsCards stats={stats} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Performance Charts">
          <StaffPerformanceCharts monthlyData={monthlyData} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Recent Bookings">
          <StaffRecentBookings staffId={id!} />
        </SectionErrorBoundary>
      </div>

      {/* Edit Dialog */}
      <StaffEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        staff={staffForEdit}
        onSuccess={refresh}
      />
    </ErrorBoundary>
  )
}
