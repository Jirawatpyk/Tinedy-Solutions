import { memo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface LoadMoreCardProps {
  displayCount: number
  totalCount: number
  onLoadMore: () => void
}

function LoadMoreCardComponent({
  displayCount,
  totalCount,
  onLoadMore,
}: LoadMoreCardProps) {
  if (displayCount >= totalCount) {
    return null
  }

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
        Showing {Math.min(displayCount, totalCount)} of {totalCount} packages
      </p>
      <Button
        variant="outline"
        onClick={onLoadMore}
        className="gap-2"
        size="sm"
      >
        <Plus className="h-4 w-4" />
        Load More
      </Button>
    </div>
  )
}

LoadMoreCardComponent.displayName = 'LoadMoreCard'

export const LoadMoreCard = memo(LoadMoreCardComponent)
