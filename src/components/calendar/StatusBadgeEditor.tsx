/**
 * StatusBadgeEditor Component
 *
 * Inline status editor with Popover for quick status changes
 * Displays current status as a badge and opens Popover with radio group when clicked
 *
 * Note: This component does NOT show its own confirmation dialog.
 * The parent component (e.g., Calendar page via useCalendarActions) handles confirmation.
 */

import React, { useState } from 'react'
import { Check } from 'lucide-react'
import { useModalState } from '@/hooks/use-modal-state'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, type BookingStatus } from '@/constants/booking-status'

// Text colors for radio group labels
const STATUS_TEXT_COLORS: Record<BookingStatus, string> = {
  pending: 'text-yellow-800',
  confirmed: 'text-blue-800',
  in_progress: 'text-purple-800',
  completed: 'text-green-800',
  cancelled: 'text-red-800',
  no_show: 'text-gray-800',
}

// Build status options from constants
const ALL_STATUS_OPTIONS = (Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map(status => ({
  value: status,
  label: BOOKING_STATUS_LABELS[status],
  color: STATUS_TEXT_COLORS[status],
  badgeColor: BOOKING_STATUS_COLORS[status],
}))

interface StatusBadgeEditorProps {
  currentStatus: string
  onStatusChange: (newStatus: string) => Promise<void>
  disabled?: boolean
  availableStatuses?: string[] // Available status options (current + valid transitions)
}

export const StatusBadgeEditor: React.FC<StatusBadgeEditorProps> = ({
  currentStatus,
  onStatusChange,
  disabled: _disabled = false,
  availableStatuses,
}) => {
  const popover = useModalState()
  const [selectedStatus, setSelectedStatus] = useState(currentStatus)
  const [isLoading, setIsLoading] = useState(false)

  // Filter status options based on availableStatuses prop
  const statusOptions = availableStatuses
    ? ALL_STATUS_OPTIONS.filter(option => availableStatuses.includes(option.value))
    : ALL_STATUS_OPTIONS

  const handleSubmit = async () => {
    if (selectedStatus === currentStatus) {
      popover.close()
      return
    }

    // Close popover and call onStatusChange
    // The parent component (useCalendarActions) will handle the confirmation dialog
    setIsLoading(true)
    popover.close()
    try {
      await onStatusChange(selectedStatus)
    } catch (error) {
      console.error('Failed to update status:', error)
      // Reset to current status on error
      setSelectedStatus(currentStatus)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedStatus(currentStatus)
    popover.close()
  }

  const handleOpenChange = (open: boolean) => {
    popover.setIsOpen(open)

    if (open) {
      // Reset to current status when opening
      setSelectedStatus(currentStatus)
    } else {
      // Cleanup: reset selectedStatus when closing popover
      setSelectedStatus(currentStatus)
    }
  }

  return (
    <>
      <Popover open={popover.isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${BOOKING_STATUS_COLORS[currentStatus as keyof typeof BOOKING_STATUS_COLORS] || 'bg-gray-100 text-gray-800 border-gray-300'}`}
            title="Click to change status"
          >
            {currentStatus.replace('_', ' ')}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Change Status</h4>
              <p className="text-xs text-muted-foreground">
                Select a new status for this booking
              </p>
            </div>

            <RadioGroup value={selectedStatus} onValueChange={setSelectedStatus}>
              <div className="space-y-2">
                {statusOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label
                      htmlFor={option.value}
                      className={`flex-1 cursor-pointer text-sm ${option.color}`}
                    >
                      {option.label}
                      {option.value === currentStatus && (
                        <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                      )}
                    </Label>
                    {selectedStatus === option.value && (
                      <Check className="h-4 w-4 text-tinedy-blue" />
                    )}
                  </div>
                ))}
              </div>
            </RadioGroup>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1"
                size="sm"
              >
                {isLoading ? 'Updating...' : 'Update'}
              </Button>
              <Button
                onClick={handleCancel}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}
