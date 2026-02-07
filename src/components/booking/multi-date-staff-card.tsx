/**
 * MultiDateStaffCard Component
 *
 * แสดงข้อมูล staff availability สำหรับหลายวัน
 * พร้อม per-date breakdown และ overall status
 */

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge'
import type { MultiDateStaffResult } from '@/types/staff-availability'
import { Star, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'

interface MultiDateStaffCardProps {
  staff: MultiDateStaffResult
  rank?: number
  onSelect: () => void
  isUnavailable?: boolean
  isCurrentlyAssigned?: boolean
  displayDates: string[]
}

export function MultiDateStaffCard({
  staff,
  rank,
  onSelect,
  isUnavailable = false,
  isCurrentlyAssigned = false,
  displayDates
}: MultiDateStaffCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '👤'

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
                <h4 className="font-semibold text-lg">{staff.fullName}</h4>
                {isCurrentlyAssigned && (
                  <Badge className="bg-tinedy-blue text-white">Currently Assigned</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{staff.staffNumber}</p>
            </div>
          </div>

          {/* Skill Match & Rating */}
          <div className="flex items-center gap-4 text-sm mb-2">
            <div>
              <span className="text-muted-foreground">Skill Match: </span>
              <span className="font-semibold text-tinedy-blue">{staff.skillMatch}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-muted-foreground">
                {staff.rating > 0 ? `${staff.rating}/5` : 'No ratings'}
              </span>
            </div>
          </div>

          {/* Skills */}
          {staff.skills && staff.skills.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mb-3">
              {staff.skills.map((skill, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          )}

          {/* Overall Multi-Date Status */}
          <div className="border-b pb-3 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">
                Available: {staff.availableDatesCount}/{staff.totalDatesCount} dates
              </span>
              {staff.isAvailableAllDates ? (
                <StatusBadge variant="success">
                  ✓ All Dates
                </StatusBadge>
              ) : staff.availableDatesCount > 0 ? (
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

          {/* Available Dates Section */}
          {displayDates.filter(date => staff.dateAvailability[date]?.isAvailable).length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs font-semibold text-green-700">
                  🟢 Available ({displayDates.filter(date => staff.dateAvailability[date]?.isAvailable).length})
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {displayDates
                  .filter(date => staff.dateAvailability[date]?.isAvailable)
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

          {/* Unavailable Dates Section */}
          {displayDates.filter(date => !staff.dateAvailability[date]?.isAvailable).length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs font-semibold text-red-700">
                  🔴 Unavailable ({displayDates.filter(date => !staff.dateAvailability[date]?.isAvailable).length})
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {displayDates
                  .filter(date => !staff.dateAvailability[date]?.isAvailable)
                  .map((date) => {
                    const dateStatus = staff.dateAvailability[date]
                    const conflictCount = dateStatus?.conflicts.length ?? 0
                    return (
                      <Badge
                        key={date}
                        variant="outline"
                        className="text-xs bg-red-50 text-red-700 border-red-300"
                      >
                        {format(new Date(date), 'MMM d')} {conflictCount > 0 ? `✗${conflictCount}` : '✗'}
                      </Badge>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Expandable Details */}
          {staff.allConflicts.length > 0 && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium">
                <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                <span>
                  {staff.allConflicts.length} Conflict{staff.allConflicts.length > 1 ? 's' : ''} Found
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {displayDates.map((date) => {
                  const dateStatus = staff.dateAvailability[date]
                  if (!dateStatus || dateStatus.conflicts.length === 0) return null

                  return (
                    <div key={date} className="bg-orange-50 border-l-2 border-orange-500 pl-3 py-2 text-xs">
                      <p className="font-medium text-orange-900 mb-1">
                        {format(new Date(date), 'MMM d, yyyy')}
                      </p>
                      {dateStatus.conflicts.map((conflict, i) => (
                        <div key={i} className="text-orange-700 ml-2">
                          • {conflict.startTime.slice(0, 5)} - {conflict.endTime.slice(0, 5)}: {conflict.serviceName}
                          <span className="text-orange-600 ml-1">({conflict.customerName})</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Score and Action */}
        <div className="text-right flex flex-col items-end gap-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Score:</span>
            <div className="text-2xl font-bold text-tinedy-blue">{staff.overallScore}</div>
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
