import { Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'

interface ArchiveButtonProps {
  itemName: string
  onArchive: () => void | Promise<void>
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'ghost'
  className?: string
  disabled?: boolean
}

/**
 * ArchiveButton Component
 *
 * A reusable button for archiving (soft deleting) items
 * Shows a confirmation dialog before archiving
 *
 * @param itemName - Display name for the confirmation dialog
 * @param onArchive - Callback function to execute when archive is confirmed
 * @param size - Button size (default: 'icon')
 * @param variant - Button variant (default: 'ghost')
 * @param className - Additional CSS classes
 * @param disabled - Whether the button is disabled
 */
export function ArchiveButton({
  itemName,
  onArchive,
  size = 'icon',
  variant = 'ghost',
  className = '',
  disabled = false
}: ArchiveButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onArchive()
      setConfirmOpen(false)
    } catch (error) {
      console.error('Archive error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={(e) => {
          e.stopPropagation()
          setConfirmOpen(true)
        }}
        className={className}
        disabled={disabled || isProcessing}
        title="Archive item"
      >
        <Archive className="h-4 w-4 text-orange-500" />
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirm}
        title={`Archive ${itemName}?`}
        description="This will archive the item. You can restore it later if needed."
        confirmText="Archive"
        cancelText="Cancel"
        variant="default"
      />
    </>
  )
}
