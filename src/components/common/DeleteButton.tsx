import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from './ConfirmDialog'

interface DeleteButtonProps {
  itemName: string
  onDelete: () => void | Promise<void>
  variant?: 'default' | 'icon'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function DeleteButton({
  itemName,
  onDelete,
  variant = 'icon',
  size = 'icon',
  className = '',
}: DeleteButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirmDelete = async () => {
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
      />
    </>
  )
}
