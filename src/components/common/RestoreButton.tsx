import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface RestoreButtonProps {
  onRestore: () => void | Promise<void>
  size?: 'default' | 'sm' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  className?: string
  disabled?: boolean
  showText?: boolean
}

/**
 * RestoreButton Component
 *
 * A reusable button for restoring archived items
 * Styled with green color scheme to indicate positive action
 *
 * @param onRestore - Callback function to execute when restore is clicked
 * @param size - Button size (default: 'sm')
 * @param variant - Button variant (default: 'outline')
 * @param className - Additional CSS classes
 * @param disabled - Whether the button is disabled
 * @param showText - Whether to show "Restore" text next to icon (default: true)
 */
export function RestoreButton({
  onRestore,
  size = 'sm',
  variant = 'outline',
  className = '',
  disabled = false,
  showText = true
}: RestoreButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsProcessing(true)
    try {
      await onRestore()
    } catch (error) {
      console.error('Restore error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`border-green-500 text-green-700 hover:bg-green-50 ${className}`}
      title="Restore item"
    >
      <RotateCcw className={`h-4 w-4 ${showText ? 'mr-1' : ''}`} />
      {showText && 'Restore'}
    </Button>
  )
}
