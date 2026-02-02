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

export interface ListItemSkeletonProps {
  shimmer?: boolean
  delay?: number
  showAvatar?: boolean
  className?: string
}

export const ListItemSkeleton = memo(function ListItemSkeleton({
  shimmer = true,
  delay,
  showAvatar = true,
  className
}: ListItemSkeletonProps) {
  const content = (
    <div className={cn('flex items-center gap-3 p-3', className)}>
      {showAvatar && <Skeleton shimmer={false} className="h-10 w-10 rounded-full flex-shrink-0" />}
      <div className="flex-1 space-y-2">
        <Skeleton shimmer={false} className="h-4 w-3/4" />
        <Skeleton shimmer={false} className="h-3 w-1/2" />
      </div>
    </div>
  )

  return wrapWithShimmer(content, shimmer, delay)
})

ListItemSkeleton.displayName = 'ListItemSkeleton'
