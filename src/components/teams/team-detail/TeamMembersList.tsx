import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Crown, UserPlus, Users } from 'lucide-react'
import { DeleteButton } from '@/components/common/DeleteButton'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { mapErrorToUserMessage } from '@/lib/error-messages'

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
  team_lead_id: string | null
  members?: TeamMember[]
}

interface TeamMembersListProps {
  team: Team
  onUpdate: () => void
  onAddMember: () => void
}

const getInitials = (name: string) => {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function TeamMembersList({ team, onUpdate, onAddMember }: TeamMembersListProps) {
  const { toast } = useToast()

  // Sort members: Team lead first, then others
  const sortedMembers = [...(team.members || [])].sort((a, b) => {
    // Team lead always comes first
    if (a.id === team.team_lead_id) return -1
    if (b.id === team.team_lead_id) return 1

    // Then sort by name
    return a.full_name.localeCompare(b.full_name)
  })

  const handleRemoveMember = async (staffId: string) => {
    try {
      // Check if member being removed is the team lead
      const isTeamLead = team.team_lead_id === staffId

      // Soft delete: Set left_at timestamp instead of deleting
      // This preserves historical revenue data for the staff member
      const { error } = await supabase
        .from('team_members')
        .update({ left_at: new Date().toISOString() })
        .eq('team_id', team.id)
        .eq('staff_id', staffId)
        .is('left_at', null) // Only update active memberships

      if (error) throw error

      // If removing team lead, clear team_lead_id
      if (isTeamLead) {
        const { error: updateError } = await supabase
          .from('teams')
          .update({ team_lead_id: null })
          .eq('id', team.id)

        if (updateError) throw updateError
      }

      toast({
        title: 'Success',
        description: isTeamLead
          ? 'Team lead removed. Please assign a new team lead.'
          : 'Member removed successfully',
      })

      onUpdate()
    } catch (error) {
      console.error('Error removing member:', error)
      const errorMsg = mapErrorToUserMessage(error, 'team')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }


  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-tinedy-blue" />
            <CardTitle className="text-base sm:text-lg">Team Members</CardTitle>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              {team.members?.length || 0}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddMember}
            className="h-8 sm:h-9 w-full sm:w-auto text-xs sm:text-sm"
          >
            <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Add Member
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {sortedMembers.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-50" />
            <p className="text-sm sm:text-base">No members yet</p>
            <p className="text-xs sm:text-sm mt-1">Add team members to get started</p>
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {sortedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-md hover:bg-muted transition-colors group"
              >
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
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
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{member.email}</p>
                  {member.phone && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{member.phone}</p>
                  )}
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DeleteButton
                    itemName={member.full_name}
                    onDelete={() => handleRemoveMember(member.id)}
                    size="sm"
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
