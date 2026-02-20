/**
 * DateRangePicker — Single/multi-day date selector for booking wizard
 *
 * Features:
 * - Toggle switch for single vs multi-day
 * - EC-D6: Warning banner when range > 90 days (non-blocking)
 * - EC-D7: Resetting multi-day clears end_date via reducer
 * - Shows live "X days" badge when multi-day selected
 */

import { differenceInDays } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { WizardState, WizardAction } from '@/hooks/use-booking-wizard'

/** Warn admin when booking duration exceeds this threshold (non-blocking) */
const MAX_BOOKING_DAYS_WARNING = 90

interface DateRangePickerProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
}

export function DateRangePicker({ state, dispatch }: DateRangePickerProps) {
  const { booking_date, end_date, isMultiDay, validationErrors } = state

  // Calculate number of days when multi-day
  const dayCount =
    isMultiDay && booking_date && end_date
      ? differenceInDays(
          new Date(end_date + 'T00:00:00'),
          new Date(booking_date + 'T00:00:00')
        ) + 1
      : null

  const isOver90Days = dayCount !== null && dayCount > MAX_BOOKING_DAYS_WARNING

  function handleToggleMultiDay(checked: boolean) {
    dispatch({ type: 'TOGGLE_MULTI_DAY', isMultiDay: checked })
  }

  return (
    <div className="space-y-3">
      {/* Multi-day toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Date</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Multi-day</span>
          <Switch
            checked={isMultiDay}
            onCheckedChange={handleToggleMultiDay}
            aria-label="Enable multi-day booking"
          />
        </div>
      </div>

      <div className={cn('grid gap-3', isMultiDay ? 'grid-cols-2' : 'grid-cols-1')}>
        {/* Start date */}
        <div className="space-y-1">
          <div className="h-5 flex items-center justify-between">
            <Label htmlFor="booking_date" className="text-xs text-muted-foreground">
              {isMultiDay ? 'Start Date' : 'Date'}
            </Label>
          </div>
          <Input
            id="booking_date"
            type="date"
            value={booking_date}
            onChange={(e) => dispatch({ type: 'SET_BOOKING_DATE', date: e.target.value })}
            className={cn(validationErrors.booking_date && 'border-destructive')}
          />
          {validationErrors.booking_date && (
            <p className="text-xs text-destructive">{validationErrors.booking_date}</p>
          )}
        </div>

        {/* End date — only when multi-day */}
        {isMultiDay && (
          <div className="space-y-1">
            <div className="h-5 flex items-center justify-between">
              <Label htmlFor="end_date" className="text-xs text-muted-foreground">
                End Date
              </Label>
              {dayCount !== null && dayCount > 0 && (
                <span className="text-xs font-semibold text-tinedy-blue bg-tinedy-blue/10 px-2 py-0.5 rounded-full">
                  {dayCount} days
                </span>
              )}
            </div>
            <Input
              id="end_date"
              type="date"
              value={end_date ?? ''}
              min={booking_date}
              onChange={(e) =>
                dispatch({ type: 'SET_END_DATE', date: e.target.value || null })
              }
              className={cn(validationErrors.end_date && 'border-destructive')}
            />
            {validationErrors.end_date && (
              <p className="text-xs text-destructive">{validationErrors.end_date}</p>
            )}
          </div>
        )}
      </div>

      {/* EC-D6: > 90 days warning (non-blocking) */}
      {isOver90Days && (
        <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Duration exceeds {MAX_BOOKING_DAYS_WARNING} days — please verify</span>
        </div>
      )}
    </div>
  )
}
