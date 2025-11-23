/**
 * StatusBadgeEditor Component
 *
 * Inline status editor with Popover for quick status changes
 * Displays current status as a badge and opens Popover with radio group when clicked
 */

import React, { useState } from 'react'
import { Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { StatusChangeConfirmDialog } from './StatusChangeConfirmDialog'

// All status options with labels
const ALL_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'text-blue-800' },
  { value: 'in_progress', label: 'In Progress', color: 'text-purple-800' },
  { value: 'completed', label: 'Completed', color: 'text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-red-800' },
  { value: 'no_show', label: 'No Show', color: 'text-gray-800' },
] as const

interface StatusBadgeEditorProps {
  currentStatus: string
  onStatusChange: (newStatus: string) => Promise<void>
  disabled?: boolean
  availableStatuses?: string[] // Available status options (current + valid transitions)
}

export const StatusBadgeEditor: React.FC<StatusBadgeEditorProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
  availableStatuses,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(currentStatus)
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Filter status options based on availableStatuses prop
  const statusOptions = availableStatuses
    ? ALL_STATUS_OPTIONS.filter(option => availableStatuses.includes(option.value))
    : ALL_STATUS_OPTIONS

  const handleSubmit = async () => {
    if (selectedStatus === currentStatus) {
      setIsOpen(false)
      return
    }

    // Show confirmation dialog instead of directly updating
    setShowConfirmDialog(true)
  }

  const handleConfirm = async () => {
    setShowConfirmDialog(false)
    setIsLoading(true)
    try {
      await onStatusChange(selectedStatus)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to update status:', error)
      // Reset to current status on error
      setSelectedStatus(currentStatus)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelConfirm = () => {
    setShowConfirmDialog(false)
    // Don't close the popover, let user change their selection
  }

  const handleCancel = () => {
    setSelectedStatus(currentStatus)
    setIsOpen(false)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)

    if (open) {
      // Reset to current status when opening
      setSelectedStatus(currentStatus)
    }
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            className="text-xs font-medium uppercase px-2 py-0.5 rounded hover:opacity-70 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-tinedy-blue disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
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

      {/* Confirmation Dialog */}
      <StatusChangeConfirmDialog
        isOpen={showConfirmDialog}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
        currentStatus={currentStatus}
        newStatus={selectedStatus}
      />
    </>
  )
}
