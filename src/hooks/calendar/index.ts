/**
 * Calendar Hooks
 *
 * Exports all calendar-related hooks for use in the calendar page.
 *
 * Main entry point: useCalendarData (orchestrator hook)
 * Individual hooks: useCalendarDate, useCalendarActions
 *
 * @module hooks/calendar
 */

export { useCalendarDate } from './useCalendarDate'
export type { UseCalendarDateReturn } from './useCalendarDate'

export { useCalendarActions } from './useCalendarActions'
export type { UseCalendarActionsParams, UseCalendarActionsReturn } from './useCalendarActions'

export { useCalendarData } from './useCalendarData'
export type { CalendarData } from './useCalendarData'
