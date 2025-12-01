import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
}

// Helper function moved outside component
const getInitials = (name: string) => {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export const TeamCard = memo(function TeamCard({ team, onEdit, onDelete, onCancel, onRestore, onAddMember, onRemoveMember }: TeamCardProps) {
  const navigate = useNavigate()
  const isArchived = !!team.deleted_at

  // Both admin and manager use /admin routes
  const basePath = '/admin'

  // Memoize expensive calculations
  const teamInitial = useMemo(() => team.name.charAt(0).toUpperCase(), [team.name])

  const displayedMembers = useMemo(() => {
    if (!team.members) return []

    // Sort members: Team Lead first, then by name
    const sorted = [...team.members].sort((a, b) => {
      // Team Lead always first
      if (a.id === team.team_lead_id) return -1
      if (b.id === team.team_lead_id) return 1

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
      <CardHeader className="p-4 sm:p-6 pb-1 sm:pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${isArchived ? 'bg-gray-400' : 'bg-tinedy-blue'} flex items-center justify-center text-white font-semibold text-base sm:text-lg flex-shrink-0`}>
              {teamInitial}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg font-display truncate">
                {team.name}
              </CardTitle>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                {isArchived && (
                  <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 text-[10px] sm:text-xs">
                    Archived
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px] sm:text-xs">
                  <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                  {team.member_count || 0} members
                </Badge>
                {team.average_rating !== undefined && (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-yellow-400" />
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-700">
                      {team.average_rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
            {isArchived && onRestore ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRestore(team.id)}
                className="border-green-500 text-green-700 hover:bg-green-50 h-8 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                Restore
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(team)}
                  disabled={isArchived}
                  className="h-8 w-8 sm:h-10 sm:w-10"
                >
                  <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <PermissionAwareDeleteButton
                  resource="teams"
                  itemName={team.name}
                  onDelete={() => onDelete(team.id)}
                  onCancel={onCancel ? () => onCancel(team.id) : undefined}
                  cancelText="Archive"
                  className="h-8 w-8 sm:h-10 sm:w-10"
                />
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
        {team.description && (
          <p className="text-xs sm:text-sm text-muted-foreground">
            {team.description}
          </p>
        )}

        {/* Team Lead */}
        {team.team_lead && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
              <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
              <span className="text-[10px] sm:text-xs font-semibold text-amber-900">Team Lead</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarImage src={team.team_lead.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-amber-600 text-white">
                  {getInitials(team.team_lead.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium truncate">{team.team_lead.full_name}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{team.team_lead.email}</p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-2 sm:pt-3">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs sm:text-sm font-medium">Team Members</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddMember(team)}
              className="h-7 sm:h-8 text-[10px] sm:text-xs"
            >
              <UserPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
              Add
            </Button>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            {displayedMembers.length > 0 ? (
              displayedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-md hover:bg-muted transition-colors group"
                >
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-tinedy-blue text-white">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {member.full_name}
                      </p>
                      {team.team_lead_id === member.id && (
                        <Badge variant="secondary" className="h-4 sm:h-5 px-1 sm:px-1.5">
                          <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-600" />
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteButton
                      itemName={member.full_name}
                      onDelete={() => onRemoveMember(team.id, member.id)}
                      size="sm"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-3 sm:py-4">
                No members yet
              </p>
            )}

            {remainingMembersCount > 0 && (
              <p className="text-[10px] sm:text-xs text-muted-foreground text-center pt-2 border-t">
                +{remainingMembersCount} more members
              </p>
            )}
          </div>
        </div>

        {/* View Details Button */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
          <Button
            variant="outline"
            className="w-full h-9 sm:h-10 text-xs sm:text-sm"
            onClick={() => navigate(`${basePath}/teams/${team.id}`)}
          >
            View Details
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})
