import { useCallback, useMemo, useState } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import type { PeakHourData, DayData, DayOfWeek } from './types'
import { DAYS_OF_WEEK, OPERATING_HOURS, DAY_NAMES, PEAK_HOURS_COLORS } from './types'
import { PeakHoursDetailModal } from './PeakHoursDetailModal'

interface PeakHoursMobileProps {
  data: PeakHourData[]
}

export function PeakHoursMobile({ data }: PeakHoursMobileProps) {
  const [selectedCell, setSelectedCell] = useState<PeakHourData | null>(null)

  // Early return for empty data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <p>No peak hours data available</p>
      </div>
    )
  }

  // Calculate max count for intensity calculation
  const maxCount = useMemo(() => {
    if (!data || data.length === 0) return 1
    return Math.max(...data.map((d) => d.count), 1)
  }, [data])

  // Group data by day
  const dayData = useMemo(() => {
    const grouped: DayData[] = DAYS_OF_WEEK.map((day) => {
      const dayBookings = data.filter((item) => item.day === day)
      const hours = Array.from(
        { length: OPERATING_HOURS.end - OPERATING_HOURS.start + 1 },
        (_, i) => {
          const hour = i + OPERATING_HOURS.start
          const booking = dayBookings.find((b) => b.hour === hour)
          const count = booking?.count || 0
          const intensity = count > 0 ? count / maxCount : 0
          return { hour, count, intensity }
        }
      ).filter((h) => h.count > 0) // Only show hours with bookings

      const totalBookings = dayBookings.reduce((sum, item) => sum + item.count, 0)

      return { day, hours, totalBookings }
    })

    // Sort by total bookings (busiest days first)
    return grouped.sort((a, b) => b.totalBookings - a.totalBookings)
  }, [data, maxCount])

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 0.8) return 'bg-tinedy-green text-white'
    if (intensity >= 0.6) return 'bg-tinedy-green/80 text-white'
    if (intensity >= 0.4) return 'bg-tinedy-green/60 text-tinedy-dark'
    if (intensity >= 0.2) return 'bg-tinedy-green/40 text-tinedy-dark'
    return 'bg-tinedy-green/20 text-tinedy-dark'
  }

  const handleHourClick = useCallback((day: string, hour: number, count: number) => {
    setSelectedCell({ day, hour, count })
  }, [])

  return (
    <>
      <Accordion type="single" collapsible className="w-full space-y-2">
        {dayData.map((day) => (
          <AccordionItem
            key={day.day}
            value={day.day}
            className="border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
              <div className="flex items-center justify-between w-full pr-2">
                <span className="font-semibold text-base text-tinedy-dark">
                  {DAY_NAMES[day.day as DayOfWeek]}
                </span>
                <Badge variant="secondary" className="ml-2">
                  {day.totalBookings} {day.totalBookings === 1 ? 'booking' : 'bookings'}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3">
              {day.hours.length > 0 ? (
                <div className="space-y-2">
                  {day.hours.map((hourData) => (
                    <button
                      key={`${day.day}-${hourData.hour}`}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-tinedy-green focus:ring-offset-1 ${getIntensityColor(hourData.intensity)}`}
                      onClick={() => handleHourClick(day.day, hourData.hour, hourData.count)}
                    >
                      <span className="font-medium text-sm">
                        {hourData.hour.toString().padStart(2, '0')}:00
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">
                          {hourData.count} {hourData.count === 1 ? 'booking' : 'bookings'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No bookings on this day
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Legend */}
      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
        <p className="text-xs font-semibold text-tinedy-dark mb-2">Intensity Legend</p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Less busy</span>
          <div className="flex gap-1 flex-1">
            {[0.2, 0.4, 0.6, 0.8, 1].map((intensity) => {
              const { r, g, b } = PEAK_HOURS_COLORS.baseColor
              return (
                <div
                  key={intensity}
                  className="flex-1 h-4 rounded"
                  style={{ backgroundColor: `rgba(${r}, ${g}, ${b}, ${intensity})` }}
                />
              )
            })}
          </div>
          <span className="text-muted-foreground">More busy</span>
        </div>
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
