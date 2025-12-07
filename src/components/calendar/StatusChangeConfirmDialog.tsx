/**
 * StatusChangeConfirmDialog Component
 *
 * Confirmation dialog for booking status changes
 * Shows appropriate warning messages for critical status transitions
 */

import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle } from 'lucide-react'
import { getStatusLabel } from '@/lib/booking-utils'

interface StatusChangeConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  currentStatus: string
  newStatus: string
}

// Get appropriate message and warning for status transition
const getTransitionMessage = (currentStatus: string, newStatus: string) => {
  const isFinalState = ['cancelled', 'no_show', 'completed'].includes(newStatus)

  const messages: Record<string, Record<string, { title: string; description: string; warning?: string }>> = {
    pending: {
      confirmed: {
        title: 'Confirm Booking',
        description: 'Are you sure you want to confirm this booking?',
      },
      cancelled: {
        title: 'Cancel Booking',
        description: 'Are you sure you want to cancel this booking?',
        warning: 'This action cannot be undone. The booking will be marked as cancelled.',
      },
    },
    confirmed: {
      in_progress: {
        title: 'Start Booking',
        description: 'Mark this booking as in progress?',
      },
      cancelled: {
        title: 'Cancel Booking',
        description: 'Are you sure you want to cancel this confirmed booking?',
        warning: 'This action cannot be undone. The booking will be marked as cancelled.',
      },
      no_show: {
        title: 'Mark as No-Show',
        description: 'Mark this booking as no-show?',
        warning: 'This action cannot be undone. The booking will be marked as no-show.',
      },
    },
    in_progress: {
      completed: {
        title: 'Complete Booking',
        description: 'Mark this booking as completed?',
        warning: 'Please ensure the service has been completed and payment has been received.',
      },
      cancelled: {
        title: 'Cancel Booking',
        description: 'Are you sure you want to cancel this in-progress booking?',
        warning: 'This action cannot be undone. The booking will be marked as cancelled.',
      },
    },
  }

  return messages[currentStatus]?.[newStatus] || {
    title: 'Change Status',
    description: `Change status from "${getStatusLabel(currentStatus)}" to "${getStatusLabel(newStatus)}"?`,
    warning: isFinalState ? 'This action cannot be undone.' : undefined,
  }
}

export const StatusChangeConfirmDialog: React.FC<StatusChangeConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  currentStatus,
  newStatus,
}) => {
  const message = getTransitionMessage(currentStatus, newStatus)

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {message.warning && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
            {message.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>{message.description}</p>
            {message.warning && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800 font-medium flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{message.warning}</span>
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
