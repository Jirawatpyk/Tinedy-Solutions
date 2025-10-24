import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Trash2 } from 'lucide-react'

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
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={selectedBookings.length === totalBookings && totalBookings > 0}
          onCheckedChange={onToggleSelectAll}
        />
        <CardTitle className="font-display">
          All Bookings ({totalBookings})
        </CardTitle>
      </div>
      {selectedBookings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{selectedBookings.length} selected</Badge>
          <Select value={bulkStatus} onValueChange={onBulkStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={onBulkStatusUpdate}
            disabled={!bulkStatus}
          >
            Update
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onBulkExport}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onBulkDelete}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      )}
    </div>
  )
}
