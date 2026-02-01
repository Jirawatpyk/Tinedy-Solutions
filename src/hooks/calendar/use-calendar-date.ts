/**
 * useCalendarDate Hook
 *
 * จัดการ calendar navigation และ date selection
 *
 * Responsibilities:
 * - Calendar month navigation (prev/next/today)
 * - Date selection (single date or date range)
 * - Preset date changes (today, week, month, upcoming)
 * - Computed calendar days for rendering
 */

import { useState, useMemo, useCallback } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
} from 'date-fns'
import { BookingStatus } from '@/types/booking'

export interface UseCalendarDateReturn {
  // State
  currentDate: Date
  selectedDate: Date | null
  selectedDateRange: { start: Date; end: Date } | null

  // Computed Values
  monthStart: Date
  monthEnd: Date
  calendarDays: Date[]
  currentMonthYear: string

  // Actions
  setCurrentDate: (date: Date) => void
  setSelectedDate: (date: Date | null) => void
  setSelectedDateRange: (range: { start: Date; end: Date } | null) => void
  goToPreviousMonth: () => void
  goToNextMonth: () => void
  goToToday: () => void
  handlePresetDateChange: (preset: string) => void
  handleDateClick: (date: Date) => void
}

export function useCalendarDate(): UseCalendarDateReturn {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date; end: Date } | null>(null)

  // Computed: Month boundaries
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate])
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate])

  // Computed: Calendar days (including overflow from prev/next months)
  const calendarDays = useMemo(() => {
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [monthStart, monthEnd])

  // Computed: Current month and year display (e.g., "December 2025")
  const currentMonthYear = useMemo(() => {
    return format(currentDate, 'MMMM yyyy')
  }, [currentDate])

  // Navigation: Previous month
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate((prev) => subMonths(prev, 1))
  }, [])

  // Navigation: Next month
  const goToNextMonth = useCallback(() => {
    setCurrentDate((prev) => addMonths(prev, 1))
  }, [])

  // Navigation: Jump to today
  const goToToday = useCallback(() => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
    setSelectedDateRange(null)
  }, [])

  // Handle preset date changes (today, week, month, upcoming)
  const handlePresetDateChange = useCallback((preset: string) => {
    const today = new Date()

    switch (preset) {
      case 'today':
        setCurrentDate(today)
        setSelectedDate(today)
        setSelectedDateRange(null)
        break

      case 'week': {
        const weekStart = startOfWeek(today)
        const weekEnd = endOfWeek(today)
        setCurrentDate(today) // Keep calendar on current month
        setSelectedDate(null)
        setSelectedDateRange({ start: weekStart, end: weekEnd })
        break
      }

      case 'month': {
        const monthStart = startOfMonth(today)
        const monthEnd = endOfMonth(today)
        setCurrentDate(monthStart)
        setSelectedDate(null)
        setSelectedDateRange({ start: monthStart, end: monthEnd })
        break
      }

      case 'upcoming': {
        const upcomingEnd = new Date(today)
        upcomingEnd.setDate(today.getDate() + 30)
        setCurrentDate(today)
        setSelectedDate(null)
        setSelectedDateRange({ start: today, end: upcomingEnd })
        break
      }

      case BookingStatus.Pending:
      case BookingStatus.Confirmed:
        // Status presets: no date selection, show all matching
        setSelectedDate(null)
        setSelectedDateRange(null)
        break

      default:
        break
    }
  }, [])

  // Handle date click on calendar
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date)
    setSelectedDateRange(null)
  }, [])

  return {
    // State
    currentDate,
    selectedDate,
    selectedDateRange,

    // Computed Values
    monthStart,
    monthEnd,
    calendarDays,
    currentMonthYear,

    // Actions
    setCurrentDate,
    setSelectedDate,
    setSelectedDateRange,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    handlePresetDateChange,
    handleDateClick,
  }
}
