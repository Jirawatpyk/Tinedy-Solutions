import { memo } from 'react'
import { Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'

function PackagesEmptyStateComponent() {
  return (
    <Card>
      <CardContent className="py-6">
        <EmptyState
          icon={Package}
          title="No packages found"
          className="py-6"
        />
      </CardContent>
    </Card>
  )
}

PackagesEmptyStateComponent.displayName = 'PackagesEmptyState'

export const PackagesEmptyState = memo(PackagesEmptyStateComponent)
