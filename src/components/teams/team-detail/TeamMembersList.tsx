import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
  is_active?: boolean
  membership_id?: string
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
}

const getInitials = (name: string) => {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function TeamMembersList({ team, onUpdate }: TeamMembersListProps) {
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
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', team.id)
        .eq('staff_id', staffId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Member removed successfully',
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

      onUpdate()
    } catch (error) {
      console.error('Error toggling member status:', error)
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-tinedy-blue" />
            <CardTitle>Team Members</CardTitle>
            <Badge variant="secondary">
              {team.members?.length || 0}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Open add member dialog
              toast({
                title: 'Coming Soon',
                description: 'Add member functionality will be added soon',
              })
            }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No members yet</p>
            <p className="text-sm mt-1">Add team members to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors group"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-tinedy-blue text-white">
                    {getInitials(member.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium truncate ${member.is_active === false ? 'text-muted-foreground line-through' : ''}`}>
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
                  <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                  {member.phone && (
                    <p className="text-xs text-muted-foreground">{member.phone}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {member.membership_id && (
                    <>
                      <Switch
                        checked={member.is_active !== false}
                        onCheckedChange={() =>
                          handleToggleMemberStatus(member.membership_id!, member.is_active !== false)
                        }
                        className="scale-75"
                      />
                      <DeleteButton
                        itemName={member.full_name}
                        onDelete={() => handleRemoveMember(member.id)}
                        size="sm"
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
