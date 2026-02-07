import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface BookingTimelineSkeletonProps {
  className?: string
}

/**
 * Content-aware skeleton for BookingTimeline component.
 * Matches the timeline layout with shimmer animation.
 */
export function BookingTimelineSkeleton({ className }: BookingTimelineSkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg',
        className
      )}
      style={{ contain: 'paint' }}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />

      <div className="relative space-y-4 p-4">
        {/* Timeline header */}
        <Skeleton shimmer={false} className="h-5 w-32" />

        {/* Timeline items (3 typical entries) */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            {/* Timeline dot */}
            <div className="flex flex-col items-center">
              <Skeleton shimmer={false} className="h-3 w-3 rounded-full" />
              {i < 3 && <Skeleton shimmer={false} className="h-12 w-0.5" />}
            </div>
            {/* Content */}
            <div className="flex-1 space-y-1 pb-4">
              <Skeleton shimmer={false} className="h-4 w-24" />
              <Skeleton shimmer={false} className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
