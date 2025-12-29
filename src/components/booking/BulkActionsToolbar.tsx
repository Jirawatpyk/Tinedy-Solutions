import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { Download, Trash2, Archive, Check } from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'

interface BulkActionsToolbarProps {
  selectedBookings: string[]
  totalBookings: number
  bulkStatus: string
  onBulkStatusChange: (status: string) => void
  onToggleSelectAll: () => void
  onBulkStatusUpdate: () => void
  onBulkExport: () => void
  onBulkDelete: () => void
}

export function BulkActionsToolbar({
  selectedBookings,
  totalBookings,
  bulkStatus,
  onBulkStatusChange,
  onToggleSelectAll,
  onBulkStatusUpdate,
  onBulkExport,
  onBulkDelete
}: BulkActionsToolbarProps) {
  const { canDelete, canSoftDelete } = usePermissions()

  // Check permissions for bulk delete
  const hasDeletePermission = canDelete('bookings')
  const hasArchivePermission = canSoftDelete('bookings')

  return (
    <div className="flex flex-col gap-3">
      {/* Header: Checkbox + Title */}
      <div className="flex items-center gap-3">
        <Checkbox
          checked={selectedBookings.length === totalBookings && totalBookings > 0}
          onCheckedChange={onToggleSelectAll}
        />
        <CardTitle className="font-display text-base sm:text-lg">
          All Bookings ({totalBookings})
        </CardTitle>
      </div>

      {/* Bulk Actions - แสดงเมื่อเลือก */}
      {selectedBookings.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          {/* Left: Badge + Status dropdown + Update */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {selectedBookings.length} selected
            </Badge>
            <Select value={bulkStatus} onValueChange={onBulkStatusChange}>
              <SelectTrigger className="w-32 sm:w-40 h-8 text-xs sm:text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {/* Mobile: Icon only with tooltip */}
            <SimpleTooltip content="Update Status">
              <Button
                size="sm"
                onClick={onBulkStatusUpdate}
                disabled={!bulkStatus}
                className="h-8 w-8 p-0 sm:hidden"
              >
                <Check className="h-4 w-4" />
              </Button>
            </SimpleTooltip>
            {/* Desktop: Icon + text, no tooltip */}
            <Button
              size="sm"
              onClick={onBulkStatusUpdate}
              disabled={!bulkStatus}
              className="h-8 hidden sm:flex px-3"
            >
              <Check className="h-4 w-4 mr-1" />
              Update
            </Button>
          </div>

          {/* Right: Export + Delete/Archive */}
          <div className="flex items-center gap-2">
            {/* Mobile: Icon only with tooltip */}
            <SimpleTooltip content="Export to Excel">
              <Button
                size="sm"
                variant="outline"
                onClick={onBulkExport}
                className="h-8 w-8 p-0 sm:hidden"
              >
                <Download className="h-4 w-4" />
              </Button>
            </SimpleTooltip>
            {/* Desktop: Icon + text, no tooltip */}
            <Button
              size="sm"
              variant="outline"
              onClick={onBulkExport}
              className="h-8 hidden sm:flex px-3"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>

            {/* Permission-aware Delete/Archive button */}
            {hasDeletePermission && (
              <SimpleTooltip content="Delete selected bookings (Admin only)">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onBulkDelete}
                  className="h-8 w-8 sm:w-auto p-0 sm:px-3"
                >
                  <Trash2 className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </SimpleTooltip>
            )}

            {!hasDeletePermission && hasArchivePermission && (
              <SimpleTooltip content="Archive selected bookings (Manager)">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onBulkDelete}
                  className="h-8 w-8 sm:w-auto p-0 sm:px-3"
                >
                  <Archive className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Archive</span>
                </Button>
              </SimpleTooltip>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
