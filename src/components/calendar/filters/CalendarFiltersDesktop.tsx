/**
 * CalendarFiltersDesktop Component
 *
 * Desktop filter UI layout with:
 * - Inline search bar and date picker
 * - Popover for advanced filters (Staff, Team, Status)
 * - Filter badges showing active filters
 * - Preset buttons
 * - Clear all functionality
 * - Optimized with React Query for data fetching
 */

import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, User, Users, BookmarkCheck, CreditCard, Archive } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { FilterSearchBar } from './FilterSearchBar'
import { FilterMultiSelect } from './FilterMultiSelect'
import { FilterBadge, FilterBadgeList } from './FilterBadge'
import { FilterPresets } from './FilterPresets'
import { staffQueryOptions } from '@/lib/queries/staff-queries'
import { teamQueryOptions } from '@/lib/queries/team-queries'
import { BOOKING_STATUSES, PAYMENT_STATUSES } from '@/types/calendar-filters'
import { useAuth } from '@/contexts/auth-context'
import { UserRole } from '@/types/common'
import type { UseCalendarFiltersReturn } from '@/hooks/useCalendarFilters'

interface CalendarFiltersDesktopProps {
  /** Filter state and actions from useCalendarFilters hook */
  filterControls: UseCalendarFiltersReturn
  /** Callback to change current date based on preset (for date-based presets) */
  onPresetDateChange?: (preset: string) => void
}

const CalendarFiltersDesktopComponent: React.FC<CalendarFiltersDesktopProps> = ({
  filterControls,
  onPresetDateChange,
}) => {
  const { filters, hasActiveFilters, activeFilterCount } = filterControls
  const { profile } = useAuth()
  const isAdmin = profile?.role === UserRole.Admin

  // Fetch staff list for filter options (only role = 'staff', exclude admin and manager)
  const { data: staffList = [] } = useQuery(staffQueryOptions.listSimple('staff'))

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

  // Get selected staff names for badges
  const selectedStaffNames = useMemo(
    () =>
      filters.staffIds
        .map((id) => staffList.find((s) => s.id === id)?.full_name)
        .filter(Boolean),
    [filters.staffIds, staffList]
  )

  // Get selected team names for badges
  const selectedTeamNames = useMemo(
    () =>
      filters.teamIds
        .map((id) => teamsList.find((t) => t.id === id)?.name)
        .filter(Boolean),
    [filters.teamIds, teamsList]
  )

  // Get selected status labels for badges
  const selectedStatusLabels = useMemo(
    () =>
      filters.statuses
        .map((status) => BOOKING_STATUSES.find((s) => s.value === status)?.label)
        .filter(Boolean),
    [filters.statuses]
  )

  // Get selected payment status labels for badges
  const selectedPaymentStatusLabels = useMemo(
    () =>
      filters.paymentStatuses
        .map((status) => PAYMENT_STATUSES.find((s) => s.value === status)?.label)
        .filter(Boolean),
    [filters.paymentStatuses]
  )

  return (
    <div className="space-y-4">
      {/* Top Row: Search, Date, Advanced Filters, Presets */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Bar */}
        <FilterSearchBar
          value={filters.searchQuery}
          onChange={filterControls.setSearch}
          placeholder="Search by customer, phone, service, staff..."
          className="flex-1 min-w-[250px]"
        />

        {/* Advanced Filters Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-tinedy-blue text-white px-2 py-0.5 text-xs font-medium">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="end">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm mb-1">Advanced Filters</h3>
              <p className="text-xs text-muted-foreground">
                Filter bookings by staff, team, and status
              </p>
            </div>

            {/* Scrollable content area */}
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-4">
                {/* Staff Filter */}
                <FilterMultiSelect
                  label="Staff"
                  icon={<User className="h-4 w-4" />}
                  options={staffOptions}
                  selectedValues={filters.staffIds}
                  onChange={filterControls.setStaff}
                  onToggle={filterControls.toggleStaff}
                  emptyText="No staff available"
                  maxHeight={400}
                  minHeight={150}
                  itemHeight={40}
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
                  onChange={filterControls.setTeam}
                  onToggle={filterControls.toggleTeam}
                  emptyText="No teams available"
                  maxHeight={300}
                  minHeight={100}
                  itemHeight={40}
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
                  maxHeight={250}
                  minHeight={100}
                  itemHeight={40}
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
                  minHeight={100}
                  itemHeight={40}
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
                        id="show-archived"
                        checked={filters.showArchived}
                        onCheckedChange={(checked) => filterControls.setArchived(checked === true)}
                      />
                      <Label htmlFor="show-archived" className="flex-1 cursor-pointer">
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
          </PopoverContent>
        </Popover>
      </div>

      {/* Presets Row */}
      <FilterPresets
        activePreset={filters.preset}
        onPresetChange={filterControls.setPreset}
        onPresetDateChange={onPresetDateChange}
        onClear={filterControls.clearAll}
        orientation="horizontal"
        showDescriptions={false}
      />

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <FilterBadgeList showClearAll onClearAll={filterControls.clearAll}>
          {/* Date Range Badge */}
          {filters.dateRange && (
            <FilterBadge
              label="Date"
              value={`${filters.dateRange.start.toLocaleDateString()} - ${filters.dateRange.end.toLocaleDateString()}`}
              onRemove={filterControls.clearDateRange}
              variant="primary"
            />
          )}

          {/* Search Query Badge */}
          {filters.searchQuery && (
            <FilterBadge
              label="Search"
              value={filters.searchQuery}
              onRemove={filterControls.clearSearch}
              variant="default"
            />
          )}

          {/* Staff Badges */}
          {selectedStaffNames.map((name, index) => (
            <FilterBadge
              key={`staff-${filters.staffIds[index]}`}
              label="Staff"
              value={name || 'Unknown'}
              onRemove={() => filterControls.toggleStaff(filters.staffIds[index])}
              icon={<User className="h-3 w-3" />}
              variant="secondary"
            />
          ))}

          {/* Team Badges */}
          {selectedTeamNames.map((name, index) => (
            <FilterBadge
              key={`team-${filters.teamIds[index]}`}
              label="Team"
              value={name || 'Unknown'}
              onRemove={() => filterControls.toggleTeam(filters.teamIds[index])}
              icon={<Users className="h-3 w-3" />}
              variant="secondary"
            />
          ))}

          {/* Status Badges */}
          {selectedStatusLabels.map((label, index) => (
            <FilterBadge
              key={`status-${filters.statuses[index]}`}
              label="Booking Status"
              value={label || 'Unknown'}
              onRemove={() => filterControls.toggleStatus(filters.statuses[index])}
              icon={<BookmarkCheck className="h-3 w-3" />}
              variant="success"
            />
          ))}

          {/* Payment Status Badges */}
          {selectedPaymentStatusLabels.map((label, index) => (
            <FilterBadge
              key={`payment-${filters.paymentStatuses[index]}`}
              label="Payment"
              value={label || 'Unknown'}
              onRemove={() => filterControls.togglePaymentStatus(filters.paymentStatuses[index])}
              icon={<CreditCard className="h-3 w-3" />}
              variant="warning"
            />
          ))}

          {/* Show Archived Badge - Admin Only */}
          {isAdmin && filters.showArchived && (
            <FilterBadge
              label=""
              value="Show Archived"
              onRemove={() => filterControls.setArchived(false)}
              icon={<Archive className="h-3 w-3" />}
              variant="destructive"
            />
          )}
        </FilterBadgeList>
      )}
    </div>
  )
}

export const CalendarFiltersDesktop = React.memo(CalendarFiltersDesktopComponent)
