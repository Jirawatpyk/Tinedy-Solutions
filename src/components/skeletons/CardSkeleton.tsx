import { memo, type ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function wrapWithShimmer(content: ReactNode, shimmer: boolean, delay?: number): ReactNode {
  if (!shimmer) return content
  return (
    <div className="relative overflow-hidden" style={{ contain: 'paint' }}>
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
        style={delay ? { animationDelay: `${delay}ms` } : undefined}
      />
      {content}
    </div>
  )
}

export interface CardSkeletonProps {
  shimmer?: boolean
  delay?: number
  className?: string
  variant?: 'default' | 'compact'
}

export const CardSkeleton = memo(function CardSkeleton({
  shimmer = true,
  delay,
  className,
  variant = 'default'
}: CardSkeletonProps) {
  const content = (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      {/* Header: title + badge */}
      <div className="flex items-center justify-between mb-3">
        <Skeleton shimmer={false} className="h-5 w-32" />
        <Skeleton shimmer={false} className="h-5 w-16 rounded-full" />
      </div>
      {/* Content area */}
      {variant === 'default' && (
        <div className="space-y-2">
          <Skeleton shimmer={false} className="h-4 w-full" />
          <Skeleton shimmer={false} className="h-4 w-3/4" />
        </div>
      )}
      {/* Footer: actions */}
      <div className="flex gap-2 mt-4">
        <Skeleton shimmer={false} className="h-8 w-20" />
        <Skeleton shimmer={false} className="h-8 w-8" />
      </div>
    </div>
  )

  return wrapWithShimmer(content, shimmer, delay)
})

CardSkeleton.displayName = 'CardSkeleton'
