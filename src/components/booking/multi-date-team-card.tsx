/**
 * MultiDateTeamCard Component
 *
 * แสดงข้อมูล team availability สำหรับหลายวัน
 * พร้อม per-date breakdown และ member availability
 */

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge'
import type { MultiDateTeamResult } from '@/types/staff-availability'
import { Users, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'

interface MultiDateTeamCardProps {
  team: MultiDateTeamResult
  rank?: number
  onSelect: () => void
  isUnavailable?: boolean
  isCurrentlyAssigned?: boolean
  displayDates: string[]
}

export function MultiDateTeamCard({
  team,
  rank,
  onSelect,
  isUnavailable = false,
  isCurrentlyAssigned = false,
  displayDates
}: MultiDateTeamCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '👥'

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      isCurrentlyAssigned ? 'border-tinedy-blue bg-tinedy-blue/5' :
      isUnavailable ? 'bg-tinedy-off-white/50' :
      'hover:border-tinedy-blue hover:shadow-md'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            {rank && <span className="text-2xl">{rankEmoji}</span>}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-lg">{team.teamName}</h4>
                {isCurrentlyAssigned && (
                  <Badge className="bg-tinedy-blue text-white">Currently Assigned</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {team.totalMembers} members
              </p>
            </div>
          </div>

          {/* Team Match */}
          <div className="text-sm mb-2">
            <span className="text-muted-foreground">Team Match: </span>
            <span className="font-semibold text-tinedy-blue">{team.teamMatch}%</span>
          </div>

          {/* Overall Multi-Date Status */}
          <div className="border-b pb-3 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">
                Available: {team.availableDatesCount}/{team.totalDatesCount} dates
              </span>
              {team.isAvailableAllDates ? (
                <StatusBadge variant="success">
                  ✓ All Dates
                </StatusBadge>
              ) : team.availableDatesCount > 0 ? (
                <StatusBadge variant="warning">
                  ⚠ Partial
                </StatusBadge>
              ) : (
                <StatusBadge variant="danger">
                  ✗ No Dates
                </StatusBadge>
              )}
            </div>
          </div>

          {/* Fully Available Dates Section */}
          {displayDates.filter(date => team.dateAvailability[date]?.isFullyAvailable).length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs font-semibold text-green-700">
                  🟢 Fully Available ({displayDates.filter(date => team.dateAvailability[date]?.isFullyAvailable).length})
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {displayDates
                  .filter(date => team.dateAvailability[date]?.isFullyAvailable)
                  .map((date) => (
                    <Badge
                      key={date}
                      variant="outline"
                      className="text-xs bg-green-50 text-green-700 border-green-300"
                    >
                      {format(new Date(date), 'MMM d')} ✓
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {/* Partially Available Dates Section */}
          {displayDates.filter(date => {
            const status = team.dateAvailability[date]
            return !status?.isFullyAvailable && (status?.availableMembersCount ?? 0) > 0
          }).length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs font-semibold text-orange-700">
                  🟡 Partially Available ({displayDates.filter(date => {
                    const status = team.dateAvailability[date]
                    return !status?.isFullyAvailable && (status?.availableMembersCount ?? 0) > 0
                  }).length})
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {displayDates
                  .filter(date => {
                    const status = team.dateAvailability[date]
                    return !status?.isFullyAvailable && (status?.availableMembersCount ?? 0) > 0
                  })
                  .map((date) => {
                    const dateStatus = team.dateAvailability[date]
                    const availableCount = dateStatus?.availableMembersCount ?? 0
                    return (
                      <Badge
                        key={date}
                        variant="outline"
                        className="text-xs bg-orange-50 text-orange-700 border-orange-300"
                      >
                        {format(new Date(date), 'MMM d')} {availableCount}/{team.totalMembers}
                      </Badge>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Unavailable Dates Section */}
          {displayDates.filter(date => (team.dateAvailability[date]?.availableMembersCount ?? 0) === 0).length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs font-semibold text-red-700">
                  🔴 Unavailable ({displayDates.filter(date => (team.dateAvailability[date]?.availableMembersCount ?? 0) === 0).length})
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {displayDates
                  .filter(date => (team.dateAvailability[date]?.availableMembersCount ?? 0) === 0)
                  .map((date) => (
                    <Badge
                      key={date}
                      variant="outline"
                      className="text-xs bg-red-50 text-red-700 border-red-300"
                    >
                      {format(new Date(date), 'MMM d')} 0/{team.totalMembers}
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {/* Expandable Member Details */}
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              <span>View Member Details</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {displayDates.map((date) => {
                const dateStatus = team.dateAvailability[date]
                if (!dateStatus) return null

                return (
                  <div key={date} className="bg-blue-50 border-l-2 border-blue-500 pl-3 py-2 text-xs">
                    <p className="font-medium text-blue-900 mb-1">
                      {format(new Date(date), 'MMM d, yyyy')}
                    </p>

                    {/* Available Members */}
                    {dateStatus.availableMembers.length > 0 && (
                      <div className="mb-1">
                        <p className="text-green-700 font-medium mb-0.5">
                          ✓ Available ({dateStatus.availableMembers.length}):
                        </p>
                        <div className="ml-2 text-green-700">
                          {dateStatus.availableMembers.map((m, i) => (
                            <div key={i}>• {m.name}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unavailable Members */}
                    {dateStatus.unavailableMembers.length > 0 && (
                      <div>
                        <p className="text-red-700 font-medium mb-0.5">
                          ✗ Unavailable ({dateStatus.unavailableMembers.length}):
                        </p>
                        <div className="ml-2 text-red-700">
                          {dateStatus.unavailableMembers.map((m, i) => (
                            <div key={i}>
                              • {m.name}
                              {m.reason && <span className="text-red-600 ml-1">({m.reason})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Score and Action */}
        <div className="text-right flex flex-col items-end gap-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Score:</span>
            <div className="text-2xl font-bold text-tinedy-blue">{team.overallScore}</div>
          </div>
          <Button
            size="sm"
            onClick={onSelect}
            disabled={isUnavailable}
            className={isUnavailable ? 'opacity-50' : ''}
          >
            Select
          </Button>
        </div>
      </div>
    </div>
  )
}
