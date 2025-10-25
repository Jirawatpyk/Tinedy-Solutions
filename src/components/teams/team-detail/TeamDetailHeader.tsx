import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Edit, Crown, Calendar } from 'lucide-react'
import { DeleteButton } from '@/components/common/DeleteButton'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { getErrorMessage } from '@/lib/error-utils'

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
}

interface TeamDetailHeaderProps {
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

export function TeamDetailHeader({ team }: TeamDetailHeaderProps) {
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', team.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Team deleted successfully',
      })

      navigate('/admin/teams')
    } catch (error) {
      console.error('Error deleting team:', error)
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {/* Team Avatar */}
            <div className="w-16 h-16 rounded-full bg-tinedy-blue flex items-center justify-center text-white font-semibold text-2xl flex-shrink-0">
              {team.name.charAt(0).toUpperCase()}
            </div>

            {/* Team Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-display font-bold text-tinedy-dark mb-2">
                {team.name}
              </h1>

              {team.description && (
                <p className="text-muted-foreground mb-3">
                  {team.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created {formatDate(team.created_at)}</span>
                </div>
              </div>

              {/* Team Lead */}
              {team.team_lead && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 inline-block">
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
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: Open edit dialog
                toast({
                  title: 'Coming Soon',
                  description: 'Edit functionality will be added soon',
                })
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <DeleteButton
              itemName={team.name}
              onDelete={handleDelete}
              size="sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
