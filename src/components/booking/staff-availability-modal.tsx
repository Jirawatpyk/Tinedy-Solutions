import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useStaffAvailabilityCheck, type StaffAvailabilityResult, type TeamAvailabilityResult } from '@/hooks/use-staff-availability-check'
import { format } from 'date-fns'
import { Users, Star, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatTime } from '@/lib/booking-utils'

interface StaffAvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  assignmentType: 'individual' | 'team'
  onSelectStaff?: (staffId: string) => void
  onSelectTeam?: (teamId: string) => void
  date: string
  startTime: string
  endTime: string
  servicePackageId: string
  servicePackageName?: string
  currentAssignedStaffId?: string
  currentAssignedTeamId?: string
  excludeBookingId?: string
}

export function StaffAvailabilityModal({
  isOpen,
  onClose,
  assignmentType,
  onSelectStaff,
  onSelectTeam,
  date,
  startTime,
  endTime,
  servicePackageId,
  servicePackageName = '',
  currentAssignedStaffId,
  currentAssignedTeamId,
  excludeBookingId
}: StaffAvailabilityModalProps) {
  const { loading, staffResults, teamResults, serviceType } = useStaffAvailabilityCheck({
    date,
    startTime,
    endTime,
    servicePackageId,
    assignmentType,
    excludeBookingId
  })

  const [showConflictWarning, setShowConflictWarning] = useState(false)
  const [pendingSelection, setPendingSelection] = useState<{
    id: string
    conflicts: Array<{ bookingDate: string; startTime: string; endTime: string; serviceName: string; customerName: string }>
    name: string
  } | null>(null)

  const handleSelect = (
    id: string,
    conflicts?: Array<{ bookingDate: string; startTime: string; endTime: string; serviceName: string; customerName: string }>,
    name?: string
  ) => {
    // If has conflicts, show warning dialog
    if (conflicts && conflicts.length > 0) {
      setPendingSelection({ id, conflicts, name: name || '' })
      setShowConflictWarning(true)
      return
    }

    // No conflicts, proceed directly
    if (assignmentType === 'individual') {
      onSelectStaff?.(id)
    } else {
      onSelectTeam?.(id)
    }
    onClose()
  }

  const confirmSelection = () => {
    if (!pendingSelection) return

    if (assignmentType === 'individual') {
      onSelectStaff?.(pendingSelection.id)
    } else {
      onSelectTeam?.(pendingSelection.id)
    }
    setShowConflictWarning(false)
    setPendingSelection(null)
    onClose()
  }

  // Separate results into available and unavailable
  const { recommended, partiallyAvailable, unavailable } = useMemo(() => {
    if (assignmentType === 'individual') {
      const recommended = staffResults.filter(s => s.isAvailable)
      const partiallyAvailable = staffResults.filter(s => !s.isAvailable && s.conflicts.length > 0)
      const unavailable = staffResults.filter(s => !s.isAvailable && s.unavailabilityReasons.length > 0)

      return { recommended, partiallyAvailable, unavailable }
    } else {
      const recommended = teamResults.filter(t => t.isFullyAvailable)
      const partiallyAvailable = teamResults.filter(t => !t.isFullyAvailable && t.availableMembers > 0)
      const unavailable = teamResults.filter(t => t.availableMembers === 0)

      return { recommended, partiallyAvailable, unavailable }
    }
  }, [assignmentType, staffResults, teamResults])

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {assignmentType === 'individual' ? '🔍 Check Staff Availability' : '🔍 Check Team Availability'}
          </DialogTitle>
        </DialogHeader>

        {/* Context Info */}
        <div className="grid grid-cols-2 gap-2 text-sm border rounded-lg p-3 bg-tinedy-off-white">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">📅 Date:</span>
            <span className="font-medium">{format(new Date(date), 'PP')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">⏰ Time:</span>
            <span className="font-medium">{formatTime(startTime)} - {formatTime(endTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">📦 Service:</span>
            <span className="font-medium">{servicePackageName || serviceType}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{assignmentType === 'individual' ? '👤' : '👥'} Mode:</span>
            <span className="font-medium capitalize">{assignmentType === 'individual' ? 'Individual Staff' : 'Team Assignment'}</span>
          </div>
        </div>

        {/* Results Section */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Recommended Section */}
              {recommended.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    🎯 Recommended ({recommended.length})
                  </h3>
                  <div className="space-y-3">
                    {assignmentType === 'individual'
                      ? (recommended as StaffAvailabilityResult[]).map((staff, index) => (
                          <StaffCard
                            key={staff.staffId}
                            staff={staff}
                            rank={index + 1}
                            onSelect={() => handleSelect(staff.staffId)}
                            isCurrentlyAssigned={staff.staffId === currentAssignedStaffId}
                          />
                        ))
                      : (recommended as TeamAvailabilityResult[]).map((team, index) => (
                          <TeamCard
                            key={team.teamId}
                            team={team}
                            rank={index + 1}
                            onSelect={() => handleSelect(team.teamId)}
                            isCurrentlyAssigned={team.teamId === currentAssignedTeamId}
                          />
                        ))
                    }
                  </div>
                </div>
              )}

              {/* Partially Available Section */}
              {partiallyAvailable.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-orange-600">
                    ⚠️ Partially Available ({partiallyAvailable.length})
                  </h3>
                  <div className="space-y-3">
                    {assignmentType === 'individual'
                      ? (partiallyAvailable as StaffAvailabilityResult[]).map((staff) => (
                          <StaffCard
                            key={staff.staffId}
                            staff={staff}
                            onSelect={() => handleSelect(staff.staffId, staff.conflicts, staff.fullName)}
                            isCurrentlyAssigned={staff.staffId === currentAssignedStaffId}
                          />
                        ))
                      : (partiallyAvailable as TeamAvailabilityResult[]).map((team) => {
                          // Collect all conflicts from team members
                          const teamConflicts = team.members
                            .flatMap(m => m.conflicts)
                            .filter((c, i, arr) => arr.findIndex(c2 => c2.id === c.id) === i) // Remove duplicates
                          return (
                            <TeamCard
                              key={team.teamId}
                              team={team}
                              onSelect={() => handleSelect(team.teamId, teamConflicts, team.teamName)}
                              isCurrentlyAssigned={team.teamId === currentAssignedTeamId}
                            />
                          )
                        })
                    }
                  </div>
                </div>
              )}

              {/* Unavailable Section */}
              {unavailable.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-red-600">
                    ❌ Unavailable ({unavailable.length})
                  </h3>
                  <div className="space-y-3 opacity-60">
                    {assignmentType === 'individual'
                      ? (unavailable as StaffAvailabilityResult[]).map((staff) => (
                          <StaffCard
                            key={staff.staffId}
                            staff={staff}
                            onSelect={() => handleSelect(staff.staffId)}
                            isUnavailable
                            isCurrentlyAssigned={staff.staffId === currentAssignedStaffId}
                          />
                        ))
                      : (unavailable as TeamAvailabilityResult[]).map((team) => (
                          <TeamCard
                            key={team.teamId}
                            team={team}
                            onSelect={() => handleSelect(team.teamId)}
                            isUnavailable
                            isCurrentlyAssigned={team.teamId === currentAssignedTeamId}
                          />
                        ))
                    }
                  </div>
                </div>
              )}

              {/* Empty State */}
              {recommended.length === 0 && partiallyAvailable.length === 0 && unavailable.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No {assignmentType === 'individual' ? 'staff' : 'teams'} found</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Conflict Warning Dialog */}
    <Dialog open={showConflictWarning} onOpenChange={(open) => {
      if (!open) {
        setShowConflictWarning(false)
        setPendingSelection(null)
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="h-5 w-5" />
            Scheduling Conflict Detected
          </DialogTitle>
          <DialogDescription>
            <strong>{pendingSelection?.name}</strong> has {pendingSelection?.conflicts.length || 0} conflicting booking(s) at this time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-60 overflow-y-auto bg-muted/50 p-3 rounded-md">
          {pendingSelection?.conflicts.map((conflict, index) => (
            <div key={index} className="text-sm border-l-2 border-orange-500 pl-2 py-1">
              <p className="font-medium text-foreground">{conflict.serviceName} - {conflict.customerName}</p>
              <p className="text-muted-foreground text-xs">
                {format(new Date(conflict.bookingDate), 'PP')} • {conflict.startTime.substring(0, 5)} - {conflict.endTime.substring(0, 5)}
              </p>
            </div>
          ))}
        </div>

        <p className="text-sm text-orange-600">
          Assigning this {assignmentType === 'individual' ? 'staff member' : 'team'} may result in double-booking. Do you want to continue anyway?
        </p>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowConflictWarning(false)
              setPendingSelection(null)
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmSelection}
            className="bg-yellow-600 text-white hover:bg-yellow-600/90"
          >
            Continue Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

// Staff Card Component
function StaffCard({
  staff,
  rank,
  onSelect,
  isUnavailable = false,
  isCurrentlyAssigned = false
}: {
  staff: StaffAvailabilityResult
  rank?: number
  onSelect: () => void
  isUnavailable?: boolean
  isCurrentlyAssigned?: boolean
}) {
  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '👤'

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      isCurrentlyAssigned ? 'border-tinedy-blue bg-tinedy-blue/5' : isUnavailable ? 'bg-gray-50' : 'hover:border-tinedy-blue hover:shadow-md'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
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

          {/* Skill Match */}
          <div className="mt-2 text-sm">
            <span className="text-muted-foreground">Skill Match: </span>
            <span className="font-semibold text-tinedy-blue">{staff.skillMatch}%</span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{staff.rating > 0 ? `${staff.rating}/5` : 'No ratings yet'}</span>
          </div>

          {/* Jobs on Selected Date */}
          <div className="mt-1 text-sm">
            <span className="text-muted-foreground">📅 Jobs on Date: </span>
            <span className={`font-semibold ${
              staff.jobsToday === 0 ? 'text-green-600' :
              staff.jobsToday <= 2 ? 'text-blue-600' :
              staff.jobsToday <= 4 ? 'text-orange-600' :
              'text-red-600'
            }`}>
              {staff.jobsToday}
            </span>
          </div>

          {/* Skills */}
          {staff.skills && staff.skills.length > 0 && (
            <div className="mt-2 flex items-center gap-1 flex-wrap">
              {staff.skills.map((skill, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          )}

          {/* Availability Status */}
          <div className="mt-3">
            {staff.isAvailable ? (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Fully Available</span>
              </div>
            ) : staff.conflicts.length > 0 ? (
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2 text-orange-600 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  <span>Booking Conflicts ({staff.conflicts.length})</span>
                </div>
                {staff.conflicts.map((conflict, i) => (
                  <div key={i} className="ml-6 text-xs text-muted-foreground">
                    • {conflict.startTime.slice(0, 5)} - {conflict.endTime.slice(0, 5)}: {conflict.serviceName}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2 text-red-600 font-medium">
                  <XCircle className="h-4 w-4" />
                  <span>Unavailable</span>
                </div>
                {staff.unavailabilityReasons.map((reason, i) => (
                  <div key={i} className="ml-6 text-xs text-muted-foreground">
                    • {reason.reason}
                    {reason.notes && `: ${reason.notes}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Score and Action */}
        <div className="text-right flex flex-col items-end gap-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Score:</span>
            <div className="text-2xl font-bold text-tinedy-blue">{staff.score}</div>
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

// Team Card Component
function TeamCard({
  team,
  rank,
  onSelect,
  isUnavailable = false,
  isCurrentlyAssigned = false
}: {
  team: TeamAvailabilityResult
  rank?: number
  onSelect: () => void
  isUnavailable?: boolean
  isCurrentlyAssigned?: boolean
}) {
  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '👥'

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      isCurrentlyAssigned ? 'border-tinedy-blue bg-tinedy-blue/5' : isUnavailable ? 'bg-gray-50' : 'hover:border-tinedy-blue hover:shadow-md'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
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
          <div className="mt-2 text-sm">
            <span className="text-muted-foreground">Team Match: </span>
            <span className="font-semibold text-tinedy-blue">{team.teamMatch}%</span>
          </div>

          {/* Team Members */}
          <div className="mt-3 space-y-1">
            <div className="text-sm font-medium">
              Available Members ({team.availableMembers}/{team.totalMembers}):
            </div>
            <div className="ml-4 space-y-1">
              {team.members.map((member) => (
                <div key={member.staffId} className="flex items-center gap-2 text-sm">
                  {member.isAvailable ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className={member.isAvailable ? '' : 'text-muted-foreground'}>
                    {member.fullName}
                  </span>
                  {!member.isAvailable && member.conflicts.length > 0 && (
                    <span className="text-xs text-orange-600">
                      ({member.conflicts.length} conflict{member.conflicts.length > 1 ? 's' : ''})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Availability Status */}
          <div className="mt-3">
            {team.isFullyAvailable ? (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Full Team Available</span>
              </div>
            ) : team.availableMembers > 0 ? (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Partial Availability</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Team Unavailable</span>
              </div>
            )}
          </div>
        </div>

        {/* Score and Action */}
        <div className="text-right flex flex-col items-end gap-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Score:</span>
            <div className="text-2xl font-bold text-tinedy-blue">{team.score}</div>
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
