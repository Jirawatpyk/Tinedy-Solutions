/**
 * Team Performance Table - Desktop View
 *
 * Table layout for team performance comparison.
 * Shows on lg breakpoint and above.
 */

import * as React from 'react'
import { Award } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { TeamPerformanceProps } from './types'
import { getCompletionInfo } from './types'

export function TeamPerformanceTable({ teamPerformance }: TeamPerformanceProps) {
  // Sort by revenue (descending)
  const sortedTeams = React.useMemo(
    () => [...teamPerformance].sort((a, b) => b.revenue - a.revenue),
    [teamPerformance]
  )

  if (sortedTeams.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No team performance data available
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b">
          <tr className="text-left">
            <th className="pb-2 font-semibold text-sm text-muted-foreground whitespace-nowrap">
              Rank
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground whitespace-nowrap">
              Team Name
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
              Members
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
              Total Jobs
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
              Completed
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
              In Progress
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
              Pending
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
              Revenue
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
              Rate
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
              Utilization
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTeams.map((team, index) => {
            const completion = getCompletionInfo(team.completionRate)

            return (
              <tr key={team.id} className="border-b hover:bg-accent/20 transition-colors">
                <td className="py-3 text-sm whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {index === 0 && <Award className="h-4 w-4 text-tinedy-yellow" />}
                    <span className={index === 0 ? 'font-bold text-tinedy-yellow' : ''}>
                      #{index + 1}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-sm font-medium whitespace-nowrap">{team.name}</td>
                <td className="py-3 text-sm text-right whitespace-nowrap">
                  <span className="inline-flex items-center justify-center rounded-full bg-tinedy-blue/10 px-2 py-1 text-xs font-medium text-tinedy-blue">
                    {team.memberCount}
                  </span>
                </td>
                <td className="py-3 text-sm text-right whitespace-nowrap">{team.totalJobs}</td>
                <td className="py-3 text-sm text-right text-green-600 font-semibold whitespace-nowrap">
                  {team.completed}
                </td>
                <td className="py-3 text-sm text-right text-blue-600 whitespace-nowrap">
                  {team.inProgress}
                </td>
                <td className="py-3 text-sm text-right text-yellow-600 whitespace-nowrap">
                  {team.pending}
                </td>
                <td className="py-3 text-sm font-bold text-right text-tinedy-dark whitespace-nowrap">
                  {formatCurrency(team.revenue)}
                </td>
                <td className="py-3 text-sm text-right whitespace-nowrap">
                  <span
                    className={`font-semibold ${
                      team.completionRate >= 80
                        ? 'text-green-600'
                        : team.completionRate >= 60
                        ? 'text-yellow-600'
                        : 'text-orange-600'
                    }`}
                  >
                    {team.completionRate.toFixed(0)}%
                  </span>
                </td>
                <td className="py-3 text-sm text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${completion.color}`}
                        style={{ width: `${Math.min(team.completionRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8">
                      {team.completionRate.toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
