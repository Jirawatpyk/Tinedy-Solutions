import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
import { TeamCard } from '@/components/teams/team-card'

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
  team_lead?: TeamMember
  member_count?: number
  members?: TeamMember[]
}

export function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [teamLeadId, setTeamLeadId] = useState<string>('')

  const [availableStaff, setAvailableStaff] = useState<TeamMember[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState('')

  const { toast } = useToast()

  useEffect(() => {
    loadTeams()
    loadAvailableStaff()
  }, [])

  useEffect(() => {
    filterTeams()
  }, [searchQuery, teams])

  const filterTeams = () => {
    let filtered = teams

    if (searchQuery) {
      filtered = filtered.filter((team) =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredTeams(filtered)
  }

  const getTeamStats = () => {
    const totalTeams = teams.length
    const teamsWithLeads = teams.filter(t => t.team_lead_id).length
    const totalMembers = teams.reduce((sum, team) => sum + (team.member_count || 0), 0)
    return { totalTeams, teamsWithLeads, totalMembers }
  }

  const stats = getTeamStats()

  async function loadTeams() {
    try {
      setLoading(true)

      // Fetch teams with member count and team lead
      const { data: teamsData, error: teamsError } = await supabase
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
        .order('created_at', { ascending: false })

      if (teamsError) throw teamsError

      const formattedTeams = (teamsData || []).map((team: any) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        created_at: team.created_at,
        team_lead_id: team.team_lead_id,
        team_lead: team.team_lead,
        member_count: team.team_members?.length || 0,
        members: team.team_members?.map((tm: any) => ({
          ...tm.profiles,
          is_active: tm.is_active,
          membership_id: tm.id,
        })).filter(Boolean) || [],
      }))

      setTeams(formattedTeams)
    } catch (error: any) {
      console.error('Error loading teams:', error)
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadAvailableStaff() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url, role')
        .eq('role', 'staff')
        .order('full_name')

      if (error) throw error
      setAvailableStaff(data || [])
    } catch (error: any) {
      console.error('Error loading staff:', error)
    }
  }

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a team name',
        variant: 'destructive',
      })
      return
    }

    try {
      const { error } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          description: teamDescription || null,
          team_lead_id: teamLeadId || null,
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Team created successfully',
      })

      setDialogOpen(false)
      setTeamName('')
      setTeamDescription('')
      setTeamLeadId('')
      loadTeams()
    } catch (error: any) {
      console.error('Error creating team:', error)
      toast({
        title: 'Error',
        description: 'Failed to create team',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateTeam = async () => {
    if (!editingTeam || !teamName.trim()) return

    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: teamName,
          description: teamDescription || null,
          team_lead_id: teamLeadId || null,
        })
        .eq('id', editingTeam.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Team updated successfully',
      })

      setDialogOpen(false)
      setEditingTeam(null)
      setTeamName('')
      setTeamDescription('')
      setTeamLeadId('')
      loadTeams()
    } catch (error: any) {
      console.error('Error updating team:', error)
      toast({
        title: 'Error',
        description: 'Failed to update team',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return

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

      loadTeams()
    } catch (error: any) {
      console.error('Error deleting team:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive',
      })
    }
  }

  const handleAddMember = async () => {
    if (!selectedTeam || !selectedStaffId) return

    try {
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: selectedTeam.id,
          staff_id: selectedStaffId,
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Member added successfully',
      })

      setMemberDialogOpen(false)
      setSelectedStaffId('')
      loadTeams()
    } catch (error: any) {
      console.error('Error adding member:', error)
      toast({
        title: 'Error',
        description: 'Failed to add member',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveMember = async (teamId: string, staffId: string) => {
    if (!confirm('Remove this member from the team?')) return

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('staff_id', staffId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Member removed successfully',
      })

      loadTeams()
    } catch (error: any) {
      console.error('Error removing member:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      })
    }
  }

  const handleToggleMemberStatus = async (membershipId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ is_active: !currentStatus })
        .eq('id', membershipId)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Member ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      })

      loadTeams()
    } catch (error: any) {
      console.error('Error toggling member status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update member status',
        variant: 'destructive',
      })
    }
  }

  const openCreateDialog = () => {
    setEditingTeam(null)
    setTeamName('')
    setTeamDescription('')
    setTeamLeadId('')
    setDialogOpen(true)
  }

  const openEditDialog = (team: Team) => {
    setEditingTeam(team)
    setTeamName(team.name)
    setTeamDescription(team.description || '')
    setTeamLeadId(team.team_lead_id || '')
    setDialogOpen(true)
  }

  const openMemberDialog = (team: Team) => {
    setSelectedTeam(team)
    setSelectedStaffId('')
    setMemberDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-tinedy-dark">Teams</h1>
          <p className="text-muted-foreground mt-1">Manage teams and team members</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-tinedy-blue hover:bg-tinedy-blue/90">
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <UsersRound className="h-4 w-4 text-tinedy-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.totalTeams}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active teams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams with Leads</CardTitle>
            <Crown className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.teamsWithLeads}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Have team leaders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-tinedy-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.totalMembers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all teams
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
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
                Create Team
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onEdit={openEditDialog}
              onDelete={handleDeleteTeam}
              onAddMember={openMemberDialog}
              onRemoveMember={handleRemoveMember}
              onToggleMemberStatus={handleToggleMemberStatus}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Team Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            <DialogDescription>
              {editingTeam ? 'Update team information' : 'Create a new team for your staff'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name *</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g., Sales Team, Support Team"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamDescription">Description</Label>
              <Input
                id="teamDescription"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                placeholder="Brief description of the team"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamLead">Team Lead</Label>
              <Select value={teamLeadId || undefined} onValueChange={setTeamLeadId}>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}>
              {editingTeam ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a staff member to {selectedTeam?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staffSelect">Select Staff Member</Label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedStaffId}>
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
