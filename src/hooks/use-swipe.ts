/**
 * useSwipe Hook
 *
 * Hook สำหรับ detect swipe gestures บน touch devices
 * ใช้สำหรับ navigation บนมือถือ
 */

import { useRef, useCallback } from 'react'

interface SwipeOptions {
  /** Minimum distance to trigger swipe (pixels) */
  threshold?: number
  /** Callback when swiping left */
  onSwipeLeft?: () => void
  /** Callback when swiping right */
  onSwipeRight?: () => void
  /** Callback when swiping up */
  onSwipeUp?: () => void
  /** Callback when swiping down */
  onSwipeDown?: () => void
}

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

export function useSwipe(options: SwipeOptions = {}): SwipeHandlers {
  const {
    threshold = 50,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } = options

  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const touchEndY = useRef<number>(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    // Initialize end position to start position (prevent false swipe on tap)
    touchEndX.current = e.touches[0].clientX
    touchEndY.current = e.touches[0].clientY
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
    touchEndY.current = e.touches[0].clientY
  }, [])

  const onTouchEnd = useCallback(() => {
    const deltaX = touchStartX.current - touchEndX.current
    const deltaY = touchStartY.current - touchEndY.current
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Determine if swipe is horizontal or vertical
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (absDeltaX > threshold) {
        if (deltaX > 0) {
          // Swipe left
          onSwipeLeft?.()
        } else {
          // Swipe right
          onSwipeRight?.()
        }
      }
    } else {
      // Vertical swipe
      if (absDeltaY > threshold) {
        if (deltaY > 0) {
          // Swipe up
          onSwipeUp?.()
        } else {
          // Swipe down
          onSwipeDown?.()
        }
      }
    }

    // Reset
    touchStartX.current = 0
    touchStartY.current = 0
    touchEndX.current = 0
    touchEndY.current = 0
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  }
}
