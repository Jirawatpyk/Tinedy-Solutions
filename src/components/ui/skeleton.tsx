import { cn } from '@/lib/utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean
  delay?: number
}

function Skeleton({
  className,
  shimmer = true,
  delay = 0,
  style,
  ...props
}: SkeletonProps) {
  if (!shimmer) {
    return (
      <div
        className={cn('animate-pulse rounded-md bg-muted', className)}
        style={style}
        {...props}
      />
    )
  }

  return (
    <div
      className={cn('relative overflow-hidden rounded-md bg-muted', className)}
      style={{ contain: 'paint', ...style }}
      {...props}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
        style={delay ? { animationDelay: `${delay}ms` } : undefined}
      />
    </div>
  )
}

export { Skeleton }
