import { useState, forwardRef } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from './ConfirmDialog'

interface DeleteButtonProps {
  itemName: string
  onDelete: () => void | Promise<void>
  variant?: 'default' | 'icon'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  /** Warning message to show in dialog */
  warningMessage?: string
  /** Disable the delete confirm button */
  disableConfirm?: boolean
}

export const DeleteButton = forwardRef<HTMLButtonElement, DeleteButtonProps>(({
  itemName,
  onDelete,
  variant = 'icon',
  size = 'icon',
  className = '',
  warningMessage,
  disableConfirm = false,
}, ref) => {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirmDelete = async () => {
    if (disableConfirm) return // Don't proceed if disabled
    setIsDeleting(true)
    try {
      await onDelete()
      setConfirmOpen(false)
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Button
        ref={ref}
        variant="ghost"
        size={size}
        onClick={(e) => {
          e.stopPropagation()
          setConfirmOpen(true)
        }}
        className={className}
        disabled={isDeleting}
      >
        {variant === 'icon' ? (
          <Trash2 className="h-4 w-4 text-destructive" />
        ) : (
          <>
            <Trash2 className="h-4 w-4 mr-2 text-destructive" />
            Delete
          </>
        )}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmDelete}
        title={`Are you sure you want to delete ${itemName}?`}
        description="This action cannot be undone. This will permanently delete the item from the system."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        warningMessage={warningMessage}
        disableConfirm={disableConfirm}
        isLoading={isDeleting}
      />
    </>
  )
})

DeleteButton.displayName = 'DeleteButton'
