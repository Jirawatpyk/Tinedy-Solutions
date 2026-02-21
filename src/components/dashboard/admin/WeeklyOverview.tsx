import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WeeklyBookingDay } from '@/types/dashboard'

interface WeeklyOverviewProps {
  days: WeeklyBookingDay[]
  loading?: boolean
  error?: boolean
}

export function WeeklyOverview({ days, loading = false, error = false }: WeeklyOverviewProps) {
  const maxCount = Math.max(...days.map((d) => d.count), 1) // ≥1 to avoid division by zero

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-tinedy-blue" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2" role="status" aria-label="Loading weekly overview">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-4 bg-muted rounded" />
                <div className="flex-1 h-4 bg-muted rounded" />
                <div className="w-4 h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-tinedy-blue" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="alert">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Unable to load weekly data</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-tinedy-blue" />
          This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available</p>
        ) : (
        <div className="space-y-2" role="list" aria-label="Bookings per day this week">
          {days.map((day) => (
            <div
              key={day.date}
              role="listitem"
              data-testid={day.isToday ? 'today-row' : `day-row-${day.dayLabel.toLowerCase()}`}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-1.5 text-sm',
                day.isToday && 'bg-tinedy-blue/5'
              )}
            >
              {/* Day label */}
              <span
                className={cn(
                  'w-8 shrink-0 font-medium',
                  day.isToday ? 'text-tinedy-blue' : 'text-muted-foreground'
                )}
              >
                {day.dayLabel}
              </span>

              {/* Progress bar */}
              <div
                className="flex-1 h-2 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={day.count}
                aria-valuemax={maxCount}
                aria-label={`${day.dayLabel}: ${day.count} booking${day.count !== 1 ? 's' : ''}`}
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-[width]',
                    day.count === 0
                      ? 'bg-transparent'
                      : day.isToday
                        ? 'bg-tinedy-blue'
                        : 'bg-muted-foreground/40'
                  )}
                  style={{ width: `${(day.count / maxCount) * 100}%` }}
                />
              </div>

              {/* Count — show dash when 0 */}
              <span
                className={cn(
                  'w-4 text-right shrink-0 tabular-nums',
                  day.isToday
                    ? 'font-semibold text-tinedy-blue'
                    : 'text-muted-foreground'
                )}
                aria-hidden="true"
              >
                {day.count > 0 ? day.count : '—'}
              </span>
            </div>
          ))}
        </div>
        )}
      </CardContent>
    </Card>
  )
}
