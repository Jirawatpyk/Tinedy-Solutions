import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { useOptimisticDelete } from '@/hooks/optimistic'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { TeamDetailHeader } from '@/components/teams/team-detail/TeamDetailHeader'
import { TeamDetailStats } from '@/components/teams/team-detail/TeamDetailStats'
import { TeamMembersList } from '@/components/teams/team-detail/TeamMembersList'
import { TeamRecentBookings } from '@/components/teams/team-detail/TeamRecentBookings'
import { TeamPerformanceCharts } from '@/components/teams/team-detail/TeamPerformanceCharts'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import {
  TeamUpdateSchema,
  TeamUpdateTransformSchema,
  AddTeamMemberSchema,
  type TeamUpdateFormData,
  type AddTeamMemberFormData,
} from '@/schemas'

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
  member_count?: number
  booking_count?: number
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
  const queryClient = useQueryClient()

  // Both admin and manager use /admin routes
  const basePath = '/admin'

  const [team, setTeam] = useState<Team | null>(null)
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
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

  // React Hook Form - Update Team
  const updateTeamForm = useForm<TeamUpdateFormData>({
    resolver: zodResolver(TeamUpdateSchema),
    defaultValues: {
      name: '',
      description: null,
      team_lead_id: null,
    },
  })

  // React Hook Form - Add Member
  const addMemberForm = useForm<AddTeamMemberFormData>({
    resolver: zodResolver(AddTeamMemberSchema),
    defaultValues: {
      team_id: '',
      staff_id: '',
      role: 'member',
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
        toast({
          title: 'Error',
          description: 'Team not found',
          variant: 'destructive',
        })
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
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
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
        .select('id, status, total_price, payment_status')
        .eq('team_id', teamId)

      if (bookingsError) throw bookingsError

      const totalBookings = bookings?.length || 0
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0
      const totalRevenue = bookings?.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + Number(b.total_price), 0) || 0

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
      toast({
        title: 'Error',
        description: 'Failed to load available staff',
        variant: 'destructive',
      })
    }
  }, [toast])

  useEffect(() => {
    loadAvailableStaff()
  }, [loadAvailableStaff])

  const openEditDialog = () => {
    if (!team) return
    updateTeamForm.reset({
      name: team.name,
      description: team.description,
      team_lead_id: team.team_lead_id,
    })
    setDialogOpen(true)
  }

  const openMemberDialog = () => {
    if (!team) return
    addMemberForm.reset({
      team_id: team.id,
      staff_id: '',
      role: 'member',
    })
    setMemberDialogOpen(true)
  }

  const onSubmitUpdateTeam = async (data: TeamUpdateFormData) => {
    if (!team) return

    try {
      // Transform form data (empty string → null)
      const transformedData = TeamUpdateTransformSchema.parse(data)

      const { error } = await supabase
        .from('teams')
        .update({
          name: transformedData.name,
          description: transformedData.description,
          team_lead_id: transformedData.team_lead_id,
        })
        .eq('id', team.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Team updated successfully',
      })

      setDialogOpen(false)
      updateTeamForm.reset()
      loadTeamDetail()
    } catch (error) {
      console.error('Error updating team:', error)
      const errorMessage = mapErrorToUserMessage(error, 'team')
      toast({
        title: errorMessage.title,
        description: errorMessage.description,
        variant: 'destructive',
      })
    }
  }

  // ใช้ useOptimisticDelete เหมือนกับหน้า teams.tsx
  const archiveTeam = () => {
    if (!team) return
    deleteOps.softDelete.mutate({ id: team.id })
  }

  const onSubmitAddMember = async (data: AddTeamMemberFormData) => {
    try {
      // Check if staff is currently an ACTIVE member (to prevent duplicates)
      const { data: activeMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', data.team_id)
        .eq('staff_id', data.staff_id)
        .is('left_at', null)
        .maybeSingle()

      if (activeMember) {
        // Already an active member - don't add again
        toast({
          title: 'Already a Member',
          description: 'This staff member is already in the team.',
          variant: 'destructive',
        })
        return
      }

      // Always create a NEW record for re-join
      // This preserves membership history: each join/leave period is a separate record
      // Old records with left_at will be used for historical revenue calculation
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: data.team_id,
          staff_id: data.staff_id,
          joined_at: new Date().toISOString(),
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Member added successfully',
      })

      setMemberDialogOpen(false)
      addMemberForm.reset()
      loadTeamDetail()
    } catch (error) {
      console.error('Error adding member:', error)

      // Check if this is a unique constraint violation (duplicate active member)
      const errorObj = error as { code?: string; message?: string }
      if (errorObj?.code === '23505' || errorObj?.message?.includes('unique')) {
        toast({
          title: 'Already a Member',
          description: 'This staff member is already in the team.',
          variant: 'destructive',
        })
        return
      }

      const errorMsg = mapErrorToUserMessage(error, 'team')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
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
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(`${basePath}/teams`)}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Teams
      </Button>

      {/* Team Header */}
      <TeamDetailHeader
        team={{
          ...team,
          member_count: team.members?.length || 0,
          booking_count: stats?.totalBookings || 0,
        }}
        onUpdate={loadTeamDetail}
        onEdit={openEditDialog}
        onArchive={archiveTeam}
        basePath={basePath}
      />

      {/* Team Stats */}
      {stats && <TeamDetailStats stats={stats} />}

      {/* Monthly Bookings & Team Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamPerformanceCharts teamId={team.id} />
        <TeamMembersList
          team={team}
          onUpdate={loadTeamDetail}
          onAddMember={openMemberDialog}
        />
      </div>

      {/* Recent Bookings */}
      <TeamRecentBookings teamId={team.id} />

      {/* Edit Team Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) {
          updateTeamForm.reset()
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update team information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={updateTeamForm.handleSubmit(onSubmitUpdateTeam)}>
            <div className="space-y-4 py-4">
              <Controller
                name="name"
                control={updateTeamForm.control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Team Name *</Label>
                    <Input
                      id="teamName"
                      {...field}
                      placeholder="e.g., Sales Team, Support Team"
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              <Controller
                name="description"
                control={updateTeamForm.control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="teamDescription">Description</Label>
                    <Input
                      id="teamDescription"
                      {...field}
                      value={field.value || ''}
                      placeholder="Brief description of the team"
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              <Controller
                name="team_lead_id"
                control={updateTeamForm.control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="teamLead">Team Lead</Label>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team lead (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStaff.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={(open) => {
        setMemberDialogOpen(open)
        if (!open) {
          addMemberForm.reset()
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a staff member to {team?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addMemberForm.handleSubmit(onSubmitAddMember)}>
            <div className="space-y-4 py-4">
              <Controller
                name="staff_id"
                control={addMemberForm.control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="staffSelect">Select Staff Member</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStaff
                          .filter((staff) =>
                            !team?.members?.some((m) => m.id === staff.id)
                          )
                          .map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setMemberDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Add Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
