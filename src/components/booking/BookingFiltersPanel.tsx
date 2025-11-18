import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X, Calendar } from 'lucide-react'
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

export function BookingFiltersPanel({
  filters,
  updateFilter,
  resetFilters,
  hasActiveFilters,
  getActiveFilterCount,
  setQuickFilter,
  staffMembers,
  teams
}: BookingFiltersPanelProps) {
  return (
    <Card>
      <CardContent className="py-3 space-y-3">
        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Quick filters:</span>
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
            className="h-8 text-xs"
          >
            This Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickFilter('month')}
            className="h-8 text-xs"
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

        {/* Main Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customer/service..."
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              className="pl-10 h-8 text-xs"
            />
          </div>

          <div className="flex gap-2">
            <Input
              type="date"
              placeholder="From"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="flex-1 h-8 text-xs"
            />
            <Input
              type="date"
              placeholder="To"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="flex-1 h-8 text-xs"
            />
          </div>

          <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.serviceType} onValueChange={(value) => updateFilter('serviceType', value)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="cleaning">Cleaning</SelectItem>
              <SelectItem value="training">Training</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Additional Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select value={filters.staffId} onValueChange={(value) => updateFilter('staffId', value)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {staffMembers.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.teamId} onValueChange={(value) => updateFilter('teamId', value)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
