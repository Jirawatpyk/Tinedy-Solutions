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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
    validationErrors,
  } = state

  const { data: packagesV2 = [], isLoading: packagesLoading } = useQuery(packageQueryOptions.v2)

  // Local state for recurring UI only
  // H2: Lazy init — restore from recurringDates.length so back-navigation doesn't reset
  const [occurrences, setOccurrences] = useState(() =>
    recurringPattern === 'auto_monthly' && recurringDates.length > 0
      ? recurringDates.length
      : 3
  )
  const [newDateInput, setNewDateInput] = useState('')

  // Auto-generate monthly dates when booking_date, occurrences, or pattern changes
  useEffect(() => {
    if (!isRecurring || recurringPattern !== 'auto_monthly' || !booking_date) return
    const base = parseISO(booking_date)
    const dates = Array.from({ length: occurrences }, (_, i) =>
      format(addMonths(base, i + 1), 'yyyy-MM-dd')
    )
    dispatch({ type: 'SET_RECURRING_DATES', dates })
  }, [isRecurring, recurringPattern, booking_date, occurrences]) // dispatch is stable — excluded intentionally

  // End-before-start warning — single-day only (multi-day allows overnight spans)
  const endBeforeStart = !isMultiDay && start_time && end_time && end_time < start_time

  function handleAddDate() {
    if (!newDateInput || recurringDates.includes(newDateInput)) return
    const sorted = [...recurringDates, newDateInput].sort()
    dispatch({ type: 'SET_RECURRING_DATES', dates: sorted })
    setNewDateInput('')
  }

  function handleRemoveDate(date: string) {
    dispatch({ type: 'SET_RECURRING_DATES', dates: recurringDates.filter((d) => d !== date) })
  }

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
            {endBeforeStart && (
              <AlertTriangle className="absolute right-2 top-2.5 h-4 w-4 text-yellow-500" />
            )}
          </div>
          {endBeforeStart && (
            <p className="text-xs text-yellow-600">⚠️ เวลาสิ้นสุดน้อยกว่าเวลาเริ่มต้น</p>
          )}
        </div>
      </div>

      {/* Recurring toggle */}
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

      {/* Recurring detail — shown only when isRecurring = true */}
      {isRecurring && (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          {/* Pattern selector */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">รูปแบบการทำซ้ำ</Label>
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
                  ทุกเดือน (อัตโนมัติ)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="manual" id="rp-manual" />
                <Label htmlFor="rp-manual" className="cursor-pointer text-sm">
                  เลือกวันเอง
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Auto monthly — occurrences + preview */}
          {recurringPattern === 'auto_monthly' && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                  จำนวนครั้ง
                </Label>
                <Select
                  value={String(occurrences)}
                  onValueChange={(v) => setOccurrences(Number(v))}
                >
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 6, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} ครั้ง
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!booking_date ? (
                <p className="text-xs text-muted-foreground">เลือกวันเริ่มต้นก่อนเพื่อดูตัวอย่าง</p>
              ) : recurringDates.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    วันที่จะจอง ({recurringDates.length} ครั้ง)
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
            </div>
          )}

          {/* Manual — date input + removable list */}
          {recurringPattern === 'manual' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">เพิ่มวันที่</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newDateInput}
                  min={booking_date || undefined}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDate()}
                  className="h-9 flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddDate}
                  disabled={!newDateInput}
                  className="h-9 px-3"
                  aria-label="เพิ่มวันที่"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {recurringDates.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    วันที่เลือก ({recurringDates.length} วัน)
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
                          aria-label={`ลบวันที่ ${d}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {recurringDates.length === 0 && (
                <p className="text-xs text-muted-foreground">ยังไม่ได้เลือกวันที่เพิ่มเติม</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
