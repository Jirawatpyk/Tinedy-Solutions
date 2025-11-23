import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { BookingFilterState } from '@/hooks/useBookingFilters'

interface AdvancedFiltersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: BookingFilterState
  updateFilter: <K extends keyof BookingFilterState>(key: K, value: BookingFilterState[K]) => void
  staffMembers: Array<{ id: string; full_name: string }>
  teams: Array<{ id: string; name: string }>
  onApply: () => void
  onReset: () => void
}

/**
 * Advanced Filters Modal Component
 *
 * Modal สำหรับฟิลเตอร์ขั้นสูงที่ใช้น้อย เพื่อลดความยุ่งเหยิงใน primary filters
 * รวม: Date Range, Staff/Team Assignment, Service Type
 */
export function AdvancedFiltersModal({
  open,
  onOpenChange,
  filters,
  updateFilter,
  staffMembers,
  teams,
  onApply,
  onReset
}: AdvancedFiltersModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Advanced Filters</DialogTitle>
          <DialogDescription>
            Filter bookings by custom date range, staff assignment, and more
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Custom Date Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Custom Date Range</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Assigned To (รวม Staff + Team) */}
          <div className="space-y-2">
            <Label htmlFor="assigned-to" className="text-sm font-medium">
              Assigned To
            </Label>
            <Select
              value={
                filters.staffId !== 'all' ? `staff:${filters.staffId}` :
                filters.teamId !== 'all' ? `team:${filters.teamId}` :
                'all'
              }
              onValueChange={(value) => {
                if (value === 'all') {
                  updateFilter('staffId', 'all')
                  updateFilter('teamId', 'all')
                } else if (value.startsWith('staff:')) {
                  updateFilter('staffId', value.replace('staff:', ''))
                  updateFilter('teamId', 'all')
                } else if (value.startsWith('team:')) {
                  updateFilter('teamId', value.replace('team:', ''))
                  updateFilter('staffId', 'all')
                }
              }}
            >
              <SelectTrigger id="assigned-to" className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (No Filter)</SelectItem>

                <SelectGroup>
                  <SelectLabel>Staff Members</SelectLabel>
                  <SelectItem value="staff:unassigned">Unassigned</SelectItem>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={`staff:${staff.id}`}>
                      {staff.full_name}
                    </SelectItem>
                  ))}
                </SelectGroup>

                <SelectGroup>
                  <SelectLabel>Teams</SelectLabel>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={`team:${team.id}`}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Filter by staff member or team assignment
            </p>
          </div>

          {/* Service Type */}
          <div className="space-y-2">
            <Label htmlFor="service-type" className="text-sm font-medium">
              Service Type
            </Label>
            <Select
              value={filters.serviceType}
              onValueChange={(value) => updateFilter('serviceType', value)}
            >
              <SelectTrigger id="service-type" className="h-9">
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onReset()
              onOpenChange(false)
            }}
          >
            Reset All
          </Button>
          <Button
            type="button"
            onClick={() => {
              onApply()
              onOpenChange(false)
            }}
          >
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
