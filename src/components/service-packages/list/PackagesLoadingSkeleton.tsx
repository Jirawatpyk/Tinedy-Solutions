import { memo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/common/StatCard/StatCard'
import { PageHeader } from '@/components/common/PageHeader'

/**
 * Props for PackagesLoadingSkeleton component
 */
export interface PackagesLoadingSkeletonProps {
  /**
   * Whether the user has permission to create new packages
   * Controls visibility of the disabled "New Package" button
   */
  canCreate: boolean
}

/**
 * PackagesLoadingSkeleton - Loading skeleton for service packages page
 *
 * Displays a full-page skeleton with:
 * - Page header with optional disabled create button
 * - 3 stat cards in loading state
 * - Filters skeleton (search + 2 dropdowns)
 * - 6 package card skeletons
 *
 * @example
 * ```tsx
 * // With create permission
 * <PackagesLoadingSkeleton canCreate={true} />
 *
 * // Without create permission
 * <PackagesLoadingSkeleton canCreate={false} />
 * ```
 */
function PackagesLoadingSkeletonComponent({
  canCreate,
}: PackagesLoadingSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Page header - Always show */}
      <PageHeader
        title="Service Packages"
        subtitle="Manage cleaning and training service packages"
        actions={
          canCreate ? (
            <Button className="bg-tinedy-blue hover:bg-tinedy-blue/90" disabled>
              <Plus className="h-4 w-4 mr-2" />
              New Package
            </Button>
          ) : undefined
        }
      />

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatCard key={i} title="" value={0} isLoading={true} />
        ))}
      </div>

      {/* Filters skeleton */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-full sm:w-48" />
            <Skeleton className="h-8 w-full sm:w-48" />
          </div>
        </CardContent>
      </Card>

      {/* Package cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

PackagesLoadingSkeletonComponent.displayName = 'PackagesLoadingSkeleton'

/**
 * Memoized PackagesLoadingSkeleton component
 * Re-renders only when canCreate prop changes
 */
export const PackagesLoadingSkeleton = memo(PackagesLoadingSkeletonComponent)
