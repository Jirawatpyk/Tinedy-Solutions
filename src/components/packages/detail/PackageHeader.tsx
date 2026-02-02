/**
 * PackageHeader Component
 *
 * Extracted from package-detail.tsx (lines 507-603)
 * Displays package header with back button, title, and action buttons
 *
 * Features:
 * - Back button with tooltip
 * - Package name and "Package Details" subtitle
 * - Action buttons: Toggle Active, Edit, Delete/Archive
 * - Mobile-responsive: icon buttons on mobile, full buttons on desktop
 * - Permission-guarded actions
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { PermissionGuard } from '@/components/auth/permission-guard'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { Button, buttonVariants } from '@/components/ui/button'
import { ArrowLeft, Edit, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ServicePackageV2WithTiers } from '@/types'

// ============================================================================
// TYPES
// ============================================================================

interface PackageHeaderProps {
  /** Package data to display */
  packageData: ServicePackageV2WithTiers
  /** Source of the package (v1 or v2) */
  packageSource: 'v1' | 'v2'
  /** Package statistics */
  stats: { total_bookings: number }
  /** Whether toggle action is in progress */
  toggling: boolean
  /** Link to go back to (defaults to /admin/packages) */
  backHref?: string
  /** Callback when toggle active button is clicked */
  onToggleActive: () => void
  /** Callback when edit button is clicked */
  onEdit: () => void
  /** Callback when delete button is clicked (admin only) */
  onDelete: () => void
  /** Callback when archive button is clicked (manager) */
  onArchive: () => void
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PackageHeader - Header section for package detail page
 *
 * @example
 * ```tsx
 * <PackageHeader
 *   packageData={packageData}
 *   packageSource="v2"
 *   stats={{ total_bookings: 5 }}
 *   toggling={false}
 *   backHref="/admin/packages"
 *   onToggleActive={handleToggleActive}
 *   onEdit={() => setIsEditDialogOpen(true)}
 *   onDelete={handleDelete}
 *   onArchive={handleArchive}
 * />
 * ```
 */
const PackageHeaderComponent = function PackageHeader({
  packageData,
  packageSource: _packageSource,
  stats,
  toggling,
  backHref = '/admin/packages',
  onToggleActive,
  onEdit,
  onDelete,
  onArchive,
}: PackageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <Link
          to={backHref}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "flex-shrink-0")}
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-tinedy-dark truncate">
            {packageData.name}
          </h1>
          <p className="text-muted-foreground mt-1 line-clamp-2">Package Details</p>
        </div>
      </div>

      {/* Action Buttons - Based on permissions.ts */}
      <PermissionGuard requires={{ mode: 'action', action: 'update', resource: 'service_packages' }}>
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Active - Mobile: icon with tooltip, Desktop: full button */}
          <SimpleTooltip content={packageData.is_active ? 'Deactivate' : 'Activate'}>
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleActive}
              disabled={toggling}
              className="h-8 w-8 sm:hidden"
            >
              {packageData.is_active ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5" />
              )}
            </Button>
          </SimpleTooltip>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleActive}
            disabled={toggling}
            className="hidden sm:flex h-9"
          >
            {packageData.is_active ? (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Deactivate
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Activate
              </>
            )}
          </Button>

          {/* Edit - Mobile: icon with tooltip, Desktop: full button */}
          <SimpleTooltip content="Edit">
            <Button
              variant="outline"
              size="icon"
              onClick={onEdit}
              className="h-8 w-8 sm:hidden"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </SimpleTooltip>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="hidden sm:flex h-9"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>

          {/* Archive/Delete - responsive: icon on mobile, full button on desktop */}
          <PermissionAwareDeleteButton
            resource="service_packages"
            itemName={packageData.name}
            onDelete={onDelete}
            onCancel={onArchive}
            cancelText="Archive"
            buttonVariant="outline"
            responsive
            disabled={stats.total_bookings > 0}
            disabledReason={stats.total_bookings > 0 ? `Cannot delete/archive: Package has ${stats.total_bookings} booking(s)` : undefined}
          />
        </div>
      </PermissionGuard>
    </div>
  )
}

export const PackageHeader = React.memo(PackageHeaderComponent)

PackageHeader.displayName = 'PackageHeader'
