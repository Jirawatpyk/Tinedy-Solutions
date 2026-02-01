import { memo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Info, User, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { BookingConflict } from '@/hooks/use-conflict-detection'

interface BookingConflictDialogProps {
  isOpen: boolean
  onClose: () => void
  onProceed: () => void
  conflicts: BookingConflict[]
  isEdit?: boolean
  getStatusBadge: (status: string) => JSX.Element
  formatTime: (time: string) => string
}

/**
 * BookingConflictDialog Component
 *
 * แสดง dialog เมื่อมี booking conflicts (staff/team ซ้ำเวลา)
 * ใช้ React.memo เพื่อป้องกัน unnecessary re-renders
 *
 * @performance Memoized - re-render เฉพาะเมื่อ props เปลี่ยน
 */
const BookingConflictDialogComponent = ({
  isOpen,
  onClose,
  onProceed,
  conflicts,
  getStatusBadge,
  formatTime,
}: BookingConflictDialogProps): JSX.Element => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-destructive">Booking Conflict Detected!</DialogTitle>
          <DialogDescription>
            The selected staff/team already has bookings at this time. Do you want to proceed anyway?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Alert className="bg-red-50 border-red-200">
            <Info className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <strong>Warning:</strong> Found {conflicts.length} conflicting booking{conflicts.length > 1 ? 's' : ''} on the same date and time.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            <h3 className="font-semibold">Conflicting Bookings:</h3>
            {conflicts.map((conflict) => (
              <div key={conflict.booking.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{conflict.booking.customers?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{conflict.booking.service_packages?.name}</p>
                    <p className="text-xs text-red-600 font-medium">
                      {formatDate(conflict.booking.booking_date)} • {formatTime(conflict.booking.start_time)} - {formatTime(conflict.booking.end_time || '')}
                    </p>
                    <p className="text-xs text-red-700 font-semibold">
                      {conflict.message}
                    </p>
                    {conflict.booking.profiles && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Staff: {conflict.booking.profiles.full_name}
                      </p>
                    )}
                    {conflict.booking.teams && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Team: {conflict.booking.teams.name}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(conflict.booking.status)}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onProceed}
            >
              Proceed Anyway
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Memoized BookingConflictDialog
 *
 * Custom comparison function เพื่อ optimize re-renders
 * Re-render เฉพาะเมื่อ:
 * - isOpen เปลี่ยน
 * - conflicts array เปลี่ยน (ความยาวหรือ item แรก)
 * - callback functions เปลี่ยน (ควร wrap ด้วย useCallback ฝั่ง parent)
 */
export const BookingConflictDialog = memo(
  BookingConflictDialogComponent,
  (prevProps, nextProps) => {
    // Compare isOpen first (most important)
    if (prevProps.isOpen !== nextProps.isOpen) return false

    // If dialog is closed, skip further comparison
    if (!nextProps.isOpen) return true

    // Compare conflicts array (shallow comparison)
    const conflictsEqual =
      prevProps.conflicts.length === nextProps.conflicts.length &&
      (prevProps.conflicts.length === 0 ||
        prevProps.conflicts[0].booking.id === nextProps.conflicts[0].booking.id)

    // Return true to skip re-render, false to re-render
    return conflictsEqual
  }
)
