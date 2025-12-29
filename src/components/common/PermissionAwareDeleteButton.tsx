/**
 * Permission-Aware Delete Button
 *
 * Smart delete button that shows different actions based on user permissions:
 * - Admin: Shows "Delete" button (hard delete)
 * - Manager: Shows "Cancel/Archive" button (soft delete)
 * - Others: Shows nothing
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Archive } from 'lucide-react'
import { ConfirmDialog } from './ConfirmDialog'
import { usePermissions } from '@/hooks/use-permissions'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { PermissionResource } from '@/types/common'

interface PermissionAwareDeleteButtonProps {
  /**
   * Resource being deleted (e.g., 'bookings', 'customers')
   */
  resource: PermissionResource

  /**
   * Display name for confirmation dialog
   */
  itemName: string

  /**
   * Hard delete callback (admin only)
   */
  onDelete?: () => void | Promise<void>

  /**
   * Soft delete/cancel callback (admin and manager)
   */
  onCancel?: () => void | Promise<void>

  /**
   * Button variant
   */
  variant?: 'default' | 'icon'

  /**
   * Button size
   */
  size?: 'default' | 'sm' | 'lg' | 'icon'

  /**
   * Button variant for the actual button element (outline, ghost, default)
   */
  buttonVariant?: 'default' | 'outline' | 'ghost'

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Custom text for cancel action (default: "Cancel")
   */
  cancelText?: string

  /**
   * Custom warning message (e.g., "This customer has 5 bookings that will be deleted")
   */
  warningMessage?: string

  /**
   * Disable the button (e.g., when item has related records)
   */
  disabled?: boolean

  /**
   * Tooltip message when button is disabled
   */
  disabledReason?: string
}

export function PermissionAwareDeleteButton({
  resource,
  itemName,
  onDelete,
  onCancel,
  variant = 'icon',
  size = 'icon',
  buttonVariant = 'ghost',
  className = '',
  cancelText = 'Cancel',
  warningMessage,
  disabled = false,
  disabledReason,
}: PermissionAwareDeleteButtonProps) {
  const { canDelete, canSoftDelete } = usePermissions()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Check permissions
  const hasDeletePermission = canDelete(resource)
  const hasCancelPermission = canSoftDelete(resource)

  // Determine what action to show
  const showDeleteButton = hasDeletePermission && onDelete
  const showCancelButton = !hasDeletePermission && hasCancelPermission && onCancel

  // If no permissions, don't render anything
  if (!showDeleteButton && !showCancelButton) {
    return null
  }

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      if (showDeleteButton && onDelete) {
        await onDelete()
      } else if (showCancelButton && onCancel) {
        await onCancel()
      }
      setConfirmOpen(false)
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Button content for delete action
  const DeleteButtonContent = () => (
    <>
      {variant === 'icon' ? (
        <Trash2 className="h-4 w-4 text-destructive" />
      ) : (
        <>
          <Trash2 className="h-4 w-4 mr-2 text-destructive" />
          Delete
        </>
      )}
    </>
  )

  // Button content for cancel action
  const CancelButtonContent = () => (
    <>
      {variant === 'icon' ? (
        <Archive className="h-4 w-4 text-orange-500" />
      ) : (
        <>
          <Archive className="h-4 w-4 mr-2 text-orange-500" />
          {cancelText}
        </>
      )}
    </>
  )

  const isDisabled = disabled || isProcessing

  const buttonElement = (
    <Button
      variant={buttonVariant}
      size={size}
      onClick={(e) => {
        e.stopPropagation()
        if (!isDisabled) {
          setConfirmOpen(true)
        }
      }}
      className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={isDisabled}
      title={isDisabled && disabledReason ? disabledReason : (showDeleteButton ? 'Delete (Admin only)' : `${cancelText} (Cancel/Archive)`)}
    >
      {showDeleteButton ? <DeleteButtonContent /> : <CancelButtonContent />}
    </Button>
  )

  return (
    <>
      {disabled && disabledReason ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{buttonElement}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{disabledReason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        buttonElement
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirm}
        title={showDeleteButton ? 'Delete Item?' : 'Archive Item?'}
        description={
          showDeleteButton
            ? `Are you sure you want to delete "${itemName}"? ${warningMessage ? warningMessage + ' ' : ''}This action cannot be undone.`
            : `Are you sure you want to archive "${itemName}"? The item will be hidden but can be restored by admin.`
        }
        confirmText={showDeleteButton ? 'Delete' : 'Archive'}
        cancelText="Cancel"
        variant={showDeleteButton ? 'destructive' : 'warning'}
      />
    </>
  )
}

/**
 * Simple wrapper for backward compatibility
 * Use PermissionAwareDeleteButton for new code
 */
export function DeleteWithPermissions(props: Omit<PermissionAwareDeleteButtonProps, 'onCancel'>) {
  return <PermissionAwareDeleteButton {...props} />
}
