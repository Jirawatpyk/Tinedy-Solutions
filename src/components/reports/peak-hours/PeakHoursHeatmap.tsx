import { useMemo, useState } from 'react'
import type { PeakHourData, DayOfWeek } from './types'
import { DAYS_OF_WEEK, OPERATING_HOURS } from './types'
import { PeakHoursDetailModal } from './PeakHoursDetailModal'

interface PeakHoursHeatmapProps {
  data: PeakHourData[]
}

export function PeakHoursHeatmap({ data }: PeakHoursHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<PeakHourData | null>(null)

  // Calculate max count for intensity calculation
  const maxCount = useMemo(() => {
    return Math.max(...data.map((d) => d.count), 1) // Minimum 1 to avoid division by zero
  }, [data])

  // Create a lookup map for quick data access
  const dataMap = useMemo(() => {
    const map = new Map<string, number>()
    data.forEach((item) => {
      const key = `${item.day}-${item.hour}`
      map.set(key, item.count)
    })
    return map
  }, [data])

  const getCellData = (day: DayOfWeek, hour: number) => {
    const key = `${day}-${hour}`
    const count = dataMap.get(key) || 0
    const intensity = count > 0 ? count / maxCount : 0

    return { count, intensity }
  }

  const getBackgroundColor = (intensity: number, count: number) => {
    if (count === 0) return '#f3f4f6' // gray-100
    // Green gradient from light to dark based on intensity
    return `rgba(143, 185, 150, ${intensity * 0.8 + 0.2})` // tinedy-green
  }

  const getTextColor = (intensity: number) => {
    return intensity > 0.5 ? 'white' : '#374151' // gray-700
  }

  const handleCellClick = (day: DayOfWeek, hour: number, count: number) => {
    if (count > 0) {
      setSelectedCell({ day, hour, count })
    }
  }

  // Generate hours array
  const hours = Array.from(
    { length: OPERATING_HOURS.end - OPERATING_HOURS.start + 1 },
    (_, i) => i + OPERATING_HOURS.start
  )

  return (
    <>
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-8 gap-1 text-xs">
            {/* Header row */}
            <div className="p-2"></div>
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="p-2 text-center font-semibold text-tinedy-dark">
                {day}
              </div>
            ))}

            {/* Hour rows */}
            {hours.map((hour) => (
              <div key={hour} className="contents">
                <div className="p-2 font-semibold text-tinedy-dark">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {DAYS_OF_WEEK.map((day) => {
                  const { count, intensity } = getCellData(day, hour)
                  const bgColor = getBackgroundColor(intensity, count)
                  const textColor = getTextColor(intensity)

                  return (
                    <button
                      key={`${day}-${hour}`}
                      className="p-2 rounded text-center font-medium transition-all hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-tinedy-green focus:ring-offset-1 min-h-[44px]"
                      style={{
                        backgroundColor: bgColor,
                        color: textColor,
                      }}
                      onClick={() => handleCellClick(day, hour, count)}
                      title={`${day} ${hour.toString().padStart(2, '0')}:00 - ${count} bookings`}
                      disabled={count === 0}
                    >
                      {count > 0 ? count : ''}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less busy</span>
        <div className="flex gap-1">
          {[0.2, 0.4, 0.6, 0.8, 1].map((intensity) => (
            <div
              key={intensity}
              className="w-4 h-4 rounded"
              style={{ backgroundColor: `rgba(143, 185, 150, ${intensity})` }}
            />
          ))}
        </div>
        <span>More busy</span>
      </div>

      {/* Detail Modal */}
      <PeakHoursDetailModal
        data={selectedCell}
        open={selectedCell !== null}
        onClose={() => setSelectedCell(null)}
      />
    </>
  )
}
