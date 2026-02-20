import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { ArrowLeft, Edit } from 'lucide-react'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { useAuth } from '@/contexts/auth-context'
import { formatRole } from '@/lib/role-utils'
import { UserRole } from '@/types/common'
import { cn } from '@/lib/utils'

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

/**
 * StaffPerformanceHeader
 *
 * Custom header for staff performance page with avatar display.
 * Uses similar layout pattern to PageHeader but with additional avatar.
 */
export const StaffPerformanceHeader = memo(function StaffPerformanceHeader({
  staff,
  basePath,
  onEdit,
  onDelete,
}: StaffPerformanceHeaderProps) {
  const { user, profile } = useAuth()

  // Check if current user can edit/delete this staff
  // Admin can edit all, Manager can edit staff only, Staff can edit self only
  const canEdit = profile?.role === UserRole.Admin ||
    staff.id === user?.id ||
    (profile?.role === UserRole.Manager && staff.role === UserRole.Staff)

  // Don't show delete for own profile
  const canDelete = user?.id !== staff.id

  return (
    <div className="flex items-center justify-between gap-2">
      {/* Left: Back + Avatar + Name */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link
          to={`${basePath}/staff`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "flex-shrink-0")}
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {/* Avatar */}
        {staff.avatar_url ? (
          <img
            src={staff.avatar_url}
            alt={staff.full_name}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-tinedy-blue flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-tinedy-blue flex items-center justify-center text-white font-semibold text-xl sm:text-2xl flex-shrink-0">
            {staff.full_name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name and subtitle */}
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-tinedy-dark truncate">
            {staff.full_name}
          </h1>
          <p className="text-muted-foreground mt-1 line-clamp-2">
            {formatRole(staff.role)} • {staff.email}
          </p>
        </div>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
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
  )
})
