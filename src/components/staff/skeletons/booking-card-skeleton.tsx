import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface BookingCardSkeletonProps {
  className?: string
}

/**
 * Content-aware skeleton that matches SimplifiedBookingCard layout.
 * Uses shimmer animation from tailwind.config for visual polish.
 */
export function BookingCardSkeleton({ className }: BookingCardSkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/50 rounded-2xl',
        className
      )}
      style={{ contain: 'paint' }}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />

      {/* Status accent line - absolute positioned like real card */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-muted via-muted/50 to-transparent" />

      <div className="relative p-2.5 sm:p-4">
        {/* Header row - time + status badge */}
        <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Clock icon container */}
            <Skeleton shimmer={false} className="h-6 w-6 sm:h-7 sm:w-7 rounded-md" />
            {/* Time text */}
            <Skeleton shimmer={false} className="h-4 sm:h-5 w-24 sm:w-32" />
          </div>
          {/* Status badge */}
          <Skeleton shimmer={false} className="h-5 w-16 sm:w-20 rounded-full" />
        </div>

        {/* Customer info row - matching bg-muted/30 container */}
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 p-1.5 sm:p-2 rounded-lg bg-muted/30">
          {/* Avatar circle - matches h-7 w-7 sm:h-8 sm:w-8 */}
          <Skeleton shimmer={false} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full flex-shrink-0" />
          <div className="min-w-0 flex-1 space-y-1">
            {/* Customer name */}
            <Skeleton shimmer={false} className="h-3 sm:h-4 w-28 sm:w-36" />
            {/* Service name */}
            <Skeleton shimmer={false} className="h-2.5 sm:h-3 w-20 sm:w-24" />
          </div>
        </div>

        {/* Action buttons - single button (average case) */}
        <div className="flex gap-1.5 sm:gap-2">
          <Skeleton shimmer={false} className="flex-1 h-[32px] sm:h-[44px] rounded-md" />
        </div>
      </div>
    </div>
  )
}
