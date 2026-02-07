/**
 * Staff Performance Mobile - Mobile View
 *
 * Card-based layout for staff performance comparison.
 * Shows below lg breakpoint.
 * Features:
 * - Ranking badges (Gold/Silver/Bronze)
 * - Avatar with initials
 * - Stats grid (2x2)
 * - Large progress bars
 * - Utilization color coding
 * - Load More pagination (shows 5 initially)
 */

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { TrendingUp, Briefcase, CheckCircle, DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import {
  formatCurrency,
  getAvatarColor,
  getRankBadgeColor,
} from '@/lib/utils'
import { getInitials } from '@/lib/string-utils'
import type { StaffPerformanceProps } from './types'
import { getUtilizationInfo } from './types'

/** จำนวน staff ที่แสดงครั้งแรก */
const INITIAL_DISPLAY_COUNT = 5

export function StaffPerformanceMobile({ staffPerformance }: StaffPerformanceProps) {
  const [showAll, setShowAll] = React.useState(false)

  // Sort by revenue (descending) - same as desktop
  const sortedStaff = React.useMemo(
    () => [...staffPerformance].sort((a, b) => b.revenue - a.revenue),
    [staffPerformance]
  )

  // Staff to display based on showAll state
  const displayedStaff = React.useMemo(
    () => showAll ? sortedStaff : sortedStaff.slice(0, INITIAL_DISPLAY_COUNT),
    [sortedStaff, showAll]
  )

  const hasMore = sortedStaff.length > INITIAL_DISPLAY_COUNT
  const remainingCount = sortedStaff.length - INITIAL_DISPLAY_COUNT

  if (sortedStaff.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No staff performance data available
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {displayedStaff.map((staff, index) => {
        const utilization = getUtilizationInfo(staff.utilizationRate)

        return (
          <Card key={staff.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Ranking Badge */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankBadgeColor(index)}`}
                  >
                    {index + 1}
                  </div>
                </div>

                {/* Avatar */}
                <Avatar className="flex-shrink-0 h-12 w-12">
                  <AvatarFallback className={`${getAvatarColor(index)} text-white font-semibold`}>
                    {getInitials(staff.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Staff Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-base text-tinedy-dark truncate">
                    {staff.name}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">{staff.email}</p>

                  {/* Metrics Grid - 2x2 */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {/* Revenue */}
                    <div className="bg-green-50 rounded-lg p-2">
                      <div className="flex items-center gap-1 text-xs text-green-700 mb-1">
                        <TrendingUp className="h-3 w-3" />
                        <span className="font-medium">Revenue</span>
                      </div>
                      <div className="font-bold text-sm text-green-800">
                        {formatCurrency(staff.revenue)}
                      </div>
                    </div>

                    {/* Total Jobs */}
                    <div className="bg-blue-50 rounded-lg p-2">
                      <div className="flex items-center gap-1 text-xs text-blue-700 mb-1">
                        <Briefcase className="h-3 w-3" />
                        <span className="font-medium">Total Jobs</span>
                      </div>
                      <div className="font-bold text-sm text-blue-800">
                        {staff.totalJobs} jobs
                      </div>
                    </div>

                    {/* Completed */}
                    <div className="bg-emerald-50 rounded-lg p-2">
                      <div className="flex items-center gap-1 text-xs text-emerald-700 mb-1">
                        <CheckCircle className="h-3 w-3" />
                        <span className="font-medium">Completed</span>
                      </div>
                      <div className="font-bold text-sm text-emerald-800">
                        {staff.completedJobs} jobs
                      </div>
                    </div>

                    {/* Avg Job Value */}
                    <div className="bg-purple-50 rounded-lg p-2">
                      <div className="flex items-center gap-1 text-xs text-purple-700 mb-1">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-medium">Avg Value</span>
                      </div>
                      <div className="font-bold text-sm text-purple-800">
                        {formatCurrency(staff.avgJobValue)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bars - Larger and more visible */}
                  <div className="space-y-3 mt-4">
                    {/* Completion Rate */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Completion Rate</span>
                        <span className="font-semibold text-tinedy-dark">
                          {staff.completionRate.toFixed(0)}%
                        </span>
                      </div>
                      <div
                        className="w-full bg-muted rounded-full h-2"
                        role="progressbar"
                        aria-label={`Completion Rate: ${Math.round(staff.completionRate)}%`}
                        aria-valuenow={Math.round(staff.completionRate)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(staff.completionRate, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Utilization Rate */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Utilization Rate</span>
                        <span className="font-semibold text-tinedy-dark">
                          {staff.utilizationRate.toFixed(0)}%
                        </span>
                      </div>
                      <div
                        className="w-full bg-muted rounded-full h-2"
                        role="progressbar"
                        aria-label={`Utilization Rate: ${Math.round(staff.utilizationRate)}%`}
                        aria-valuenow={Math.round(staff.utilizationRate)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className={`h-2 rounded-full transition-all ${utilization.color}`}
                          style={{ width: `${Math.min(staff.utilizationRate, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {utilization.emoji} {utilization.label}
                      </div>
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
              Show {remainingCount} More Staff
            </>
          )}
        </Button>
      )}
    </div>
  )
}
