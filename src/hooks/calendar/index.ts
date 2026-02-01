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

export { useCalendarDate } from './use-calendar-date'
export type { UseCalendarDateReturn } from './use-calendar-date'

export { useCalendarActions } from './use-calendar-actions'
export type { UseCalendarActionsParams, UseCalendarActionsReturn } from './use-calendar-actions'

export { useCalendarData } from './use-calendar-data'
export type { CalendarData } from './use-calendar-data'
