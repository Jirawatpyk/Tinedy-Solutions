/**
 * PackagesGrid Component - Service Packages Display Grid
 *
 * Component แสดงแพ็คเก็จในรูปแบบ Grid พร้อมปุ่ม Load More
 * รองรับทั้ง V1 (Fixed Pricing) และ V2 (Tiered Pricing)
 *
 * Features:
 * - Grid layout responsive (1 col mobile, 2 col tablet, 3 col desktop)
 * - Empty state display
 * - Load more functionality
 * - Handles both unified and tiered packages
 */

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, Plus } from 'lucide-react'
import { PackageCard } from '@/components/service-packages/PackageCard'
import type { ServicePackageV2WithTiers } from '@/types'
import { ServiceCategory, PricingModel } from '@/types'

/**
 * Unified package type combining V1 and V2 packages
 * Includes source tracking and soft delete support
 */
export interface UnifiedPackage extends ServicePackageV2WithTiers {
  /** Track whether this is V1 or V2 package */
  _source: 'v1' | 'v2'
  /** Soft delete timestamp */
  deleted_at?: string | null
}

/**
 * Props for PackagesGrid component
 */
export interface PackagesGridProps {
  /** Array of packages to display */
  packages: UnifiedPackage[]
  /** Number of packages to display initially */
  displayCount: number
  /** Callback when load more button is clicked */
  onLoadMore: () => void
  /** Map of package IDs to booking counts */
  bookingCounts: Record<string, number>
  /** Whether to show action buttons */
  showActions: boolean
  /** Edit handler for V2 tiered packages */
  onEdit: (pkg: ServicePackageV2WithTiers) => void
  /** Edit handler for unified packages (V1 or V2 fixed) */
  onEditUnified: (pkg: ServicePackageV2WithTiers & { _source?: 'v1' | 'v2' }) => void
  /** Archive handler (soft delete) */
  onArchive?: (pkg: ServicePackageV2WithTiers) => void
  /** Restore handler */
  onRestore?: (pkg: ServicePackageV2WithTiers) => void
  /** Delete handler for fixed pricing packages */
  onDelete: (id: string, source?: 'v1' | 'v2') => Promise<void>
  /** Delete handler for tiered packages */
  onDeleteV2: (id: string) => Promise<void>
  /** Toggle active status for V2 tiered packages */
  onToggleV2: (pkg: ServicePackageV2WithTiers) => void
  /** Toggle active status for unified packages */
  onToggleUnified: (pkg: ServicePackageV2WithTiers & { _source?: 'v1' | 'v2' }) => void
}

/**
 * PackagesGrid - Displays packages in a responsive grid with load more
 *
 * @component
 * @example
 * <PackagesGrid
 *   packages={allPackages}
 *   displayCount={displayCount}
 *   onLoadMore={() => setDisplayCount(prev => prev + 6)}
 *   bookingCounts={bookingCounts}
 *   showActions={canUpdate}
 *   onEdit={handleEdit}
 *   onEditUnified={handleEditUnified}
 *   onArchive={handleArchive}
 *   onRestore={handleRestore}
 *   onDelete={handleDelete}
 *   onDeleteV2={handleDeleteV2}
 *   onToggleV2={handleToggleV2}
 *   onToggleUnified={handleToggleUnified}
 * />
 */
const PackagesGrid = React.memo(
  ({
    packages,
    displayCount,
    onLoadMore,
    bookingCounts,
    showActions,
    onEdit,
    onEditUnified,
    onArchive,
    onRestore,
    onDelete,
    onDeleteV2,
    onToggleV2,
    onToggleUnified,
  }: PackagesGridProps) => {
    // Empty state
    if (packages.length === 0) {
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

    // Display grid with sliced packages
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.slice(0, displayCount).map((pkg) => {
            // Check if package is archived (soft deleted)
            const isArchived = !!pkg.deleted_at
            // Check if package uses tiered pricing
            const isTiered = pkg.pricing_model === PricingModel.Tiered
            // Check if package is from V2 source
            const isV2Source = pkg._source === 'v2'

            // Convert UnifiedPackage to ServicePackageV2WithTiers for PackageCard
            const pkgForCard: ServicePackageV2WithTiers = {
              id: pkg.id,
              name: pkg.name,
              description: pkg.description,
              service_type: pkg.service_type,
              category: (pkg.category as ServiceCategory | null) ?? null,
              pricing_model: pkg.pricing_model,
              duration_minutes: pkg.duration_minutes,
              base_price: Number(pkg.base_price || 0),
              is_active: pkg.is_active,
              created_at: pkg.created_at,
              updated_at: pkg.updated_at || pkg.created_at,
              tier_count: pkg.tier_count || 0,
              min_price: pkg.min_price,
              max_price: pkg.max_price,
              tiers: pkg.tiers || [],
            }

            // Determine which toggle handler to use based on pricing model and source
            const handleToggle = isTiered
              ? onToggleV2
              : (p: ServicePackageV2WithTiers) =>
                  onToggleUnified({ ...p, _source: pkg._source })

            return (
              <PackageCard
                key={pkg.id}
                package={pkgForCard}
                onEdit={isTiered ? onEdit : onEditUnified}
                onArchive={isV2Source ? onArchive : undefined}
                onRestore={isV2Source ? onRestore : undefined}
                onDelete={isTiered ? onDeleteV2 : (id) => onDelete(id, pkg._source)}
                onToggleActive={handleToggle}
                showActions={showActions}
                bookingCount={bookingCounts[pkg.id] || 0}
                isArchived={isArchived}
              />
            )
          })}
        </div>

        {/* Load More Button */}
        {displayCount < packages.length && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                Showing {Math.min(displayCount, packages.length)} of {packages.length} packages
              </p>
              <Button variant="outline" onClick={onLoadMore} className="gap-2">
                <Plus className="h-4 w-4" />
                Load More Packages
              </Button>
            </CardContent>
          </Card>
        )}
      </>
    )
  }
)

PackagesGrid.displayName = 'PackagesGrid'

export { PackagesGrid }
