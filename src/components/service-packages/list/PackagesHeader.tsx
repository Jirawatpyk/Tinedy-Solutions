import { memo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ManagerOrAdmin } from '@/components/auth/permission-guard'
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
          {/* Show Archived - Admin & Manager */}
          <ManagerOrAdmin>
            <div className="flex items-center gap-2">
              <Switch
                id="showArchived"
                checked={showArchived}
                onCheckedChange={onShowArchivedChange}
              />
              <label
                htmlFor="showArchived"
                className="hidden sm:block text-sm font-medium cursor-pointer"
              >
                Show archived
              </label>
            </div>
          </ManagerOrAdmin>
          {canCreate && (
            <Button
              className="bg-tinedy-blue hover:bg-tinedy-blue/90"
              onClick={onCreateClick}
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Package</span>
            </Button>
          )}
        </>
      }
    />
  )
}

PackagesHeaderComponent.displayName = 'PackagesHeader'

export const PackagesHeader = memo(PackagesHeaderComponent)
