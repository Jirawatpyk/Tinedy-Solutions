import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Edit, Trash2, UserPlus, Users, Crown, Star } from 'lucide-react'
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
}

interface TeamCardProps {
  team: Team
  onEdit: (team: Team) => void
  onDelete: (teamId: string) => void
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

export const TeamCard = memo(function TeamCard({ team, onEdit, onDelete, onAddMember, onRemoveMember, onToggleMemberStatus }: TeamCardProps) {
  const navigate = useNavigate()

  // Memoize expensive calculations
  const teamInitial = useMemo(() => team.name.charAt(0).toUpperCase(), [team.name])

  const displayedMembers = useMemo(
    () => team.members?.slice(0, 3) || [],
    [team.members]
  )

  const remainingMembersCount = useMemo(
    () => team.members && team.members.length > 3 ? team.members.length - 3 : 0,
    [team.members]
  )

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/admin/teams/${team.id}`)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-tinedy-blue flex items-center justify-center text-white font-semibold text-lg">
              {teamInitial}
            </div>
            <div>
              <CardTitle className="text-lg font-display">
                {team.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
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
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(team)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <DeleteButton
              itemName={team.name}
              onDelete={() => onDelete(team.id)}
            />
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
              onClick={(e) => {
                e.stopPropagation()
                onAddMember(team)
              }}
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    {member.membership_id && (
                      <Switch
                        checked={member.is_active !== false}
                        onCheckedChange={() => onToggleMemberStatus(member.membership_id!, member.is_active !== false)}
                        className="scale-75"
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveMember(team.id, member.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
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
      </CardContent>
    </Card>
  )
})
