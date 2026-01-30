import { useState, useEffect, useRef } from 'react'
import { ToastAction } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

// F12 fix: Single source of truth for undo duration
export const UNDO_DURATION_MS = 5000

// L2 fix: Named constant for interval
const COUNTDOWN_CHECK_INTERVAL_MS = 100

interface UndoToastActionProps {
  onUndo: () => Promise<void> | void
  duration?: number // ms, default UNDO_DURATION_MS
  className?: string
}

export function UndoToastAction({
  onUndo,
  duration = UNDO_DURATION_MS,
  className,
}: UndoToastActionProps) {
  const [timeLeft, setTimeLeft] = useState(Math.floor(duration / 1000))
  // M1 fix: Track loading state internally to avoid stale closure
  const [isLoading, setIsLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const startTimeRef = useRef(Date.now())

  // F4/F9 fix: Function to clear interval
  const clearCountdown = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
  }

  useEffect(() => {
    // Use time-based calculation to prevent drift
    const updateCountdown = () => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const remaining = Math.max(0, Math.floor(duration / 1000) - elapsed)
      setTimeLeft(remaining)

      if (remaining <= 0) {
        clearCountdown()
      }
    }

    intervalRef.current = setInterval(updateCountdown, COUNTDOWN_CHECK_INTERVAL_MS)

    return clearCountdown
  }, [duration])

  const handleClick = async () => {
    // Prevent double-click
    if (isLoading) return

    // F9 fix: Clear countdown on click
    clearCountdown()

    // M1 fix: Track loading internally
    setIsLoading(true)
    try {
      await onUndo()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ToastAction
      altText="Undo"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'h-11 min-w-[80px] px-4 font-medium', // 44px touch target (WR4-4)
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'disabled:opacity-70',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        `Undo (${timeLeft}s)`
      )}
    </ToastAction>
  )
}
