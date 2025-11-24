/**
 * CalendarFilters Component (Adaptive)
 *
 * Main filter component that adapts to screen size:
 * - Desktop (md+): CalendarFiltersDesktop with inline layout
 * - Mobile (<md): CalendarFiltersMobile with Bottom Sheet
 *
 * Usage:
 * ```tsx
 * import { CalendarFilters } from '@/components/calendar/filters/CalendarFilters'
 * import { useCalendarFilters } from '@/hooks/useCalendarFilters'
 *
 * function Calendar() {
 *   const filterControls = useCalendarFilters()
 *
 *   return <CalendarFilters filterControls={filterControls} />
 * }
 * ```
 */

import React from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { CalendarFiltersDesktop } from './CalendarFiltersDesktop'
import { CalendarFiltersMobile } from './CalendarFiltersMobile'
import type { UseCalendarFiltersReturn } from '@/hooks/useCalendarFilters'

interface CalendarFiltersProps {
  /** Filter state and actions from useCalendarFilters hook */
  filterControls: UseCalendarFiltersReturn
  /** Callback to change current date based on preset (for date-based presets) */
  onPresetDateChange?: (preset: string) => void
}

/**
 * Adaptive CalendarFilters Component
 *
 * Automatically switches between Desktop and Mobile UI based on screen size
 * Memoized to prevent unnecessary re-renders
 */
const CalendarFiltersComponent: React.FC<CalendarFiltersProps> = ({
  filterControls,
  onPresetDateChange,
}) => {
  // Check if screen is desktop size (md breakpoint = 768px)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  return isDesktop ? (
    <CalendarFiltersDesktop
      filterControls={filterControls}
      onPresetDateChange={onPresetDateChange}
    />
  ) : (
    <CalendarFiltersMobile
      filterControls={filterControls}
      onPresetDateChange={onPresetDateChange}
    />
  )
}

export const CalendarFilters = React.memo(CalendarFiltersComponent)

// Export sub-components for direct usage if needed
export { CalendarFiltersDesktop } from './CalendarFiltersDesktop'
export { CalendarFiltersMobile } from './CalendarFiltersMobile'

// Export all filter components for external use
export { FilterSearchBar } from './FilterSearchBar'
export { FilterDateRangePicker } from './FilterDateRangePicker'
export { FilterMultiSelect } from './FilterMultiSelect'
export { FilterBadge, FilterBadgeList } from './FilterBadge'
export { FilterPresets, FilterPresetsCompact } from './FilterPresets'
