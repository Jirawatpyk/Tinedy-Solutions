import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { useAuth } from '@/contexts/auth-context'

interface Staff {
  id: string
  full_name: string
  email: string
  role: string
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
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(`${basePath}/staff`)}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-4 flex-1">
        {staff.avatar_url ? (
          <img
            src={staff.avatar_url}
            alt={staff.full_name}
            className="w-16 h-16 rounded-full object-cover border-2 border-tinedy-blue"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-tinedy-blue flex items-center justify-center text-white font-semibold text-2xl">
            {staff.full_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold text-tinedy-dark">
            {staff.full_name}
          </h1>
          <p className="text-muted-foreground">{staff.role} • {staff.email}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {canEdit && onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
        {canDelete && onDelete && (
          <PermissionAwareDeleteButton
            resource="staff"
            itemName={staff.full_name}
            onDelete={onDelete}
            variant="default"
            size="sm"
            buttonVariant="outline"
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
