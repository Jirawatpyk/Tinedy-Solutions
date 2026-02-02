import { memo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { PermissionGuard } from '@/components/auth/permission-guard'
import { PageHeader } from '@/components/common/PageHeader'

export interface PackagesHeaderProps {
  showArchived: boolean
  onShowArchivedChange: (checked: boolean) => void
  canCreate: boolean
  onCreateClick: () => void
}

function PackagesHeaderComponent({
  showArchived,
  onShowArchivedChange,
  canCreate,
  onCreateClick,
}: PackagesHeaderProps) {
  return (
    <PageHeader
      title="Service Packages"
      subtitle="Manage cleaning and training service packages"
      actions={
        <>
          {/* Show Archived - Admin only */}
          <PermissionGuard requires={{ mode: 'role', roles: ['admin'] }}>
            <div className="flex items-center gap-2">
              <Checkbox
                id="showArchived"
                checked={showArchived}
                onCheckedChange={(checked) => onShowArchivedChange(checked === true)}
              />
              <label
                htmlFor="showArchived"
                className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Show archived
              </label>
            </div>
          </PermissionGuard>
          {canCreate && (
            <Button
              className="bg-tinedy-blue hover:bg-tinedy-blue/90"
              onClick={onCreateClick}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Package
            </Button>
          )}
        </>
      }
    />
  )
}

PackagesHeaderComponent.displayName = 'PackagesHeader'

export const PackagesHeader = memo(PackagesHeaderComponent)
