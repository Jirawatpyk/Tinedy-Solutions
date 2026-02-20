import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useTeamsWithDetails } from '@/hooks/use-teams'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { StatCard } from '@/components/common/StatCard/StatCard'
import { Users, Plus, Search, Crown, UsersRound } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { toast } from 'sonner'
import { AdminOnly } from '@/components/auth/permission-guard'
import { PageHeader } from '@/components/common/PageHeader'
import { TeamCard } from '@/components/teams/team-card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { getLoadErrorMessage, getTeamMemberError } from '@/lib/error-messages'
import { useOptimisticDelete } from '@/hooks/optimistic'
import { TeamFormSheet, type TeamForForm, type TeamMember } from '@/components/teams/TeamFormSheet'
import { AddTeamMemberSheet } from '@/components/teams/AddTeamMemberSheet'

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

  // Initialize optimistic delete hook
  const deleteOps = useOptimisticDelete({
    table: 'teams',
    onSuccess: refresh,
  })

  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [isMemberSheetOpen, setIsMemberSheetOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [availableStaff, setAvailableStaff] = useState<TeamMember[]>([])

  // Remove Member Confirmation Dialog State
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<{ teamId: string; staffId: string } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // Pagination
  const [displayCount, setDisplayCount] = useState(12)
  const ITEMS_PER_LOAD = 12

  // Error handling for teams loading
  useEffect(() => {
    if (teamsError) {
      const errorMessage = getLoadErrorMessage('team')
      toast.error(errorMessage.title, { description: teamsError })
    }
  }, [teamsError])

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
      toast.error('Failed to load available staff')
    }
  }, [])

  useEffect(() => {
    loadAvailableStaff()
  }, [loadAvailableStaff])

  const handleDeleteTeam = async (teamId: string) => {
    deleteOps.permanentDelete.mutate({ id: teamId })
  }

  const archiveTeam = async (teamId: string) => {
    deleteOps.softDelete.mutate({ id: teamId })
  }

  const restoreTeam = async (teamId: string) => {
    deleteOps.restore.mutate({ id: teamId })
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

      toast.success(
        isTeamLead
          ? 'Team lead removed. Please assign a new team lead.'
          : 'Member removed successfully'
      )

      setShowRemoveConfirm(false)
      setPendingRemove(null)
      refresh()
    } catch (error) {
      console.error('Error removing member:', error)
      const errorMessage = getTeamMemberError('remove')
      toast.error(errorMessage.title, { description: errorMessage.description })
    } finally {
      setIsRemoving(false)
    }
  }

  const openEditSheet = (team: Team) => {
    setSelectedTeam(team)
    setIsEditSheetOpen(true)
  }

  const openMemberSheet = (team: Team) => {
    setSelectedTeam(team)
    setIsMemberSheetOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header - Always show */}
        <PageHeader
          title="Teams"
          subtitle="Manage teams and team members"
          actions={
            <Button className="bg-tinedy-blue hover:bg-tinedy-blue/90" disabled>
              <Plus className="h-4 w-4 mr-2" />
              New Team
            </Button>
          }
        />

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
      <PageHeader
        title="Teams"
        subtitle="Manage teams and team members"
        actions={
          <>
            {/* Show archived toggle - Admin only */}
            <AdminOnly>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-archived"
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
                <label
                  htmlFor="show-archived"
                  className="text-sm font-medium cursor-pointer"
                >
                  Show archived
                </label>
              </div>
            </AdminOnly>
            <Button onClick={() => setIsCreateSheetOpen(true)} className="bg-tinedy-blue hover:bg-tinedy-blue/90">
              <Plus className="h-4 w-4 mr-2" />
              New Team
            </Button>
          </>
        }
      />

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
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Users}
              title={searchQuery ? 'No teams found' : 'No teams yet'}
              description={searchQuery ? 'Try a different search term' : 'Create your first team to get started'}
              action={!searchQuery ? {
                label: 'New Team',
                onClick: () => setIsCreateSheetOpen(true),
                icon: Plus
              } : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.slice(0, displayCount).map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onEdit={openEditSheet}
                onDelete={handleDeleteTeam}
                onCancel={archiveTeam}
                onRestore={restoreTeam}
                onAddMember={openMemberSheet}
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

      {/* Create Team Sheet */}
      <TeamFormSheet
        open={isCreateSheetOpen}
        onOpenChange={setIsCreateSheetOpen}
        staffList={availableStaff}
        onSuccess={refresh}
      />

      {/* Edit Team Sheet */}
      <TeamFormSheet
        open={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
        team={selectedTeam as TeamForForm | null}
        staffList={availableStaff}
        onSuccess={refresh}
      />

      {/* Add Member Sheet — use fresh team data from teams array to avoid stale members */}
      {selectedTeam && (() => {
        const freshTeam = teams.find(t => t.id === selectedTeam.id) ?? selectedTeam
        return (
          <AddTeamMemberSheet
            open={isMemberSheetOpen}
            onOpenChange={setIsMemberSheetOpen}
            team={freshTeam as TeamForForm}
            availableStaff={availableStaff.filter(
              (s) => !freshTeam.members?.some((m) => m.id === s.id)
            )}
            onSuccess={refresh}
          />
        )
      })()}

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
