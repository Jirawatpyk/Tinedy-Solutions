import { useRef, useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, ArrowDown } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  className?: string
  contentClassName?: string
  threshold?: number
}

type RefreshState = 'idle' | 'pulling' | 'refreshing'

/**
 * Pull-to-Refresh wrapper component using native touch events.
 * Works on iOS Safari with proper touch handling.
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
  contentClassName,
  threshold = 60,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number>(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [state, setState] = useState<RefreshState>('idle')

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only track if we're at the top of the scroll container
    if (containerRef.current?.scrollTop === 0 && state === 'idle') {
      startYRef.current = e.touches[0].clientY
    }
  }, [state])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Don't process if not at top or already refreshing
    if (state === 'refreshing') return
    if (containerRef.current?.scrollTop !== 0) {
      setPullDistance(0)
      setState('idle')
      return
    }

    const currentY = e.touches[0].clientY
    const delta = currentY - startYRef.current

    // Only allow downward pull
    if (delta > 0 && startYRef.current > 0) {
      // Apply resistance to pull (diminishing returns as you pull further)
      const adjustedDelta = Math.min(delta * 0.5, threshold * 2)
      setPullDistance(adjustedDelta)
      setState('pulling')

      // Prevent default scroll behavior when pulling
      if (adjustedDelta > 10) {
        e.preventDefault()
      }
    }
  }, [state, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (state === 'pulling') {
      if (pullDistance >= threshold) {
        setState('refreshing')
        try {
          await onRefresh()
        } finally {
          setState('idle')
          setPullDistance(0)
        }
      } else {
        setState('idle')
        setPullDistance(0)
      }
    }
    startYRef.current = 0
  }, [state, pullDistance, threshold, onRefresh])

  const showIndicator = state !== 'idle' || pullDistance > 0
  const pullProgress = Math.min(pullDistance / threshold, 1)

  return (
    <div
      ref={containerRef}
      className={cn('overflow-y-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: 'pan-y',
        overscrollBehaviorY: 'none',
      }}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'flex items-center justify-center transition-all duration-200 overflow-hidden',
          showIndicator ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          height: showIndicator ? Math.max(pullDistance, state === 'refreshing' ? 48 : 0) : 0,
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        {state === 'refreshing' ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <ArrowDown
              className={cn(
                'h-5 w-5 text-muted-foreground transition-transform duration-200',
                pullProgress >= 1 && 'rotate-180 text-primary'
              )}
            />
            <span className="text-xs text-muted-foreground">
              {pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className={contentClassName}
        style={{
          transform: state === 'pulling' ? `translateY(${Math.min(pullDistance * 0.3, 20)}px)` : 'none',
          transition: state === 'pulling' ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
