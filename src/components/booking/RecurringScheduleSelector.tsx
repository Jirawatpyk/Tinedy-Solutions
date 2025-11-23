import { memo, useState, useEffect, useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar as CalendarIcon, AlertCircle, CheckCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BookingFrequency } from '@/types/service-package-v2'
import type { RecurringPattern } from '@/types/recurring-booking'
import { RecurringPattern as Pattern } from '@/types/recurring-booking'
import {
  validateRecurringDates
} from '@/lib/recurring-utils'
import { formatDate } from '@/lib/utils'

interface RecurringScheduleSelectorProps {
  /** ความถี่ที่เลือกจาก package (2, 4, 8) */
  frequency: BookingFrequency

  /** วันที่ที่เลือกไว้ */
  selectedDates: string[]

  /** Callback เมื่อเปลี่ยนวันที่ */
  onDatesChange: (dates: string[]) => void

  /** รูปแบบที่เลือก */
  pattern: RecurringPattern

  /** Callback เมื่อเปลี่ยนรูปแบบ */
  onPatternChange: (pattern: RecurringPattern) => void
}

/**
 * RecurringScheduleSelector Component
 *
 * Component สำหรับเลือกรูปแบบการสร้างตาราง recurring
 * - Auto mode: สร้างตารางอัตโนมัติ (monthly intervals)
 * - Custom mode: เลือกวันเองทั้งหมด
 *
 * @performance Memoized - re-render เฉพาะเมื่อ props เปลี่ยน
 */
const RecurringScheduleSelectorComponent = ({
  frequency,
  selectedDates,
  onDatesChange,
  pattern,
  onPatternChange
}: RecurringScheduleSelectorProps) => {
  const [mode, setMode] = useState<'auto' | 'custom'>('auto')
  const [startDate, setStartDate] = useState<string>('')
  const [customDates, setCustomDates] = useState<string[]>([])
  const [monthInterval, setMonthInterval] = useState<number>(1) // 1, 2, 3 เดือน

  // Sync mode with pattern prop (when receiving from parent)
  useEffect(() => {
    if (pattern === Pattern.Custom) {
      setMode('custom')
    } else {
      setMode('auto')
    }
  }, [pattern])

  // Sync selectedDates prop with customDates state (when mode is custom)
  useEffect(() => {
    if (mode === 'custom' && selectedDates.length > 0) {
      setCustomDates(selectedDates)
    }
  }, [mode, selectedDates])

  // ตรวจสอบความถูกต้องของวันที่
  const validation = validateRecurringDates(selectedDates, frequency)

  // กำหนด pattern ที่เหมาะสมตาม frequency (auto mode)
  // ทุก frequency ใช้ AutoMonthly (เดือนละ 1 ครั้ง)
  const autoPattern: RecurringPattern = Pattern.AutoMonthly

  // Generate dates แบบ auto ด้วย interval
  const handleAutoGenerate = useCallback((date: string, interval: number) => {
    try {
      const dates: string[] = []
      const start = new Date(date)

      for (let i = 0; i < frequency; i++) {
        const newDate = new Date(start)
        const monthsToAdd = i * interval
        newDate.setMonth(start.getMonth() + monthsToAdd)
        const dateStr = newDate.toISOString().split('T')[0]
        dates.push(dateStr)
      }

      onDatesChange(dates)
    } catch (error) {
      console.error('Error generating dates:', error)
      onDatesChange([])
    }
  }, [frequency, onDatesChange])

  // Auto-regenerate dates เมื่อ frequency, interval, หรือ startDate เปลี่ยน (ใน auto mode)
  useEffect(() => {
    if (mode === 'auto' && startDate) {
      handleAutoGenerate(startDate, monthInterval)
    }
  }, [mode, monthInterval, startDate, handleAutoGenerate])

  // จัดการการเปลี่ยน mode
  const handleModeChange = useCallback((newMode: 'auto' | 'custom') => {
    setMode(newMode)
    if (newMode === 'custom') {
      onPatternChange(Pattern.Custom)
      setCustomDates([])
      onDatesChange([])
    } else {
      onPatternChange(autoPattern)
      if (startDate) {
        // Generate dates ทันทีถ้ามี startDate อยู่แล้ว
        handleAutoGenerate(startDate, monthInterval)
      }
    }
  }, [autoPattern, onPatternChange, onDatesChange, startDate, monthInterval, handleAutoGenerate])

  // จัดการการเปลี่ยนวันที่เริ่มต้น (auto mode)
  const handleStartDateChange = useCallback((date: string) => {
    setStartDate(date)
    if (date) {
      handleAutoGenerate(date, monthInterval)
    }
  }, [monthInterval, handleAutoGenerate])

  // จัดการการเปลี่ยน interval
  const handleIntervalChange = useCallback((interval: string) => {
    const newInterval = parseInt(interval)
    setMonthInterval(newInterval)
    if (startDate) {
      handleAutoGenerate(startDate, newInterval)
    }
  }, [startDate, handleAutoGenerate])

  // จัดการการเพิ่มวันที่ (custom mode)
  const handleAddCustomDate = (date: string) => {
    if (!date) return
    if (customDates.includes(date)) {
      // ลบออกถ้ามีอยู่แล้ว (toggle)
      const newDates = customDates.filter(d => d !== date)
      setCustomDates(newDates)
      onDatesChange(newDates.sort())
    } else if (customDates.length < frequency) {
      // เพิ่มใหม่ถ้ายังไม่ครบ
      const newDates = [...customDates, date]
      setCustomDates(newDates)
      onDatesChange(newDates.sort())
    }
  }

  // ลบวันที่ออก
  const handleRemoveDate = (date: string) => {
    const newDates = customDates.filter(d => d !== date)
    setCustomDates(newDates)
    onDatesChange(newDates)
  }

  // วันที่วันนี้ (สำหรับ min date)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="flex items-center gap-4">
        <Label className="text-sm font-medium">Schedule Mode</Label>
        <RadioGroup
          value={mode}
          onValueChange={(v) => handleModeChange(v as 'auto' | 'custom')}
          className="flex items-center gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="auto" id="auto" />
            <Label htmlFor="auto" className="cursor-pointer font-normal text-sm">
              Auto Schedule (Monthly)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom" className="cursor-pointer font-normal text-sm">
              Custom Schedule
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Auto Mode */}
      {mode === 'auto' && (
        <div className="space-y-4 rounded-lg border p-4 bg-accent/10">
          {/* Interval Selector */}
          <div>
            <Label htmlFor="interval" className="text-sm font-medium">
              Interval
            </Label>
            <Select
              value={monthInterval.toString()}
              onValueChange={handleIntervalChange}
            >
              <SelectTrigger id="interval" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Every 1 month</SelectItem>
                <SelectItem value="2">Every 2 months</SelectItem>
                <SelectItem value="3">Every 3 months</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Will create {frequency} bookings, every {monthInterval} month{monthInterval > 1 ? 's' : ''}
            </p>
          </div>

          {/* Start Date Picker */}
          <div>
            <Label htmlFor="start-date" className="text-sm font-medium">
              Start Date *
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              min={today}
              className="mt-2"
            />
          </div>

          {/* Generated Dates Preview */}
          {selectedDates.length > 0 && (
            <div>
              <Label className="text-sm font-medium">
                Auto-generated Dates ({selectedDates.length}/{frequency} times)
              </Label>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedDates.map((date, index) => (
                  <div
                    key={date}
                    className="flex items-center gap-2 rounded border p-2 text-sm bg-white"
                  >
                    <Badge variant="outline" className="min-w-[50px] justify-center">
                      {index + 1}/{frequency}
                    </Badge>
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {formatDate(date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Mode */}
      {mode === 'custom' && (
        <div className="space-y-4 rounded-lg border p-4 bg-accent/10">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select all {frequency} dates
              (Selected: {customDates.length}/{frequency})
            </AlertDescription>
          </Alert>

          {/* Date Input */}
          <div>
            <Label htmlFor="custom-date" className="text-sm font-medium">
              Select Date
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="custom-date"
                type="date"
                min={today}
                onChange={(e) => handleAddCustomDate(e.target.value)}
                disabled={customDates.length >= frequency}
                className="flex-1"
              />
            </div>
          </div>

          {/* Selected Dates List */}
          {customDates.length > 0 && (
            <div>
              <Label className="text-sm font-medium">
                Selected Dates ({customDates.length}/{frequency})
              </Label>
              <div className="mt-2 space-y-2">
                {customDates.sort().map((date, index) => (
                  <div
                    key={date}
                    className="flex items-center justify-between rounded border p-2 text-sm bg-white"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="min-w-[50px] justify-center">
                        {index + 1}/{frequency}
                      </Badge>
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatDate(date)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveDate(date)}
                      className="text-red-600 hover:text-red-700 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Messages */}
      {selectedDates.length > 0 && (
        <>
          {validation.valid ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Schedule is valid! Ready to create {selectedDates.length} bookings
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {validation.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Memoized RecurringScheduleSelector
 *
 * Custom comparison function เพื่อ optimize re-renders
 * Re-render เฉพาะเมื่อ:
 * - frequency เปลี่ยน (2, 4, 8)
 * - selectedDates array เปลี่ยน (ความยาวหรือ item แรก)
 * - pattern เปลี่ยน (Auto/Custom)
 * - callback functions เปลี่ยน (ควร wrap ด้วย useCallback ฝั่ง parent)
 */
export const RecurringScheduleSelector = memo(
  RecurringScheduleSelectorComponent,
  (prevProps, nextProps) => {
    // Compare frequency
    if (prevProps.frequency !== nextProps.frequency) return false

    // Compare pattern
    if (prevProps.pattern !== nextProps.pattern) return false

    // Compare selectedDates array (deep comparison - check all elements)
    const datesEqual =
      prevProps.selectedDates.length === nextProps.selectedDates.length &&
      prevProps.selectedDates.every((date, index) => date === nextProps.selectedDates[index])

    // Return true to skip re-render, false to re-render
    return datesEqual
  }
)
