/**
 * Team Performance Mobile - Mobile View
 *
 * Card-based layout for team performance comparison.
 * Shows below lg breakpoint.
 * Features:
 * - Ranking badges (Gold/Silver/Bronze)
 * - Team name with member count badge
 * - Stats grid (2x2)
 * - Job status breakdown
 * - Completion rate progress bar
 * - Load More pagination (shows 5 initially)
 */

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Award, Users, TrendingUp, Briefcase, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency, getRankBadgeColor } from '@/lib/utils'
import type { TeamPerformanceProps } from './types'
import { getCompletionInfo } from './types'

/** จำนวน team ที่แสดงครั้งแรก */
const INITIAL_DISPLAY_COUNT = 5

export function TeamPerformanceMobile({ teamPerformance }: TeamPerformanceProps) {
  const [showAll, setShowAll] = React.useState(false)

  // Sort by revenue (descending) - same as desktop
  const sortedTeams = React.useMemo(
    () => [...teamPerformance].sort((a, b) => b.revenue - a.revenue),
    [teamPerformance]
  )

  // Teams to display based on showAll state
  const displayedTeams = React.useMemo(
    () => showAll ? sortedTeams : sortedTeams.slice(0, INITIAL_DISPLAY_COUNT),
    [sortedTeams, showAll]
  )

  const hasMore = sortedTeams.length > INITIAL_DISPLAY_COUNT
  const remainingCount = sortedTeams.length - INITIAL_DISPLAY_COUNT

  if (sortedTeams.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No team performance data available
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {displayedTeams.map((team, index) => {
        const completion = getCompletionInfo(team.completionRate)

        return (
          <Card key={team.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Ranking Badge */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankBadgeColor(index)}`}
                  >
                    {index === 0 ? (
                      <Award className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                </div>

                {/* Team Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-base text-tinedy-dark truncate">
                      {team.name}
                    </h4>
                    <span className="inline-flex items-center gap-1 rounded-full bg-tinedy-blue/10 px-2 py-0.5 text-xs font-medium text-tinedy-blue flex-shrink-0">
                      <Users className="h-3 w-3" />
                      {team.memberCount}
                    </span>
                  </div>

                  {/* Metrics Grid - 2x2 */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {/* Revenue */}
                    <div className="bg-green-50 rounded-lg p-2">
                      <div className="flex items-center gap-1 text-xs text-green-700 mb-1">
                        <TrendingUp className="h-3 w-3" />
                        <span className="font-medium">Revenue</span>
                      </div>
                      <div className="font-bold text-sm text-green-800">
                        {formatCurrency(team.revenue)}
                      </div>
                    </div>

                    {/* Total Jobs */}
                    <div className="bg-blue-50 rounded-lg p-2">
                      <div className="flex items-center gap-1 text-xs text-blue-700 mb-1">
                        <Briefcase className="h-3 w-3" />
                        <span className="font-medium">Total Jobs</span>
                      </div>
                      <div className="font-bold text-sm text-blue-800">
                        {team.totalJobs} jobs
                      </div>
                    </div>

                    {/* Completed */}
                    <div className="bg-emerald-50 rounded-lg p-2">
                      <div className="flex items-center gap-1 text-xs text-emerald-700 mb-1">
                        <CheckCircle className="h-3 w-3" />
                        <span className="font-medium">Completed</span>
                      </div>
                      <div className="font-bold text-sm text-emerald-800">
                        {team.completed} jobs
                      </div>
                    </div>

                    {/* Job Status */}
                    <div className="bg-tinedy-off-white/50 rounded-lg p-2">
                      <div className="flex items-center gap-1 text-xs text-tinedy-dark mb-1">
                        <span className="font-medium">Status</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="text-blue-600">{team.inProgress} prog</span>
                        <span className="text-yellow-600">{team.pending} pend</span>
                      </div>
                    </div>
                  </div>

                  {/* Completion Rate Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Completion Rate</span>
                      <span className="font-semibold text-tinedy-dark">
                        {team.completionRate.toFixed(0)}%
                      </span>
                    </div>
                    <div
                      className="w-full bg-muted rounded-full h-2"
                      role="progressbar"
                      aria-label={`Completion Rate: ${Math.round(team.completionRate)}%`}
                      aria-valuenow={Math.round(team.completionRate)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={`h-2 rounded-full transition-all ${completion.color}`}
                        style={{ width: `${Math.min(team.completionRate, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {completion.label} Utilization
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Load More / Show Less Button */}
      {hasMore && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show {remainingCount} More Teams
            </>
          )}
        </Button>
      )}
    </div>
  )
}
