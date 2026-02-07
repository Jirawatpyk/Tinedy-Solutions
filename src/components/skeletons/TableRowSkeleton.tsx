import { memo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface TableRowSkeletonProps {
  columns?: number
  className?: string
}

// NOTE: TableRowSkeleton deliberately uses pulse-only animation.
// Shimmer requires absolute positioning which breaks in table layout.
// Per-cell shimmer causes desynchronized animations (visual bug).
export const TableRowSkeleton = memo(function TableRowSkeleton({
  columns = 4,
  className
}: TableRowSkeletonProps) {
  return (
    <tr className={cn('border-b', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton shimmer={false} className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
})

TableRowSkeleton.displayName = 'TableRowSkeleton'
