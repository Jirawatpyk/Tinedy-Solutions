import { memo } from 'react'
import { Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-6">
        <p className="text-sm text-muted-foreground mb-4">
          Showing {Math.min(displayCount, totalCount)} of {totalCount} packages
        </p>
        <Button
          variant="outline"
          onClick={onLoadMore}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Load More Packages
        </Button>
      </CardContent>
    </Card>
  )
}

LoadMoreCardComponent.displayName = 'LoadMoreCard'

export const LoadMoreCard = memo(LoadMoreCardComponent)
