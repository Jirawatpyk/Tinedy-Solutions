/**
 * Staff Performance Table - Desktop View
 *
 * Table layout for staff performance comparison.
 * Shows on lg breakpoint and above.
 */

import * as React from 'react'
import { formatCurrency } from '@/lib/utils'
import type { StaffPerformanceProps } from './types'
import { getUtilizationInfo } from './types'

export function StaffPerformanceTable({ staffPerformance }: StaffPerformanceProps) {
  // Sort by revenue (descending)
  const sortedStaff = React.useMemo(
    () => [...staffPerformance].sort((a, b) => b.revenue - a.revenue),
    [staffPerformance]
  )

  if (sortedStaff.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No staff performance data available
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b">
          <tr className="text-left">
            <th className="pb-2 font-semibold text-sm text-muted-foreground whitespace-nowrap">
              Staff Name
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
              Total Jobs
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
              Completed
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
              Revenue
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
              Completion Rate
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
              Avg Job Value
            </th>
            <th className="pb-2 font-semibold text-sm text-muted-foreground text-right whitespace-nowrap">
              Utilization
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedStaff.map((staff) => {
            const utilization = getUtilizationInfo(staff.utilizationRate)

            return (
              <tr key={staff.id} className="border-b hover:bg-accent/20 transition-colors">
                <td className="py-3 text-sm font-medium whitespace-nowrap">
                  {staff.name}
                </td>
                <td className="py-3 text-sm text-right whitespace-nowrap">
                  {staff.totalJobs}
                </td>
                <td className="py-3 text-sm text-right text-green-600 whitespace-nowrap">
                  {staff.completedJobs}
                </td>
                <td className="py-3 text-sm font-semibold text-right text-tinedy-dark whitespace-nowrap">
                  {formatCurrency(staff.revenue)}
                </td>
                <td className="py-3 text-sm text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(staff.completionRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8">
                      {staff.completionRate.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="py-3 text-sm text-right text-muted-foreground whitespace-nowrap">
                  {formatCurrency(staff.avgJobValue)}
                </td>
                <td className="py-3 text-sm text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${utilization.color}`}
                        style={{ width: `${Math.min(staff.utilizationRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8">
                      {staff.utilizationRate.toFixed(0)}%
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
