import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { ArrowLeft, Edit } from 'lucide-react'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { useAuth } from '@/contexts/auth-context'
import { formatRole, type UserRole } from '@/lib/role-utils'

interface Staff {
  id: string
  full_name: string
  email: string
  role: UserRole
  phone?: string
  avatar_url?: string
  booking_count?: number
  team_count?: number
}

interface StaffPerformanceHeaderProps {
  staff: Staff
  basePath: string
  onEdit?: () => void
  onDelete?: () => void
}

export const StaffPerformanceHeader = memo(function StaffPerformanceHeader({
  staff,
  basePath,
  onEdit,
  onDelete,
}: StaffPerformanceHeaderProps) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  // Check if current user can edit/delete this staff
  // Admin can edit all, Manager can edit staff only, Staff can edit self only
  const canEdit = profile?.role === 'admin' ||
    staff.id === user?.id ||
    (profile?.role === 'manager' && staff.role === 'staff')

  // Don't show delete for own profile
  const canDelete = user?.id !== staff.id

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      {/* Top row on mobile: Back + Avatar + Name + Actions */}
      <div className="flex items-center gap-3 sm:gap-4 w-full">
        <SimpleTooltip content="Back">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`${basePath}/staff`)}
            className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </SimpleTooltip>

        {/* Avatar */}
        {staff.avatar_url ? (
          <img
            src={staff.avatar_url}
            alt={staff.full_name}
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-tinedy-blue flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-tinedy-blue flex items-center justify-center text-white font-semibold text-xl sm:text-2xl flex-shrink-0">
            {staff.full_name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name and info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-tinedy-dark truncate">
            {staff.full_name}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {formatRole(staff.role)} • {staff.email}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          {canEdit && onEdit && (
            <>
              {/* Mobile: icon only with tooltip */}
              <SimpleTooltip content="Edit">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onEdit}
                  className="h-8 w-8 sm:hidden"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
              {/* Desktop: full button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="hidden sm:flex h-9"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          )}
          {canDelete && onDelete && (
            <PermissionAwareDeleteButton
              resource="staff"
              itemName={staff.full_name}
              onDelete={onDelete}
              buttonVariant="outline"
              responsive
              warningMessage={
                (staff.booking_count || 0) > 0 || (staff.team_count || 0) > 0
                  ? `This staff has ${staff.booking_count || 0} booking(s)${(staff.team_count || 0) > 0 ? ` and is a member of ${staff.team_count} team(s)` : ''}.`
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  )
})
