import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Edit, UserPlus, Users, Crown, Star, ArrowRight, RotateCcw } from 'lucide-react'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { DeleteButton } from '@/components/common/DeleteButton'

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
  member_count?: number
  members?: TeamMember[]
  average_rating?: number
  deleted_at?: string | null
}

interface TeamCardProps {
  team: Team
  onEdit: (team: Team) => void
  onDelete: (teamId: string) => void
  onCancel?: (teamId: string) => void
  onRestore?: (teamId: string) => void
  onAddMember: (team: Team) => void
  onRemoveMember: (teamId: string, staffId: string) => void
  onToggleMemberStatus: (membershipId: string, currentStatus: boolean) => void
}

// Helper function moved outside component
const getInitials = (name: string) => {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export const TeamCard = memo(function TeamCard({ team, onEdit, onDelete, onCancel, onRestore, onAddMember, onRemoveMember, onToggleMemberStatus }: TeamCardProps) {
  const navigate = useNavigate()
  const isArchived = !!team.deleted_at

  // Both admin and manager use /admin routes
  const basePath = '/admin'

  // Memoize expensive calculations
  const teamInitial = useMemo(() => team.name.charAt(0).toUpperCase(), [team.name])

  const displayedMembers = useMemo(() => {
    if (!team.members) return []

    // Sort members: Team Lead first, then active members, then inactive members
    const sorted = [...team.members].sort((a, b) => {
      // Team Lead always first (don't check active status for lead)
      if (a.id === team.team_lead_id) return -1
      if (b.id === team.team_lead_id) return 1

      // For non-lead members, sort by active status (active before inactive)
      const aActive = a.is_active !== false
      const bActive = b.is_active !== false

      if (aActive && !bActive) return -1
      if (!aActive && bActive) return 1

      return 0
    })

    return sorted.slice(0, 3)
  }, [team.members, team.team_lead_id])

  const remainingMembersCount = useMemo(
    () => team.members && team.members.length > 3 ? team.members.length - 3 : 0,
    [team.members]
  )

  return (
    <Card className={`hover:shadow-md transition-shadow ${isArchived ? 'opacity-60 border-dashed' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full ${isArchived ? 'bg-gray-400' : 'bg-tinedy-blue'} flex items-center justify-center text-white font-semibold text-lg`}>
              {teamInitial}
            </div>
            <div>
              <CardTitle className="text-lg font-display">
                {team.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {isArchived && (
                  <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">
                    Archived
                  </Badge>
                )}
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {team.member_count || 0} members
                </Badge>
                {team.average_rating !== undefined && (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="h-3 w-3 fill-yellow-400" />
                    <span className="text-xs font-semibold text-gray-700">
                      {team.average_rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {isArchived && onRestore ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRestore(team.id)}
                className="border-green-500 text-green-700 hover:bg-green-50"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Restore
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(team)}
                  disabled={isArchived}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <PermissionAwareDeleteButton
                  resource="teams"
                  itemName={team.name}
                  onDelete={() => onDelete(team.id)}
                  onCancel={onCancel ? () => onCancel(team.id) : undefined}
                  cancelText="Archive"
                />
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {team.description && (
          <p className="text-sm text-muted-foreground">
            {team.description}
          </p>
        )}

        {/* Team Lead */}
        {team.team_lead && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-900">Team Lead</span>
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={team.team_lead.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-amber-600 text-white">
                  {getInitials(team.team_lead.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{team.team_lead.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{team.team_lead.email}</p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Team Members</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddMember(team)}
              className="h-8"
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {displayedMembers.length > 0 ? (
              displayedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors group"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-tinedy-blue text-white">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${member.is_active === false ? 'text-muted-foreground line-through' : ''}`}>
                        {member.full_name}
                      </p>
                      {team.team_lead_id === member.id && (
                        <Badge variant="secondary" className="h-5 px-1.5">
                          <Crown className="h-3 w-3 text-amber-600" />
                        </Badge>
                      )}
                      {member.is_active === false && (
                        <Badge variant="outline" className="h-5 px-1.5 text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {member.membership_id && (
                      <Switch
                        checked={member.is_active !== false}
                        onCheckedChange={() => onToggleMemberStatus(member.membership_id!, member.is_active !== false)}
                        className="scale-75"
                      />
                    )}
                    <DeleteButton
                      itemName={member.full_name}
                      onDelete={() => onRemoveMember(team.id, member.id)}
                      size="sm"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No members yet
              </p>
            )}

            {remainingMembersCount > 0 && (
              <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                +{remainingMembersCount} more members
              </p>
            )}
          </div>
        </div>

        {/* View Details Button */}
        <div className="mt-4 pt-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`${basePath}/teams/${team.id}`)}
          >
            View Details
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})
