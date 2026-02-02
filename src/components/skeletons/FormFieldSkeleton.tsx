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

export interface FormFieldSkeletonProps {
  shimmer?: boolean
  delay?: number
  className?: string
}

export const FormFieldSkeleton = memo(function FormFieldSkeleton({
  shimmer = true,
  delay,
  className
}: FormFieldSkeletonProps) {
  const content = (
    <div className={cn('space-y-2', className)}>
      <Skeleton shimmer={false} className="h-4 w-24" />
      <Skeleton shimmer={false} className="h-10 w-full" />
    </div>
  )

  return wrapWithShimmer(content, shimmer, delay)
})

FormFieldSkeleton.displayName = 'FormFieldSkeleton'
