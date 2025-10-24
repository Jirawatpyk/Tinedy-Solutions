import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const confirmButtonVariants = cva(
  '',
  {
    variants: {
      variant: {
        default: 'bg-tinedy-blue text-white hover:bg-tinedy-blue/90',
        danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        warning: 'bg-yellow-600 text-white hover:bg-yellow-600/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

/**
 * ConfirmDialog - Reusable confirmation dialog component
 *
 * A flexible dialog component for confirming user actions with different visual variants.
 * Supports loading states and async operations.
 *
 * @example
 * ```tsx
 * // Danger variant for delete actions
 * <ConfirmDialog
 *   open={isDeleteOpen}
 *   onOpenChange={setIsDeleteOpen}
 *   title="Delete Booking"
 *   description="Are you sure you want to delete this booking? This action cannot be undone."
 *   variant="danger"
 *   confirmLabel="Delete"
 *   onConfirm={handleDelete}
 *   isLoading={isDeleting}
 * />
 *
 * // Warning variant
 * <ConfirmDialog
 *   open={isWarningOpen}
 *   onOpenChange={setIsWarningOpen}
 *   title="Proceed with caution"
 *   description="This action may affect existing bookings."
 *   variant="warning"
 *   onConfirm={handleProceed}
 * />
 *
 * // Default variant with async operation
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Confirm Action"
 *   description="Do you want to proceed?"
 *   onConfirm={async () => {
 *     await performAction()
 *   }}
 * />
 * ```
 */
export interface ConfirmDialogProps extends VariantProps<typeof confirmButtonVariants> {
  /**
   * Whether the dialog is open
   */
  open: boolean

  /**
   * Callback when dialog open state changes
   */
  onOpenChange: (open: boolean) => void

  /**
   * Dialog title
   */
  title: string

  /**
   * Dialog description/message
   */
  description: string

  /**
   * Label for confirm button
   * @default "Confirm"
   */
  confirmLabel?: string

  /**
   * Label for cancel button
   * @default "Cancel"
   */
  cancelLabel?: string

  /**
   * Visual variant for the confirm button
   * @default "default"
   */
  variant?: 'default' | 'danger' | 'warning'

  /**
   * Callback when confirm button is clicked
   * Can be async for loading state management
   */
  onConfirm: () => void | Promise<void>

  /**
   * Optional callback when cancel button is clicked
   */
  onCancel?: () => void

  /**
   * Whether the dialog is in loading state
   * Disables buttons and shows spinner on confirm button
   */
  isLoading?: boolean
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) => {
  const handleConfirm = async () => {
    await onConfirm()
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(confirmButtonVariants({ variant }))}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

ConfirmDialog.displayName = 'ConfirmDialog'
