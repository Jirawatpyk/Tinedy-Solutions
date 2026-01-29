import { useState, useRef, useEffect, type ReactNode } from 'react'
import { motion, useMotionValue, useTransform, useReducedMotion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

// Swipe configuration constants
const SWIPE_REVEAL_WIDTH = 100 // How far the card slides to reveal actions
const SWIPE_THRESHOLD = 50 // Minimum drag distance to trigger reveal
const SWIPE_IGNORE_THRESHOLD = 10 // Ignore tiny drags (likely accidental)
const DEBOUNCE_MS = 100 // Debounce rapid swipes

/**
 * SwipeableCard - A card wrapper that supports horizontal swipe-to-reveal gestures.
 *
 * @example
 * ```tsx
 * <SwipeableCard
 *   revealedContent={<Button>Action</Button>}
 *   onSwipeReveal={() => console.log('revealed')}
 * >
 *   <Card>Content</Card>
 * </SwipeableCard>
 * ```
 *
 * Features:
 * - Swipe left to reveal action buttons (50px threshold)
 * - Tap to reset when revealed
 * - Respects prefers-reduced-motion
 * - Supports controlled (isRevealed + onRevealChange) or uncontrolled mode
 */
interface SwipeableCardProps {
  /** Card content to display */
  children: ReactNode
  /** Callback when swipe reveals actions */
  onSwipeReveal?: () => void
  /** Callback when card resets to normal position */
  onSwipeReset?: () => void
  /** Content to show behind the card when swiped */
  revealedContent?: ReactNode
  /** Disable swipe functionality */
  disabled?: boolean
  /** Callback to reset other cards (for single-reveal behavior) */
  onResetOthers?: () => void
  /** Controlled revealed state */
  isRevealed?: boolean
  /** Callback for controlled state changes */
  onRevealChange?: (revealed: boolean) => void
}

export function SwipeableCard({
  children,
  onSwipeReveal,
  onSwipeReset,
  revealedContent,
  disabled = false,
  onResetOthers,
  isRevealed: controlledRevealed,
  onRevealChange,
}: SwipeableCardProps) {
  const [internalRevealed, setInternalRevealed] = useState(false)
  const isRevealed = controlledRevealed ?? internalRevealed
  const setIsRevealed = onRevealChange ?? setInternalRevealed

  const [isDragging, setIsDragging] = useState(false)
  const isDebouncingRef = useRef(false)
  const isMountedRef = useRef(true)
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-SWIPE_REVEAL_WIDTH, -SWIPE_THRESHOLD, 0], [1, 0.5, 0])
  const shouldReduceMotion = useReducedMotion()
  const dragStartX = useRef(0)
  const debounceRef = useRef<NodeJS.Timeout>()

  const handleDragStart = () => {
    setIsDragging(true)
    dragStartX.current = x.get()
  }

  const handleDragEnd = () => {
    if (isMountedRef.current) setIsDragging(false)
    if (disabled) return

    // Debounce rapid swipes using ref to avoid stale closure
    if (isDebouncingRef.current) return
    isDebouncingRef.current = true
    debounceRef.current = setTimeout(() => { isDebouncingRef.current = false }, DEBOUNCE_MS)

    const currentX = x.get()
    const dragDistance = Math.abs(currentX - dragStartX.current)

    // Only trigger reveal if drag was significant
    if (dragDistance < SWIPE_IGNORE_THRESHOLD) return

    try {
      if (currentX < -SWIPE_THRESHOLD) {
        onResetOthers?.()
        onSwipeReveal?.()
        setIsRevealed(true)
      } else {
        setIsRevealed(false)
        onSwipeReset?.()
      }
    } catch {
      setIsRevealed(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleTap = () => {
    // Don't trigger tap if we were dragging
    if (isDragging) return
    if (isRevealed) {
      setIsRevealed(false)
      try {
        onSwipeReset?.()
      } catch {
        // Ignore callback errors silently in production
      }
    }
  }

  // Simplified transition for reduced motion
  const springTransition = shouldReduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 300, damping: 30 }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Revealed content (behind the card) */}
      {revealedContent && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center pr-4"
          style={{ opacity }}
        >
          {revealedContent}
        </motion.div>
      )}

      {/* Swipe affordance indicator - visual only, no accessibility needed */}
      {!isRevealed && !disabled && (
        <div
          className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground/30 pointer-events-none"
          aria-hidden="true"
        >
          <ChevronRight className="h-4 w-4" />
        </div>
      )}

      {/* Main card content */}
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={{ left: -SWIPE_REVEAL_WIDTH, right: 0 }}
        dragElastic={shouldReduceMotion ? 0 : 0.1}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        animate={{ x: isRevealed ? -SWIPE_REVEAL_WIDTH : 0 }}
        transition={springTransition}
        style={{ x }}
        className="relative bg-card"
      >
        {children}
      </motion.div>
    </div>
  )
}
