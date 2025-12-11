/**
 * FilterDateRangePicker Component
 *
 * Date range picker with:
 * - Calendar UI with range selection (react-day-picker)
 * - Quick preset buttons (Today, This Week, This Month)
 * - Clear button
 * - Formatted date display
 * - Popover presentation
 */

import React from 'react'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { useModalState } from '@/hooks/use-modal-state'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DateRange } from 'react-day-picker'

interface FilterDateRangePickerProps {
  /** Current selected date range */
  value: { start: Date; end: Date } | null
  /** Callback when date range changes */
  onChange: (range: { start: Date; end: Date } | null) => void
  /** Placeholder text when no date selected */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
  /** Show quick preset buttons */
  showPresets?: boolean
  /** Custom className */
  className?: string
}

const FilterDateRangePickerComponent: React.FC<FilterDateRangePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date range',
  disabled = false,
  showPresets = true,
  className,
}) => {
  const popover = useModalState()

  // Convert to react-day-picker DateRange format
  const dateRange: DateRange | undefined = value
    ? { from: value.start, to: value.end }
    : undefined

  // Handle date range selection from calendar
  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onChange({ start: range.from, end: range.to })
    } else if (range?.from && !range?.to) {
      // Only start date selected, don't close yet
      return
    } else {
      onChange(null)
    }
  }

  // Quick preset handlers
  const handleToday = () => {
    const today = new Date()
    onChange({ start: today, end: today })
    popover.close()
  }

  const handleThisWeek = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const start = new Date(today)
    start.setDate(today.getDate() - dayOfWeek) // Sunday
    const end = new Date(start)
    end.setDate(start.getDate() + 6) // Saturday
    onChange({ start, end })
    popover.close()
  }

  const handleThisMonth = () => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    onChange({ start, end })
    popover.close()
  }

  // Clear date range
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  // Format display text
  const displayText = value
    ? `${format(value.start, 'MMM dd, yyyy')} - ${format(value.end, 'MMM dd, yyyy')}`
    : placeholder

  return (
    <Popover open={popover.isOpen} onOpenChange={popover.setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="flex-1 truncate">{displayText}</span>
          {value && !disabled && (
            <X
              className="h-4 w-4 ml-2 hover:bg-muted rounded-sm"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="space-y-3 p-3">
          {/* Quick Presets */}
          {showPresets && (
            <div className="flex gap-2 pb-3 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="flex-1 text-xs"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleThisWeek}
                className="flex-1 text-xs"
              >
                This Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleThisMonth}
                className="flex-1 text-xs"
              >
                This Month
              </Button>
            </div>
          )}

          {/* Calendar */}
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleSelect}
            numberOfMonths={2}
            defaultMonth={value?.start || new Date()}
            disabled={disabled}
          />

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onChange(null)
                popover.close()
              }}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={popover.close}
              className="flex-1"
              disabled={!value}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export const FilterDateRangePicker = React.memo(FilterDateRangePickerComponent)
