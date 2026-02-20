import { useEffect, useState, useCallback } from 'react'
import { BookingStatus } from '@/types/booking'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { useOptimisticDelete } from '@/hooks/optimistic'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Edit, ArrowLeft } from 'lucide-react'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { PageHeader } from '@/components/common/PageHeader'
import { toast } from 'sonner'
import { TeamDetailHeader } from '@/components/teams/team-detail/TeamDetailHeader'
import { TeamDetailStats } from '@/components/teams/team-detail/TeamDetailStats'
import { TeamMembersList } from '@/components/teams/team-detail/TeamMembersList'
import { TeamRecentBookings } from '@/components/teams/team-detail/TeamRecentBookings'
import { TeamPerformanceCharts } from '@/components/teams/team-detail/TeamPerformanceCharts'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { TeamFormSheet, type TeamMember, type TeamForForm } from '@/components/teams/TeamFormSheet'
import { AddTeamMemberSheet } from '@/components/teams/AddTeamMemberSheet'

interface Team {
  id: string
  name: string
  description: string | null
  created_at: string
  team_lead_id: string | null
  team_lead?: TeamMember | null
  members?: TeamMember[]
  member_count?: number
  booking_count?: number
}

interface TeamStats {
  totalBookings: number
  completedBookings: number
  averageRating: number
  reviewCount: number
  totalRevenue: number
}

export function AdminTeamDetail() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Both admin and manager use /admin routes
  const basePath = '/admin'

  const [team, setTeam] = useState<Team | null>(null)
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [isMemberSheetOpen, setIsMemberSheetOpen] = useState(false)
  const [availableStaff, setAvailableStaff] = useState<TeamMember[]>([])

  // Initialize optimistic delete hook - เหมือนกับหน้า teams.tsx
  const deleteOps = useOptimisticDelete({
    table: 'teams',
    onSuccess: () => {
      // ลบ cache และ navigate กลับไปหน้า list
      queryClient.removeQueries({ queryKey: queryKeys.teams.all })
      navigate(`${basePath}/teams`)
    },
  })

  const loadTeamDetail = useCallback(async () => {
    if (!teamId) return

    try {
      // Fetch team with members and team lead
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          description,
          created_at,
          team_lead_id,
          team_lead:profiles!teams_team_lead_id_fkey (
            id,
            full_name,
            email,
            phone,
            avatar_url,
            role
          ),
          team_members (
            id,
            is_active,
            left_at,
            profiles (
              id,
              full_name,
              email,
              phone,
              avatar_url,
              role
            )
          )
        `)
        .eq('id', teamId)
        .single()

      if (teamError) throw teamError
      if (!teamData) {
        toast.error('Team not found')
        navigate(`${basePath}/teams`)
        return
      }

      // Format team data
      const teamLead = Array.isArray(teamData.team_lead)
        ? teamData.team_lead[0]
        : teamData.team_lead

      const formattedTeam: Team = {
        id: teamData.id,
        name: teamData.name,
        description: teamData.description,
        created_at: teamData.created_at,
        team_lead_id: teamData.team_lead_id,
        team_lead: teamLead,
        // Filter out members who have left (soft deleted) - only show active members
        members: teamData.team_members
          ?.filter((tm: { left_at: string | null }) => tm.left_at === null)
          .map((tm: { profiles: unknown; is_active: boolean; id: string }) => {
            const profile = Array.isArray(tm.profiles) ? tm.profiles[0] : tm.profiles
            return {
              ...profile,
              is_active: tm.is_active,
              membership_id: tm.id,
            }
          }).filter(Boolean) || [],
      }

      setTeam(formattedTeam)

      // Fetch team stats
      await loadTeamStats(teamId)
    } catch (error) {
      console.error('Error loading team:', error)
      const errorMsg = mapErrorToUserMessage(error, 'team')
      toast.error(errorMsg.title, { description: errorMsg.description })
    } finally {
      setLoading(false)
    }

  }, [teamId, navigate])

  const loadTeamStats = async (teamId: string) => {
    try {
      // Fetch bookings stats
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, total_price, payment_status')
        .eq('team_id', teamId)

      if (bookingsError) throw bookingsError

      const totalBookings = bookings?.length || 0
      const completedBookings = bookings?.filter(b => b.status === BookingStatus.Completed).length || 0
      const totalRevenue = bookings?.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + Number(b.total_price), 0) || 0

      // Fetch ratings
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating, bookings!inner(team_id)')
        .eq('bookings.team_id', teamId)

      if (reviewsError) throw reviewsError

      const ratings = reviews?.map(r => r.rating) || []
      const reviewCount = ratings.length
      const averageRating = reviewCount > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / reviewCount
        : 0

      setStats({
        totalBookings,
        completedBookings,
        averageRating,
        reviewCount,
        totalRevenue,
      })
    } catch (error) {
      console.error('Error loading team stats:', error)
    }
  }

  useEffect(() => {
    loadTeamDetail()
  }, [loadTeamDetail])

  const loadAvailableStaff = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url, role')
        .eq('role', 'staff')
        .order('full_name')

      if (error) throw error
      setAvailableStaff(data || [])
    } catch (error) {
      console.error('Error loading staff:', error)
      toast.error('Failed to load available staff')
    }
  }, [])

  useEffect(() => {
    loadAvailableStaff()
  }, [loadAvailableStaff])

  // ใช้ useOptimisticDelete เหมือนกับหน้า teams.tsx
  const archiveTeam = () => {
    if (!team) return
    deleteOps.softDelete.mutate({ id: team.id })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Back button skeleton */}
        <Skeleton className="h-9 sm:h-10 w-20 sm:w-24" />

        {/* Header skeleton */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-0">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-7 sm:h-9 w-48 sm:w-64" />
                <Skeleton className="h-3 sm:h-4 w-64 sm:w-96" />
              </div>
              <div className="flex gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                <Skeleton className="h-8 sm:h-9 w-16 sm:w-20" />
                <Skeleton className="h-8 sm:h-9 w-16 sm:w-20" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
                <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-7 sm:h-8 w-10 sm:w-12" />
                <Skeleton className="h-2.5 sm:h-3 w-24 sm:w-28" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <Skeleton className="h-5 sm:h-6 w-40 sm:w-48" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <Skeleton className="h-48 sm:h-64" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <Skeleton className="h-5 sm:h-6 w-32 sm:w-48" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <Skeleton className="h-48 sm:h-64" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-muted-foreground mb-4">Team not found</p>
        <Button onClick={() => navigate(`${basePath}/teams`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Back, Edit and Delete Buttons */}
      <PageHeader
        title={team.name}
        backHref={`${basePath}/teams`}
        actions={
          <>
            {/* Edit: icon on mobile with tooltip, full on desktop */}
            <SimpleTooltip content="Edit">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsEditSheetOpen(true)}
                className="h-8 w-8 sm:hidden"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </SimpleTooltip>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditSheetOpen(true)}
              className="hidden sm:flex h-9"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>

            {/* Delete: responsive mode */}
            <PermissionAwareDeleteButton
              resource="teams"
              itemName={team.name}
              onDelete={async () => {
                // Hard delete
                const { error } = await supabase
                  .from('teams')
                  .delete()
                  .eq('id', team.id)

                if (error) throw error

                toast.success('Team deleted successfully')

                navigate(`${basePath}/teams`)
              }}
              onCancel={archiveTeam}
              cancelText="Archive"
              buttonVariant="outline"
              responsive
              warningMessage={
                (team.members?.length || 0) > 0 || (stats?.totalBookings || 0) > 0
                  ? `This team has ${team.members?.length || 0} member(s)${(stats?.totalBookings || 0) > 0 ? ` and ${stats?.totalBookings} booking(s)` : ''} that will be affected.`
                  : undefined
              }
            />
          </>
        }
      />

      {/* Team Header */}
      <TeamDetailHeader
        team={{
          ...team,
          member_count: team.members?.length || 0,
          booking_count: stats?.totalBookings || 0,
        }}
      />

      {/* Team Stats */}
      {stats && <TeamDetailStats stats={stats} />}

      {/* Monthly Bookings & Team Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamPerformanceCharts teamId={team.id} />
        <TeamMembersList
          team={team}
          onUpdate={loadTeamDetail}
          onAddMember={() => setIsMemberSheetOpen(true)}
        />
      </div>

      {/* Recent Bookings */}
      <TeamRecentBookings teamId={team.id} />

      {/* Edit Team Sheet */}
      <TeamFormSheet
        open={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
        team={team as TeamForForm}
        staffList={availableStaff}
        onSuccess={loadTeamDetail}
      />

      {/* Add Member Sheet */}
      <AddTeamMemberSheet
        open={isMemberSheetOpen}
        onOpenChange={setIsMemberSheetOpen}
        team={team as TeamForForm}
        availableStaff={availableStaff.filter(
          (s) => !team.members?.some((m) => m.id === s.id)
        )}
        onSuccess={loadTeamDetail}
      />
    </div>
  )
}
