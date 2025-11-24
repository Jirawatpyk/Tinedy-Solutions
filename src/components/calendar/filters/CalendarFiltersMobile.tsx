/**
 * CalendarFiltersMobile Component
 *
 * Mobile filter UI with Bottom Sheet layout:
 * - Trigger button showing active filter count
 * - Bottom Sheet drawer with all filters
 * - Sections: Presets, Search, Date Range, Staff, Team, Status
 * - Apply/Clear actions
 * - Optimized with React Query for data fetching
 */

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, User, Users, BookmarkCheck } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FilterSearchBar } from './FilterSearchBar'
import { FilterDateRangePicker } from './FilterDateRangePicker'
import { FilterMultiSelect } from './FilterMultiSelect'
import { FilterPresets } from './FilterPresets'
import { staffQueryOptions } from '@/lib/queries/staff-queries'
import { teamQueryOptions } from '@/lib/queries/team-queries'
import { BOOKING_STATUSES } from '@/types/calendar-filters'
import type { UseCalendarFiltersReturn } from '@/hooks/useCalendarFilters'

interface CalendarFiltersMobileProps {
  /** Filter state and actions from useCalendarFilters hook */
  filterControls: UseCalendarFiltersReturn
  /** Callback to change current date based on preset (for date-based presets) */
  onPresetDateChange?: (preset: string) => void
}

export const CalendarFiltersMobile: React.FC<CalendarFiltersMobileProps> = ({
  filterControls,
  onPresetDateChange,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const { filters, hasActiveFilters, activeFilterCount } = filterControls

  // Fetch staff list for filter options
  const { data: staffList = [] } = useQuery(staffQueryOptions.listSimple('all'))

  // Fetch teams list for filter options
  const { data: teamsList = [] } = useQuery(teamQueryOptions.listSimple())

  // Convert staff list to filter options
  const staffOptions = useMemo(
    () =>
      staffList.map((staff) => ({
        value: staff.id,
        label: staff.full_name,
        description: staff.email,
        icon: <User className="h-3.5 w-3.5" />,
      })),
    [staffList]
  )

  // Convert teams list to filter options
  const teamsOptions = useMemo(
    () =>
      teamsList.map((team) => ({
        value: team.id,
        label: team.name,
        icon: <Users className="h-3.5 w-3.5" />,
      })),
    [teamsList]
  )

  // Status options from constants
  const statusOptions = useMemo(
    () =>
      BOOKING_STATUSES.map((status) => ({
        value: status.value,
        label: status.label,
        icon: <BookmarkCheck className="h-3.5 w-3.5" />,
      })),
    []
  )

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleClearAll = () => {
    filterControls.clearAll()
    handleClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-tinedy-blue text-white px-2 py-0.5 text-xs font-medium">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle>Filter Bookings</SheetTitle>
          <SheetDescription>
            Choose filters to refine your calendar view
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-140px)] mt-4">
          <div className="space-y-6 px-1">
            {/* Quick Presets */}
            <div>
              <h4 className="font-medium text-sm mb-3">Quick Filters</h4>
              <FilterPresets
                activePreset={filters.preset}
                onPresetChange={filterControls.setPreset}
                onPresetDateChange={onPresetDateChange}
                onClear={filterControls.clearAll}
                orientation="vertical"
                showDescriptions
              />
            </div>

            <Separator />

            {/* Search */}
            <div>
              <h4 className="font-medium text-sm mb-3">Search</h4>
              <FilterSearchBar
                value={filters.searchQuery}
                onChange={filterControls.setSearch}
                placeholder="Search by customer, phone, service..."
              />
            </div>

            <Separator />

            {/* Date Range */}
            <div>
              <h4 className="font-medium text-sm mb-3">Date Range</h4>
              <FilterDateRangePicker
                value={filters.dateRange}
                onChange={filterControls.setDateRange}
                placeholder="Select date range"
                className="w-full"
              />
            </div>

            <Separator />

            {/* Staff Filter */}
            <FilterMultiSelect
              label="Staff"
              icon={<User className="h-4 w-4" />}
              options={staffOptions}
              selectedValues={filters.staffIds}
              onToggle={filterControls.toggleStaff}
              emptyText="No staff available"
              maxHeight={200}
              showSelectAll
              showCount
              showClear
            />

            <Separator />

            {/* Team Filter */}
            <FilterMultiSelect
              label="Team"
              icon={<Users className="h-4 w-4" />}
              options={teamsOptions}
              selectedValues={filters.teamIds}
              onToggle={filterControls.toggleTeam}
              emptyText="No teams available"
              maxHeight={200}
              showSelectAll
              showCount
              showClear
            />

            <Separator />

            {/* Status Filter */}
            <FilterMultiSelect
              label="Status"
              icon={<BookmarkCheck className="h-4 w-4" />}
              options={statusOptions}
              selectedValues={filters.statuses}
              onToggle={filterControls.toggleStatus}
              maxHeight={200}
              showSelectAll
              showCount
              showClear
            />
          </div>
        </ScrollArea>

        <SheetFooter className="mt-4">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={handleClearAll}
              className="flex-1"
              disabled={!hasActiveFilters}
            >
              Clear All
            </Button>
            <Button onClick={handleClose} className="flex-1">
              Apply Filters
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
