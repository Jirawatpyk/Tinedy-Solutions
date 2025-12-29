/**
 * CalendarFiltersMobile Component
 *
 * Mobile filter UI with Bottom Sheet layout:
 * - Trigger button showing active filter count
 * - Bottom Sheet drawer with all filters
 * - Sections: Presets, Search, Staff, Team, Status
 * - Apply/Clear actions
 * - Optimized with React Query for data fetching
 */

import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, User, Users, BookmarkCheck, CreditCard, Archive } from 'lucide-react'
import { useModalState } from '@/hooks/use-modal-state'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { FilterSearchBar } from './FilterSearchBar'
import { FilterMultiSelect } from './FilterMultiSelect'
import { FilterPresets } from './FilterPresets'
import { staffQueryOptions } from '@/lib/queries/staff-queries'
import { teamQueryOptions } from '@/lib/queries/team-queries'
import { BOOKING_STATUSES, PAYMENT_STATUSES } from '@/types/calendar-filters'
import { useAuth } from '@/contexts/auth-context'
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
  const sheet = useModalState()
  const { filters, hasActiveFilters, activeFilterCount } = filterControls
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

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

  // Payment status options from constants
  const paymentStatusOptions = useMemo(
    () =>
      PAYMENT_STATUSES.map((status) => ({
        value: status.value,
        label: status.label,
        icon: <CreditCard className="h-3.5 w-3.5" />,
      })),
    []
  )

  const handleClearAll = () => {
    filterControls.clearAll()
    sheet.close()
  }

  return (
    <Sheet open={sheet.isOpen} onOpenChange={sheet.setIsOpen}>
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

      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Filter Bookings</SheetTitle>
          <SheetDescription>
            Choose filters to refine your calendar view
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4">
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
              label="Booking Status"
              icon={<BookmarkCheck className="h-4 w-4" />}
              options={statusOptions}
              selectedValues={filters.statuses}
              onChange={filterControls.setStatus}
              onToggle={filterControls.toggleStatus}
              maxHeight={200}
              showSelectAll
              showCount
              showClear
            />

            <Separator />

            {/* Payment Status Filter */}
            <FilterMultiSelect
              label="Payment Status"
              icon={<CreditCard className="h-4 w-4" />}
              options={paymentStatusOptions}
              selectedValues={filters.paymentStatuses}
              onChange={filterControls.setPaymentStatus}
              onToggle={filterControls.togglePaymentStatus}
              maxHeight={200}
              showSelectAll
              showCount
              showClear
            />

            {/* Show Archived - Admin Only */}
            {isAdmin && (
              <>
                <Separator />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-archived-mobile"
                    checked={filters.showArchived}
                    onCheckedChange={(checked) => filterControls.setArchived(checked === true)}
                  />
                  <Label htmlFor="show-archived-mobile" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium">Show Archived</span>
                        <p className="text-xs text-muted-foreground">
                          Include soft-deleted bookings
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="mt-4 pb-6 flex-shrink-0">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={handleClearAll}
              className="flex-1"
              disabled={!hasActiveFilters}
            >
              Clear All
            </Button>
            <Button onClick={sheet.close} className="flex-1">
              Apply Filters
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
