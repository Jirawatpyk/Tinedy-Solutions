/**
 * Workload Distribution Mobile - Mobile View
 *
 * Horizontal bar chart layout for staff workload distribution.
 * Shows below lg breakpoint.
 * Features:
 * - Horizontal progress bars (easier to read on mobile)
 * - Color-coded bars matching desktop chart colors
 * - Percentage display
 * - Staff name truncation for long names
 */

import * as React from 'react'
import { CHART_COLORS } from '@/types/reports'

interface WorkloadItem {
  name: string
  value: number
}

interface WorkloadDistributionMobileProps {
  data: WorkloadItem[]
}

/** Color palette matching desktop Pie Chart */
const BAR_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.accent,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
]

export function WorkloadDistributionMobile({ data }: WorkloadDistributionMobileProps) {
  // Calculate total for percentage
  const total = React.useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data]
  )

  // Get max value for bar scaling
  const maxValue = React.useMemo(
    () => Math.max(...data.map(item => item.value), 1),
    [data]
  )

  if (data.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0
        const barWidth = (item.value / maxValue) * 100

        return (
          <div key={item.name} className="space-y-1">
            {/* Staff name and stats row */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Color indicator */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }}
                />
                {/* Staff name */}
                <span className="text-muted-foreground truncate">{item.name}</span>
              </div>
              {/* Stats */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="font-semibold text-tinedy-dark">{item.value} jobs</span>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  ({percentage.toFixed(0)}%)
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div
              className="w-full bg-gray-100 rounded-full h-2.5"
              role="progressbar"
              aria-label={`${item.name}: ${item.value} jobs (${percentage.toFixed(0)}%)`}
              aria-valuenow={Math.round(percentage)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                }}
              />
            </div>
          </div>
        )
      })}

      {/* Total summary */}
      <div className="pt-2 mt-2 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">Total</span>
          <span className="font-bold text-tinedy-dark">{total} jobs</span>
        </div>
      </div>
    </div>
  )
}
