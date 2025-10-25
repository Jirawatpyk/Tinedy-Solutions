import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { TeamDetailHeader } from '@/components/teams/team-detail/TeamDetailHeader'
import { TeamDetailStats } from '@/components/teams/team-detail/TeamDetailStats'
import { TeamMembersList } from '@/components/teams/team-detail/TeamMembersList'
import { TeamRecentBookings } from '@/components/teams/team-detail/TeamRecentBookings'
import { TeamPerformanceCharts } from '@/components/teams/team-detail/TeamPerformanceCharts'
import { getErrorMessage } from '@/lib/error-utils'

interface TeamMember {
  id: string
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  role: string
  is_active?: boolean
  membership_id?: string
}

interface Team {
  id: string
  name: string
  description: string | null
  created_at: string
  team_lead_id: string | null
  team_lead?: TeamMember | null
  members?: TeamMember[]
}

interface TeamStats {
  totalBookings: number
  completedBookings: number
  averageRating: number
  totalRevenue: number
}

export function AdminTeamDetail() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [team, setTeam] = useState<Team | null>(null)
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [loading, setLoading] = useState(true)

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
        toast({
          title: 'Error',
          description: 'Team not found',
          variant: 'destructive',
        })
        navigate('/admin/teams')
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
        members: teamData.team_members?.map((tm: { profiles: unknown; is_active: boolean; id: string }) => {
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
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [teamId, navigate, toast])

  const loadTeamStats = async (teamId: string) => {
    try {
      // Fetch bookings stats
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, total_price')
        .eq('team_id', teamId)

      if (bookingsError) throw bookingsError

      const totalBookings = bookings?.length || 0
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0
      const totalRevenue = bookings?.reduce((sum, b) => sum + Number(b.total_price), 0) || 0

      // Fetch ratings
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating, bookings!inner(team_id)')
        .eq('bookings.team_id', teamId)

      if (reviewsError) throw reviewsError

      const ratings = reviews?.map(r => r.rating) || []
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0

      setStats({
        totalBookings,
        completedBookings,
        averageRating,
        totalRevenue,
      })
    } catch (error) {
      console.error('Error loading team stats:', error)
    }
  }

  useEffect(() => {
    loadTeamDetail()
  }, [loadTeamDetail])

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Back button skeleton */}
        <Skeleton className="h-10 w-24" />

        {/* Header skeleton */}
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-muted-foreground mb-4">Team not found</p>
        <Button onClick={() => navigate('/admin/teams')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/teams')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Teams
      </Button>

      {/* Team Header */}
      <TeamDetailHeader
        team={team}
        onUpdate={loadTeamDetail}
      />

      {/* Team Stats */}
      {stats && <TeamDetailStats stats={stats} />}

      {/* Monthly Bookings & Team Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamPerformanceCharts teamId={team.id} />
        <TeamMembersList
          team={team}
          onUpdate={loadTeamDetail}
        />
      </div>

      {/* Recent Bookings */}
      <TeamRecentBookings teamId={team.id} />
    </div>
  )
}
