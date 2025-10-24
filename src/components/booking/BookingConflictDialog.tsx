import React from 'react'
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
import type { BookingConflict } from '@/hooks/useConflictDetection'

interface BookingConflictDialogProps {
  isOpen: boolean
  onClose: () => void
  onProceed: () => void
  conflicts: BookingConflict[]
  isEdit?: boolean
  getStatusBadge: (status: string) => React.ReactElement
  formatTime: (time: string) => string
}

export function BookingConflictDialog({
  isOpen,
  onClose,
  onProceed,
  conflicts,
  getStatusBadge,
  formatTime,
}: BookingConflictDialogProps) {
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
