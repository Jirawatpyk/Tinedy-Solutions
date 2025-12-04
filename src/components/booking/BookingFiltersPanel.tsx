import { memo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, X, Calendar, SlidersHorizontal } from 'lucide-react'
import { AdvancedFiltersModal } from './AdvancedFiltersModal'
import type { BookingFilterState } from '@/hooks/useBookingFilters'

interface BookingFiltersPanelProps {
  filters: BookingFilterState
  updateFilter: <K extends keyof BookingFilterState>(key: K, value: BookingFilterState[K]) => void
  resetFilters: () => void
  hasActiveFilters: () => boolean
  getActiveFilterCount: () => number
  setQuickFilter: (period: 'today' | 'week' | 'month') => void
  staffMembers: Array<{ id: string; full_name: string }>
  teams: Array<{ id: string; name: string }>
}

/**
 * BookingFiltersPanel Component (Two-Tier Filter System)
 *
 * Primary Filters (Always Visible):
 * - Quick Filters (Today/Week/Month)
 * - Search (Customer/Service)
 * - Status
 *
 * Advanced Filters (Modal):
 * - Custom Date Range
 * - Assigned To (Staff + Team combined)
 * - Service Type
 *
 * @performance Memoized - re-render เฉพาะเมื่อ props เปลี่ยน
 */
const BookingFiltersPanelComponent = ({
  filters,
  updateFilter,
  resetFilters,
  hasActiveFilters,
  getActiveFilterCount,
  setQuickFilter,
  staffMembers,
  teams
}: BookingFiltersPanelProps) => {
  // Advanced Filters Modal state
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false)

  /**
   * Count active advanced filters (not including search and status)
   */
  const getAdvancedFilterCount = () => {
    let count = 0
    if (filters.dateFrom !== '' || filters.dateTo !== '') count++
    if (filters.staffId !== 'all' || filters.teamId !== 'all') count++
    if (filters.serviceType !== 'all') count++
    return count
  }

  /**
   * Handle advanced filters apply
   */
  const handleAdvancedApply = () => {
    // Modal will close automatically via onApply prop
  }

  /**
   * Handle advanced filters reset
   */
  const handleAdvancedReset = () => {
    updateFilter('dateFrom', '')
    updateFilter('dateTo', '')
    updateFilter('staffId', 'all')
    updateFilter('teamId', 'all')
    updateFilter('serviceType', 'all')
  }

  const advancedFilterCount = getAdvancedFilterCount()

  return (
    <>
      <Card>
        <CardContent className="py-3 px-4 sm:px-6 space-y-3">
          {/* Quick Filters + More Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Quick filters:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickFilter('today')}
                className="h-8 text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickFilter('week')}
                className="h-8 text-xs hidden sm:inline-flex"
              >
                This Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickFilter('month')}
                className="h-8 text-xs hidden sm:inline-flex"
              >
                This Month
              </Button>

              {hasActiveFilters() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8 text-xs text-destructive hover:text-destructive"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All ({getActiveFilterCount()})
                </Button>
              )}
            </div>

            {/* More Filters Button - ด้านขวาสุด */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdvancedModalOpen(true)}
              className="h-8 text-xs"
            >
              <SlidersHorizontal className="h-3 w-3 mr-1" />
              More Filters
              {advancedFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
                  {advancedFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Primary Filters: Search + Status + Payment */}
          {/* จอเล็ก: Search แถวบน, Status+Payment แถวล่าง (ข้างกัน) */}
          {/* จอปกติ: Search + Status + Payment อยู่แถวเดียวกัน */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer/service..."
                value={filters.searchQuery}
                onChange={(e) => updateFilter('searchQuery', e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>

            {/* Status + Payment */}
            <div className="grid grid-cols-2 sm:flex gap-2">
              {/* Status */}
              <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                <SelectTrigger className="h-9 text-sm sm:w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>

              {/* Payment Status */}
              <Select value={filters.paymentStatus} onValueChange={(value) => updateFilter('paymentStatus', value)}>
                <SelectTrigger className="h-9 text-sm sm:w-[150px]">
                  <SelectValue placeholder="All Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="pending_verification">Verifying</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters Modal */}
      <AdvancedFiltersModal
        open={isAdvancedModalOpen}
        onOpenChange={setIsAdvancedModalOpen}
        filters={filters}
        updateFilter={updateFilter}
        staffMembers={staffMembers}
        teams={teams}
        onApply={handleAdvancedApply}
        onReset={handleAdvancedReset}
      />
    </>
  )
}

/**
 * Memoized BookingFiltersPanel (Two-Tier System)
 *
 * Custom comparison function เพื่อ optimize re-renders
 * Re-render เฉพาะเมื่อ:
 * - Primary filters เปลี่ยน (searchQuery, status)
 * - Advanced filters เปลี่ยน (dateFrom, dateTo, staffId, teamId, serviceType)
 * - staffMembers หรือ teams เปลี่ยน
 * - callback functions เปลี่ยน (ควร wrap ด้วย useCallback ฝั่ง parent)
 */
export const BookingFiltersPanel = memo(
  BookingFiltersPanelComponent,
  (prevProps, nextProps) => {
    // Compare all filter values (both primary and advanced)
    const filtersEqual =
      prevProps.filters.searchQuery === nextProps.filters.searchQuery &&
      prevProps.filters.status === nextProps.filters.status &&
      prevProps.filters.paymentStatus === nextProps.filters.paymentStatus &&
      prevProps.filters.dateFrom === nextProps.filters.dateFrom &&
      prevProps.filters.dateTo === nextProps.filters.dateTo &&
      prevProps.filters.staffId === nextProps.filters.staffId &&
      prevProps.filters.teamId === nextProps.filters.teamId &&
      prevProps.filters.serviceType === nextProps.filters.serviceType

    // Compare staff members array (shallow comparison by length and first item)
    const staffEqual =
      prevProps.staffMembers.length === nextProps.staffMembers.length &&
      (prevProps.staffMembers.length === 0 ||
        prevProps.staffMembers[0].id === nextProps.staffMembers[0].id)

    // Compare teams array (shallow comparison by length and first item)
    const teamsEqual =
      prevProps.teams.length === nextProps.teams.length &&
      (prevProps.teams.length === 0 ||
        prevProps.teams[0].id === nextProps.teams[0].id)

    // Return true to skip re-render, false to re-render
    return filtersEqual && staffEqual && teamsEqual
  }
)
