/**
 * Step2ServiceSchedule — Package/pricing selector + date/time inputs
 *
 * Features:
 * - SmartPriceField for package/override/custom pricing
 * - DateRangePicker for single/multi-day selection
 * - Start/End time inputs with auto-calc (R7) and end-before-start warning
 * - A3: Loading skeleton while packages load
 * - S1: Empty state for no packages
 * - Recurring option (disabled when isMultiDay = true)
 * - Recurring UI: auto_monthly (N occurrences preview) or manual date picker
 */

import { useState, useEffect } from 'react'
import { format, addMonths, parseISO } from 'date-fns'
import { AlertTriangle, X, Plus } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useQuery } from '@tanstack/react-query'
import { packageQueryOptions } from '@/lib/queries/package-queries'
import { SmartPriceField, SmartPriceFieldSkeleton } from './SmartPriceField'
import { DateRangePicker } from './DateRangePicker'
import type { WizardState, WizardAction } from '@/hooks/use-booking-wizard'

interface Step2ServiceScheduleProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
}

export function Step2ServiceSchedule({ state, dispatch }: Step2ServiceScheduleProps) {
  const {
    start_time,
    end_time,
    isMultiDay,
    isRecurring,
    recurringPattern,
    recurringDates,
    booking_date,
    frequency,
    validationErrors,
  } = state

  const { data: packagesV2 = [], isLoading: packagesLoading } = useQuery(packageQueryOptions.v2)

  // Recurring is only available when frequency > 1
  const canRecur = (frequency ?? 0) > 1

  // Local state for manual date input only
  const [newDateInput, setNewDateInput] = useState('')

  // Auto-generate monthly dates: occurrences = frequency - 1 (booking_date + N future = frequency total)
  useEffect(() => {
    if (!isRecurring || recurringPattern !== 'auto_monthly' || !booking_date || !frequency || frequency <= 1) return
    const base = parseISO(booking_date)
    const dates = Array.from({ length: frequency - 1 }, (_, i) =>
      format(addMonths(base, i + 1), 'yyyy-MM-dd')
    )
    dispatch({ type: 'SET_RECURRING_DATES', dates })
  }, [isRecurring, recurringPattern, booking_date, frequency]) // dispatch omitted: useReducer dispatch is referentially stable

  // End-before-start warning — single-day only (multi-day allows overnight spans)
  const endBeforeStart = !isMultiDay && start_time && end_time && end_time < start_time

  function handleAddDate() {
    if (!newDateInput || recurringDates.includes(newDateInput)) return
    // Manual mode: total dates = frequency (each date = 1 booking)
    if (frequency && recurringDates.length >= frequency) return
    const allDates = [...recurringDates, newDateInput].sort()
    dispatch({ type: 'SET_RECURRING_DATES', dates: allDates })
    // Auto-sync: booking_date = earliest manual date so user picks dates in one place only
    if (recurringPattern === 'manual') {
      dispatch({ type: 'SET_BOOKING_DATE', date: allDates[0] })
    }
    setNewDateInput('')
  }

  function handleRemoveDate(date: string) {
    const remaining = recurringDates.filter((d) => d !== date)
    dispatch({ type: 'SET_RECURRING_DATES', dates: remaining })
    // Auto-sync: update booking_date to next earliest, or keep current if list is empty
    if (recurringPattern === 'manual' && remaining.length > 0) {
      dispatch({ type: 'SET_BOOKING_DATE', date: remaining[0] })
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold" tabIndex={-1}>Step 2: Service &amp; Schedule</h2>

      {/* Pricing section */}
      {packagesLoading ? (
        <SmartPriceFieldSkeleton />
      ) : (
        <SmartPriceField
          state={state}
          dispatch={dispatch}
          packages={packagesV2}
          packagesLoading={packagesLoading}
        />
      )}

      {/* Date range picker — hidden in manual recurring mode (dates come from manual list instead) */}
      {!(isRecurring && recurringPattern === 'manual') && (
        <DateRangePicker state={state} dispatch={dispatch} />
      )}

      {/* Time inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="start_time" className="text-xs text-muted-foreground">
            Start Time <span className="text-destructive">*</span>
          </Label>
          <Input
            id="start_time"
            type="time"
            value={start_time}
            onChange={(e) => dispatch({ type: 'SET_START_TIME', time: e.target.value })}
            className={validationErrors.start_time ? 'border-destructive' : undefined}
          />
          {validationErrors.start_time && (
            <p className="text-xs text-destructive">{validationErrors.start_time}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="end_time" className="text-xs text-muted-foreground">
            End Time
          </Label>
          <div className="relative">
            <Input
              id="end_time"
              type="time"
              value={end_time}
              onChange={(e) =>
                dispatch({ type: 'SET_END_TIME', time: e.target.value, manual: true })
              }
              className={endBeforeStart ? 'border-yellow-400' : undefined}
            />
            {endBeforeStart && (
              <AlertTriangle className="absolute right-2 top-2.5 h-4 w-4 text-yellow-500" />
            )}
          </div>
          {endBeforeStart && (
            <p className="text-xs text-yellow-600">⚠️ End time is before start time</p>
          )}
        </div>
      </div>

      {/* Recurring toggle — only available when frequency > 1 */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm">Recurring</Label>
          {isMultiDay ? (
            <p className="text-xs text-muted-foreground">Multi-day bookings do not support recurring</p>
          ) : !canRecur ? (
            <p className="text-xs text-muted-foreground">Select frequency &gt; 1 to enable</p>
          ) : null}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Switch
                  checked={isRecurring}
                  disabled={isMultiDay || !canRecur}
                  onCheckedChange={(checked) =>
                    dispatch({ type: 'TOGGLE_RECURRING', isRecurring: checked })
                  }
                  aria-label="Enable recurring booking"
                />
              </span>
            </TooltipTrigger>
            {(isMultiDay || !canRecur) && (
              <TooltipContent>
                {isMultiDay ? 'Multi-day bookings do not support recurring' : 'Select frequency > 1 to enable'}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Recurring detail — shown only when isRecurring = true */}
      {isRecurring && (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          {/* Pattern selector */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Repeat Pattern</Label>
            <RadioGroup
              value={recurringPattern}
              onValueChange={(v) => {
                const pattern = v as 'auto_monthly' | 'manual'
                dispatch({ type: 'SET_RECURRING_PATTERN', pattern })
                dispatch({ type: 'SET_RECURRING_DATES', dates: [] })
              }}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="auto_monthly" id="rp-auto" />
                <Label htmlFor="rp-auto" className="cursor-pointer text-sm">
                  Monthly (auto)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="manual" id="rp-manual" />
                <Label htmlFor="rp-manual" className="cursor-pointer text-sm">
                  Pick dates manually
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Auto monthly — dates auto-generated from frequency */}
          {recurringPattern === 'auto_monthly' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {frequency} bookings total (start date + {(frequency ?? 1) - 1} monthly)
              </p>
              {!booking_date ? (
                <p className="text-xs text-muted-foreground">Select a start date to preview</p>
              ) : recurringDates.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Future dates ({recurringDates.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recurringDates.map((d) => (
                      <Badge key={d} variant="secondary" className="text-xs">
                        {format(parseISO(d), 'dd/MM/yyyy')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {validationErrors.recurringDates && (
                <p className="text-xs text-destructive">{validationErrors.recurringDates}</p>
              )}
            </div>
          )}

          {/* Manual — date input + removable list, capped at frequency */}
          {recurringPattern === 'manual' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Add Date ({recurringDates.length}/{frequency ?? '?'})
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="h-9 flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddDate}
                  disabled={!newDateInput || (!!frequency && recurringDates.length >= frequency)}
                  className="h-9 px-3"
                  aria-label="Add date"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {recurringDates.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Selected dates ({recurringDates.length}/{frequency ?? '?'})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recurringDates.map((d) => (
                      <Badge
                        key={d}
                        variant="secondary"
                        className="text-xs flex items-center gap-1 pr-1"
                      >
                        {format(parseISO(d), 'dd/MM/yyyy')}
                        <button
                          type="button"
                          onClick={() => handleRemoveDate(d)}
                          className="hover:text-destructive transition-colors ml-0.5"
                          aria-label={`Remove date ${d}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {recurringDates.length === 0 && (
                <p className="text-xs text-muted-foreground">No dates selected yet</p>
              )}
              {validationErrors.recurringDates && (
                <p className="text-xs text-destructive">{validationErrors.recurringDates}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
