/**
 * TeamMembershipCard
 *
 * Pure UI component แสดงทีมที่ Staff สังกัดในหน้า Profile.
 * Data fetching อยู่ใน useStaffTeams hook.
 */

import { useStaffTeams } from '@/hooks/use-staff-teams'
import type { StaffTeamDetail, StaffTeamMember } from '@/types/team'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Crown, Loader2 } from 'lucide-react'
import { getInitials } from '@/lib/string-utils'

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function MemberChip({ member }: { member: StaffTeamMember }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-gray-50 pl-1 pr-2.5 py-0.5">
      <Avatar className="h-5 w-5">
        <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
        <AvatarFallback className="text-[10px]">
          {getInitials(member.full_name)}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs">{member.full_name}</span>
    </div>
  )
}

function TeamCard({ team }: { team: StaffTeamDetail }) {
  const isLeader = team.role === 'leader'

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      {/* Header: Team name + role badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <Users className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-sm truncate">{team.name}</h3>
        </div>
        <Badge
          variant={isLeader ? 'default' : 'outline'}
          className={isLeader ? 'bg-amber-500 hover:bg-amber-500/80' : ''}
        >
          {isLeader && <Crown className="h-3 w-3 mr-1" />}
          {isLeader ? 'Leader' : 'Member'}
        </Badge>
      </div>

      {/* Description */}
      {team.description && (
        <p className="text-xs text-muted-foreground">{team.description}</p>
      )}

      {/* Team Lead */}
      {team.team_lead && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Crown className="h-3 w-3 text-amber-500" />
          <span>Lead:</span>
          <span className="font-medium text-foreground">{team.team_lead.full_name}</span>
        </div>
      )}

      {/* Members */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Members ({team.members.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {team.members.map(member => (
            <MemberChip key={member.id} member={member} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TeamMembershipCard() {
  const { teams, isLoading } = useStaffTeams()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          You are not assigned to any team yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {teams.map(team => (
        <TeamCard key={team.id} team={team} />
      ))}
    </div>
  )
}
