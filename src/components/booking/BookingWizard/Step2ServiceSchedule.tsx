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
 */

import { AlertTriangle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
  const { start_time, end_time, isMultiDay, isRecurring, validationErrors } = state

  const { data: packagesV2 = [], isLoading: packagesLoading } = useQuery(packageQueryOptions.v2)

  // End-before-start warning (AC3.7)
  const endBeforeStart = start_time && end_time && end_time < start_time

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold" tabIndex={-1}>ขั้นตอนที่ 2: บริการและวันเวลา</h2>

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

      {/* Date range picker */}
      <DateRangePicker state={state} dispatch={dispatch} />

      {/* Time inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="start_time" className="text-xs text-muted-foreground">
            เวลาเริ่มต้น <span className="text-destructive">*</span>
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
            เวลาสิ้นสุด
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
            {/* AC3.7: End-before-start inline warning */}
            {endBeforeStart && (
              <AlertTriangle className="absolute right-2 top-2.5 h-4 w-4 text-yellow-500" />
            )}
          </div>
          {endBeforeStart && (
            <p className="text-xs text-yellow-600">⚠️ เวลาสิ้นสุดน้อยกว่าเวลาเริ่มต้น</p>
          )}
        </div>
      </div>

      {/* Recurring option — disabled when multi-day */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm">การจองซ้ำ</Label>
          {isMultiDay && (
            <p className="text-xs text-muted-foreground">การจองหลายวันไม่รองรับการทำซ้ำ</p>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Switch
                  checked={isRecurring}
                  disabled={isMultiDay}
                  onCheckedChange={(checked) =>
                    dispatch({ type: 'TOGGLE_RECURRING', isRecurring: checked })
                  }
                  aria-label="เปิดใช้งานการจองซ้ำ"
                />
              </span>
            </TooltipTrigger>
            {isMultiDay && (
              <TooltipContent>การจองหลายวันไม่รองรับการทำซ้ำ</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
