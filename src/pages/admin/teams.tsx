import { useState, useEffect, useMemo, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useTeamsWithDetails } from '@/hooks/useTeams'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { StatCard } from '@/components/common/StatCard/StatCard'
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
import { Users, Plus, Search, Crown, UsersRound } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AdminOnly } from '@/components/auth/permission-guard'
import { TeamCard } from '@/components/teams/team-card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { mapErrorToUserMessage, getLoadErrorMessage, getDeleteErrorMessage, getArchiveErrorMessage, getRestoreErrorMessage, getTeamMemberError } from '@/lib/error-messages'
import {
  TeamCreateSchema,
  TeamUpdateSchema,
  TeamCreateTransformSchema,
  TeamUpdateTransformSchema,
  AddTeamMemberSchema,
  type TeamCreateFormData,
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
}

interface Team {
  id: string
  name: string
  description: string | null
  created_at: string
  team_lead_id: string | null
  team_lead?: TeamMember | null
  member_count?: number
  members?: TeamMember[]
  average_rating?: number
  deleted_at?: string | null
}

export function AdminTeams() {
  // Archive filter - ต้องประกาศก่อน useTeamsWithDetails
  const [showArchived, setShowArchived] = useState(false)

  const { teams, loading, refresh, error: teamsError } = useTeamsWithDetails({
    showArchived,
    enableRealtime: true,
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [availableStaff, setAvailableStaff] = useState<TeamMember[]>([])

  // Remove Member Confirmation Dialog State
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<{ teamId: string; staffId: string } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // React Hook Form - Create Team (uses base schema, transforms on submit)
  const createTeamForm = useForm<TeamCreateFormData>({
    resolver: zodResolver(TeamCreateSchema),
    defaultValues: {
      name: '',
      description: null,
      team_lead_id: null,
      is_active: true,
    },
  })

  // React Hook Form - Update Team (uses base schema, transforms on submit)
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

  // Pagination
  const [displayCount, setDisplayCount] = useState(12)
  const ITEMS_PER_LOAD = 12

  const { toast } = useToast()

  // Error handling for teams loading
  useEffect(() => {
    if (teamsError) {
      const errorMessage = getLoadErrorMessage('team')
      toast({
        title: errorMessage.title,
        description: teamsError,
        variant: 'destructive',
      })
    }
  }, [teamsError, toast])

  // Filter teams with useMemo for better performance
  const filteredTeams = useMemo(() => {
    let filtered = teams

    if (searchQuery) {
      filtered = filtered.filter((team) =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }, [searchQuery, teams])

  // Reset display count when filter changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_LOAD)
  }, [filteredTeams, ITEMS_PER_LOAD])

  const getTeamStats = () => {
    const totalTeams = teams.length
    const teamsWithLeads = teams.filter(t => t.team_lead_id).length

    // นับ unique members - ไม่นับซ้ำถ้าสมาชิกอยู่หลายทีม
    const uniqueMemberIds = new Set<string>()
    teams.forEach(team => {
      team.members?.forEach(member => {
        uniqueMemberIds.add(member.id)
      })
    })
    const totalMembers = uniqueMemberIds.size

    return { totalTeams, teamsWithLeads, totalMembers }
  }

  const stats = getTeamStats()

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

  const onSubmitCreateTeam = async (data: TeamCreateFormData) => {
    try {
      // Transform form data (empty string → null)
      const transformedData = TeamCreateTransformSchema.parse(data)

      // Create the team
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: transformedData.name,
          description: transformedData.description,
          team_lead_id: transformedData.team_lead_id,
          is_active: transformedData.is_active,
        })
        .select()
        .single()

      if (teamError) throw teamError

      // If a team lead was selected, automatically add them as a member
      if (transformedData.team_lead_id && newTeam) {
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: newTeam.id,
            staff_id: transformedData.team_lead_id,
            joined_at: new Date().toISOString(),
          })

        if (memberError) {
          console.error('Error adding team lead as member:', memberError)
          // Don't throw - team was created successfully, just log the warning
        }
      }

      toast({
        title: 'Success',
        description: transformedData.team_lead_id
          ? 'Team created and team lead added as member'
          : 'Team created successfully',
      })

      setDialogOpen(false)
      createTeamForm.reset()
      refresh()
    } catch (error) {
      console.error('Error creating team:', error)
      const errorMessage = mapErrorToUserMessage(error, 'team')
      toast({
        title: errorMessage.title,
        description: errorMessage.description,
        variant: 'destructive',
      })
    }
  }

  const onSubmitUpdateTeam = async (data: TeamUpdateFormData) => {
    if (!editingTeam) return

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
        .eq('id', editingTeam.id)

      if (error) throw error

      // If a new team lead was selected, check if they're already a member
      if (transformedData.team_lead_id) {
        const isAlreadyMember = editingTeam.members?.some(
          (member) => member.id === transformedData.team_lead_id
        )

        // If not a member yet, add them automatically
        if (!isAlreadyMember) {
          const { error: memberError } = await supabase
            .from('team_members')
            .insert({
              team_id: editingTeam.id,
              staff_id: transformedData.team_lead_id,
              joined_at: new Date().toISOString(),
            })

          if (memberError) {
            console.error('Error adding team lead as member:', memberError)
            // Don't throw - team was updated successfully, just log the warning
          }
        }
      }

      toast({
        title: 'Success',
        description: transformedData.team_lead_id && !editingTeam.members?.some((m) => m.id === transformedData.team_lead_id)
          ? 'Team updated and team lead added as member'
          : 'Team updated successfully',
      })

      setDialogOpen(false)
      setEditingTeam(null)
      updateTeamForm.reset()
      refresh()
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

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Team deleted successfully',
      })

      refresh()
    } catch (error) {
      console.error('Error deleting team:', error)
      const errorMessage = getDeleteErrorMessage('team')
      toast({
        title: errorMessage.title,
        description: errorMessage.description,
        variant: 'destructive',
      })
    }
  }

  const archiveTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .rpc('soft_delete_record', {
          table_name: 'teams',
          record_id: teamId
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Team archived successfully',
      })

      refresh()
    } catch (error) {
      console.error('Error archiving team:', error)
      const errorMessage = getArchiveErrorMessage()
      toast({
        title: errorMessage.title,
        description: errorMessage.description,
        variant: 'destructive',
      })
    }
  }

  const restoreTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ deleted_at: null })
        .eq('id', teamId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Team restored successfully',
      })

      refresh()
    } catch (error) {
      console.error('Error restoring team:', error)
      const errorMessage = getRestoreErrorMessage()
      toast({
        title: errorMessage.title,
        description: errorMessage.description,
        variant: 'destructive',
      })
    }
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
      refresh()
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

      const errorMessage = getTeamMemberError('add')
      toast({
        title: errorMessage.title,
        description: errorMessage.description,
        variant: 'destructive',
      })
    }
  }

  // Open remove member confirmation dialog
  const handleRemoveMember = (teamId: string, staffId: string) => {
    setPendingRemove({ teamId, staffId })
    setShowRemoveConfirm(true)
  }

  // Actually perform the removal (called after confirmation)
  const confirmRemoveMember = async () => {
    if (!pendingRemove) return

    setIsRemoving(true)
    try {
      // Check if member being removed is the team lead
      const team = teams.find(t => t.id === pendingRemove.teamId)
      const isTeamLead = team?.team_lead_id === pendingRemove.staffId

      // Soft delete: Set left_at timestamp instead of deleting
      // This preserves historical revenue data for the staff member
      const { error } = await supabase
        .from('team_members')
        .update({ left_at: new Date().toISOString() })
        .eq('team_id', pendingRemove.teamId)
        .eq('staff_id', pendingRemove.staffId)
        .is('left_at', null)

      if (error) throw error

      // If removing team lead, clear team_lead_id
      if (isTeamLead) {
        const { error: updateError } = await supabase
          .from('teams')
          .update({ team_lead_id: null })
          .eq('id', pendingRemove.teamId)

        if (updateError) throw updateError
      }

      toast({
        title: 'Success',
        description: isTeamLead
          ? 'Team lead removed. Please assign a new team lead.'
          : 'Member removed successfully',
      })

      setShowRemoveConfirm(false)
      setPendingRemove(null)
      refresh()
    } catch (error) {
      console.error('Error removing member:', error)
      const errorMessage = getTeamMemberError('remove')
      toast({
        title: errorMessage.title,
        description: errorMessage.description,
        variant: 'destructive',
      })
    } finally {
      setIsRemoving(false)
    }
  }


  const openCreateDialog = () => {
    setEditingTeam(null)
    createTeamForm.reset({
      name: '',
      description: null,
      team_lead_id: null,
      is_active: true,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (team: Team) => {
    setEditingTeam(team)
    updateTeamForm.reset({
      name: team.name,
      description: team.description,
      team_lead_id: team.team_lead_id,
    })
    setDialogOpen(true)
  }

  const openMemberDialog = (team: Team) => {
    setSelectedTeam(team)
    addMemberForm.reset({
      team_id: team.id,
      staff_id: '',
      role: 'member',
    })
    setMemberDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header - Always show */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted-foreground">Manage teams and team members</p>
          <Button className="bg-tinedy-blue hover:bg-tinedy-blue/90" disabled>
            <Plus className="h-4 w-4 mr-2" />
            New Team
          </Button>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCard
              key={i}
              title=""
              value={0}
              isLoading={true}
            />
          ))}
        </div>

        {/* Search skeleton */}
        <Card>
          <CardContent className="py-3">
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>

        {/* Team cards skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="p-4 sm:p-6 pb-1 sm:pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0" />
                    <div className="space-y-2 flex-1 min-w-0">
                      <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
                      <Skeleton className="h-4 sm:h-5 w-20 sm:w-24 rounded-full" />
                    </div>
                  </div>
                  <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                    <Skeleton className="h-8 w-8 sm:h-10 sm:w-10" />
                    <Skeleton className="h-8 w-8 sm:h-10 sm:w-10" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                <Skeleton className="h-3 sm:h-4 w-full" />
                <Skeleton className="h-16 sm:h-20 w-full rounded-lg" />
                <div className="space-y-1.5 sm:space-y-2 pt-2 sm:pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
                    <Skeleton className="h-7 w-14 sm:h-8 sm:w-16" />
                  </div>
                  <Skeleton className="h-10 sm:h-12 w-full" />
                  <Skeleton className="h-10 sm:h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[40px]">
        <p className="text-sm text-muted-foreground">Manage teams and team members</p>
        <div className="flex items-center gap-4">
          {/* Show archived toggle - Admin only */}
          <AdminOnly>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-archived"
                checked={showArchived}
                onCheckedChange={(checked) => setShowArchived(checked as boolean)}
              />
              <label
                htmlFor="show-archived"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Show archived
              </label>
            </div>
          </AdminOnly>
          <Button onClick={openCreateDialog} className="bg-tinedy-blue hover:bg-tinedy-blue/90">
            <Plus className="h-4 w-4 mr-2" />
            New Team
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Teams"
          value={stats.totalTeams}
          description="Active teams"
          icon={UsersRound}
          iconColor="text-tinedy-blue"
        />

        <StatCard
          title="Teams with Leads"
          value={stats.teamsWithLeads}
          description="Have team leaders"
          icon={Crown}
          iconColor="text-amber-600"
        />

        <StatCard
          title="Total Members"
          value={stats.totalMembers}
          description="Across all teams"
          icon={Users}
          iconColor="text-tinedy-green"
        />
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'No teams found' : 'No teams yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first team to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                New Team
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.slice(0, displayCount).map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onEdit={openEditDialog}
                onDelete={handleDeleteTeam}
                onCancel={archiveTeam}
                onRestore={restoreTeam}
                onAddMember={openMemberDialog}
                onRemoveMember={handleRemoveMember}
              />
            ))}
          </div>

          {/* Load More Button */}
          {displayCount < filteredTeams.length && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Showing {displayCount} of {filteredTeams.length} teams
                </p>
                <Button
                  variant="outline"
                  onClick={() => setDisplayCount(prev => prev + ITEMS_PER_LOAD)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Load More Teams
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create/Edit Team Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) {
          createTeamForm.reset()
          updateTeamForm.reset()
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            <DialogDescription>
              {editingTeam ? 'Update team information' : 'Create a new team for your staff'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editingTeam ?
            updateTeamForm.handleSubmit(onSubmitUpdateTeam) :
            createTeamForm.handleSubmit(onSubmitCreateTeam)
          }>
            <div className="space-y-4 py-4">
              <Controller
                name="name"
                control={(editingTeam ? updateTeamForm.control : createTeamForm.control) as typeof createTeamForm.control}
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
                control={(editingTeam ? updateTeamForm.control : createTeamForm.control) as typeof createTeamForm.control}
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
                control={(editingTeam ? updateTeamForm.control : createTeamForm.control) as typeof createTeamForm.control}
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
                {editingTeam ? 'Update' : 'Create'}
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
              Add a staff member to {selectedTeam?.name}
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
                            !selectedTeam?.members?.some((m) => m.id === staff.id)
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

      {/* Remove Member Confirmation Dialog */}
      <ConfirmDialog
        open={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        title="Remove Team Member"
        description="Are you sure you want to remove this member from the team?"
        variant="warning"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={confirmRemoveMember}
        isLoading={isRemoving}
      />
    </div>
  )
}
