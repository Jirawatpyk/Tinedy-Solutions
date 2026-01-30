/**
 * ProfileHeaderCard Component
 *
 * Compact profile header card for Staff Profile page:
 * - Avatar with name and staff number
 * - Email display
 * - Edit button to open form in sheet
 */

import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback'
import { Button } from '@/components/ui/button'
import { Edit2 } from 'lucide-react'

interface ProfileHeaderCardProps {
  avatarUrl?: string | null
  fullName: string
  staffNumber?: string | null
  email: string
  onEdit: () => void
}

export function ProfileHeaderCard({
  avatarUrl,
  fullName,
  staffNumber,
  email,
  onEdit,
}: ProfileHeaderCardProps) {
  return (
    <div className="bg-card rounded-xl border p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <AvatarWithFallback
          src={avatarUrl}
          alt={fullName}
          size="lg"
          className="h-16 w-16 ring-2 ring-primary/10"
        />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg truncate">{fullName}</h2>
          {staffNumber && (
            <p className="text-sm text-muted-foreground">Staff #{staffNumber}</p>
          )}
          <p className="text-sm text-muted-foreground truncate">{email}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="flex-shrink-0"
        >
          <Edit2 className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </div>
    </div>
  )
}
