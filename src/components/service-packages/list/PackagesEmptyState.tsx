import { memo } from 'react'
import { Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

function PackagesEmptyStateComponent() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No packages found</p>
        </div>
      </CardContent>
    </Card>
  )
}

PackagesEmptyStateComponent.displayName = 'PackagesEmptyState'

export const PackagesEmptyState = memo(PackagesEmptyStateComponent)
