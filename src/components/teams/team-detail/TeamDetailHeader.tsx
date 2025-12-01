import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Edit, Crown, Calendar } from 'lucide-react'
import { DeleteButton } from '@/components/common/DeleteButton'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
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
  description: string | null
  created_at: string
  team_lead_id: string | null
  team_lead?: TeamMember | null
}

interface TeamDetailHeaderProps {
  team: Team
  onUpdate: () => void
  onEdit: () => void
  basePath: string
}

const getInitials = (name: string) => {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function TeamDetailHeader({ team, onEdit, basePath }: TeamDetailHeaderProps) {
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

      navigate(`${basePath}/teams`)
    } catch (error) {
      console.error('Error deleting team:', error)
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
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-0">
          <div className="flex flex-col sm:flex-row items-start gap-4 w-full sm:w-auto">
            {/* Team Avatar */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-tinedy-blue flex items-center justify-center text-white font-semibold text-xl sm:text-2xl flex-shrink-0">
              {team.name.charAt(0).toUpperCase()}
            </div>

            {/* Team Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-tinedy-dark mb-2">
                {team.name}
              </h1>

              {team.description && (
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                  {team.description}
                </p>
              )}

              <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Created {formatDate(team.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Divider - ซ่อนบนมือถือ */}
            {team.team_lead && (
              <div className="hidden sm:block self-stretch border-l border-gray-300 mx-4"></div>
            )}

            {/* Team Lead - stack บนมือถือ, ข้างขวาบนเดสก์ท็อป */}
            {team.team_lead && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 sm:p-3 w-full sm:w-auto flex-shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-[10px] sm:text-xs font-semibold text-amber-900">Team Lead</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                      <AvatarImage src={team.team_lead.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-amber-600 text-white">
                        {getInitials(team.team_lead.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate whitespace-nowrap">{team.team_lead.full_name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate whitespace-nowrap">{team.team_lead.email}</p>
                      {team.team_lead.phone && (
                        <p className="text-xs sm:text-sm text-muted-foreground truncate whitespace-nowrap">{team.team_lead.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1 sm:gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-8 sm:h-9"
            >
              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <DeleteButton
              itemName={team.name}
              onDelete={handleDelete}
              size="sm"
              className="h-8 sm:h-9"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
