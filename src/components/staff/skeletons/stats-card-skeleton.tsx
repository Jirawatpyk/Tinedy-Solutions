import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface StatsCardSkeletonProps {
  className?: string
}

/**
 * Content-aware skeleton that matches StatsCard layout.
 * Uses shimmer animation from tailwind.config for visual polish.
 */
export function StatsCardSkeleton({ className }: StatsCardSkeletonProps) {
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

      <div className="relative p-2.5 tablet-landscape:p-2 sm:p-4 lg:p-6">
        <div className="flex items-center sm:items-start justify-between gap-2 tablet-landscape:gap-1 sm:gap-3">
          {/* Left column - title, value, description */}
          <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
            {/* Title */}
            <Skeleton className="h-2 tablet-landscape:h-1.5 sm:h-3 w-16 sm:w-20" />
            {/* Value */}
            <Skeleton className="h-6 tablet-landscape:h-4 sm:h-8 w-20 sm:w-24" />
            {/* Description - hidden on tablet-landscape */}
            <Skeleton className="h-2 tablet-landscape:hidden sm:h-3 w-12 sm:w-16" />
          </div>

          {/* Right - icon area */}
          <div className="shrink-0">
            <Skeleton className="h-8 w-8 tablet-landscape:h-6 tablet-landscape:w-6 sm:h-10 sm:w-10 rounded-lg sm:rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
