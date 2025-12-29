/**
 * Permission-Aware Delete Button
 *
 * Smart delete button that shows different actions based on user permissions:
 * - Admin: Shows "Delete" button (hard delete)
 * - Manager: Shows "Cancel/Archive" button (soft delete)
 * - Others: Shows nothing
 *
 * Supports responsive mode: icon-only on mobile, full button on desktop
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Archive } from 'lucide-react'
import { ConfirmDialog } from './ConfirmDialog'
import { usePermissions } from '@/hooks/use-permissions'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
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
   * Button variant: 'icon' = icon only, 'default' = icon + text
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

  /**
   * Enable responsive mode: icon-only on mobile (< sm), full button on desktop
   * When true, ignores 'variant' prop and uses responsive behavior
   */
  responsive?: boolean

  /**
   * Breakpoint for responsive mode (default: 'sm')
   * 'sm' = 640px, 'md' = 768px, 'lg' = 1024px
   */
  responsiveBreakpoint?: 'sm' | 'md' | 'lg'
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
  responsive = false,
  responsiveBreakpoint = 'sm',
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

  const isDisabled = disabled || isProcessing

  // Tooltip text based on action and state
  const tooltipText = isDisabled && disabledReason
    ? disabledReason
    : showDeleteButton
      ? 'Delete (Admin only)'
      : `${cancelText}`

  const actionText = showDeleteButton ? 'Delete' : cancelText
  const iconColor = showDeleteButton ? 'text-destructive' : 'text-orange-500'
  const Icon = showDeleteButton ? Trash2 : Archive

  // Responsive breakpoint classes
  const breakpointHidden = {
    sm: 'sm:hidden',
    md: 'md:hidden',
    lg: 'lg:hidden',
  }
  const breakpointFlex = {
    sm: 'hidden sm:flex',
    md: 'hidden md:flex',
    lg: 'hidden lg:flex',
  }

  // Non-responsive mode (original behavior)
  if (!responsive) {
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
      >
        {variant === 'icon' ? (
          <Icon className={`h-4 w-4 ${iconColor}`} />
        ) : (
          <>
            <Icon className={`h-4 w-4 mr-2 ${iconColor}`} />
            {actionText}
          </>
        )}
      </Button>
    )

    return (
      <>
        <SimpleTooltip content={tooltipText}>
          <span className="inline-flex">{buttonElement}</span>
        </SimpleTooltip>

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

  // Responsive mode: icon on mobile, full button on desktop
  return (
    <>
      {/* Mobile: icon only with tooltip */}
      <SimpleTooltip content={tooltipText}>
        <span className={`inline-flex ${breakpointHidden[responsiveBreakpoint]}`}>
          <Button
            variant={buttonVariant}
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              if (!isDisabled) {
                setConfirmOpen(true)
              }
            }}
            className={`h-8 w-8 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isDisabled}
          >
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </Button>
        </span>
      </SimpleTooltip>

      {/* Desktop: full button with tooltip */}
      <SimpleTooltip content={isDisabled && disabledReason ? disabledReason : tooltipText}>
        <span className={`inline-flex ${breakpointFlex[responsiveBreakpoint]}`}>
          <Button
            variant={buttonVariant}
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              if (!isDisabled) {
                setConfirmOpen(true)
              }
            }}
            className={`h-9 ${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isDisabled}
          >
            <Icon className={`h-4 w-4 mr-2 ${iconColor}`} />
            {actionText}
          </Button>
        </span>
      </SimpleTooltip>

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
