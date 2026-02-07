import { memo } from 'react'
import { Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'

function PackagesEmptyStateComponent() {
  return (
    <Card>
      <CardContent>
        <EmptyState
          icon={Package}
          title="No packages found"
        />
      </CardContent>
    </Card>
  )
}

PackagesEmptyStateComponent.displayName = 'PackagesEmptyState'

export const PackagesEmptyState = memo(PackagesEmptyStateComponent)
