import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/common/StatCard/StatCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Search, Edit, Mail, Phone, User, Shield, Hash, Award, Star, Users, UserPlus } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { getLoadErrorMessage, getDeleteErrorMessage } from '@/lib/error-messages'
import { useAuth } from '@/contexts/auth-context'
import { UserRole } from '@/types/common'
import { useStaffWithRatings } from '@/hooks/use-staff'
import { StaffFormSheet } from '@/components/staff/StaffFormSheet'
import { StaffEditSheet, type StaffForEdit } from '@/components/staff/StaffEditSheet'
import { PageHeader } from '@/components/common/PageHeader'
import type { StaffWithRating } from '@/types/staff'

export function AdminStaff() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { staff, loading, refresh, error: staffError } = useStaffWithRatings({
    enableRealtime: true,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)

  // Edit sheet state
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [staffForEdit, setStaffForEdit] = useState<StaffForEdit | null>(null)

  // Both admin and manager use /admin routes
  const basePath = '/admin'

  // Pagination
  const [displayCount, setDisplayCount] = useState(12)
  const ITEMS_PER_LOAD = 12

  // Filter staff with useMemo for better performance
  const filteredStaff = useMemo(() => {
    let filtered = staff

    if (searchQuery) {
      filtered = filtered.filter(
        (member) =>
          member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((member) => member.role === roleFilter)
    }

    return filtered
  }, [staff, searchQuery, roleFilter])

  // Reset display count when filter changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_LOAD)
  }, [filteredStaff, ITEMS_PER_LOAD])

  // Error handling for staff loading
  useEffect(() => {
    if (staffError) {
      const errorMessage = getLoadErrorMessage('staff')
      toast.error(errorMessage.title, { description: staffError })
    }
  }, [staffError])

  const deleteStaff = async (staffId: string) => {
    try {
      // ป้องกันการลบโปรไฟล์ตัวเอง
      if (user?.id === staffId) {
        toast.error('Cannot delete your own profile', { description: 'You cannot delete your own account. Please contact another administrator.' })
        return
      }

      // Call Edge Function to delete user from auth.users (will cascade to profiles)
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: staffId },
      })

      if (error) {
        console.error('[Delete Staff] Edge Function error:', error)
        throw error
      }

      if (!data?.success) {
        console.error('[Delete Staff] Edge Function returned failure:', data)
        throw new Error(data?.error || data?.details || 'Failed to delete user')
      }

      toast.success(data.message || 'Staff member deleted successfully')
      refresh()
    } catch (error) {
      console.error('[Delete Staff] Caught error:', error)
      const errorMessage = getDeleteErrorMessage('staff')
      toast.error(errorMessage.title, { description: errorMessage.description })
    }
  }

  const openEditSheet = (staffMember: StaffWithRating) => {
    setStaffForEdit({
      id: staffMember.id,
      full_name: staffMember.full_name,
      email: staffMember.email,
      phone: staffMember.phone,
      role: staffMember.role as 'admin' | 'manager' | 'staff',
      staff_number: staffMember.staff_number,
      skills: staffMember.skills,
    })
    setIsEditSheetOpen(true)
  }

  const getStaffStats = () => {
    const totalStaff = staff.length
    const admins = staff.filter(s => s.role === UserRole.Admin).length
    const managers = staff.filter(s => s.role === UserRole.Manager).length
    const staffMembers = staff.filter(s => s.role === UserRole.Staff).length
    return { totalStaff, admins, managers, staffMembers }
  }

  const stats = getStaffStats()

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Staff"
          subtitle="Manage your team members"
          actions={
            <Button className="bg-tinedy-blue hover:bg-tinedy-blue/90" disabled>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Staff</span>
            </Button>
          }
        />

        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCard
              key={i}
              title=""
              value={0}
              isLoading={true}
            />
          ))}
        </div>

        {/* Search and filter skeleton */}
        <Card>
          <CardContent className="py-3 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Skeleton className="h-8 sm:h-9 flex-1" />
              <Skeleton className="h-8 sm:h-9 w-full sm:w-48" />
            </div>
          </CardContent>
        </Card>

        {/* Staff cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: Math.min(staff.length, 9) || 9 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="p-4 sm:p-6 pb-1 sm:pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0" />
                    <div className="space-y-2 flex-1 min-w-0">
                      <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
                      <Skeleton className="h-4 sm:h-5 w-14 sm:w-16 rounded-full" />
                    </div>
                  </div>
                  <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                    <Skeleton className="h-8 w-8 sm:h-10 sm:w-10" />
                    <Skeleton className="h-8 w-8 sm:h-10 sm:w-10" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6 pt-0">
                <Skeleton className="h-3 sm:h-4 w-full" />
                <Skeleton className="h-3 sm:h-4 w-28 sm:w-32" />
                <Skeleton className="h-3 w-24 sm:w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        subtitle="Manage your team members"
        actions={
          <Button
            className="bg-tinedy-blue hover:bg-tinedy-blue/90"
            onClick={() => setIsCreateSheetOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Staff
          </Button>
        }
      />

      {/* Create Staff Sheet */}
      <StaffFormSheet
        open={isCreateSheetOpen}
        onOpenChange={setIsCreateSheetOpen}
        onSuccess={refresh}
      />

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Staff"
          value={stats.totalStaff}
          description="All team members"
          icon={User}
          iconColor="text-tinedy-blue"
        />

        <StatCard
          title="Super Admins"
          value={stats.admins}
          description="Full access users"
          icon={Shield}
          iconColor="text-tinedy-green"
        />

        <StatCard
          title="Admins"
          value={stats.managers}
          description="Operational managers"
          icon={Users}
          iconColor="text-tinedy-purple"
        />

        <StatCard
          title="Staff Members"
          value={stats.staffMembers}
          description="Regular staff"
          icon={User}
          iconColor="text-tinedy-yellow"
        />
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48 h-8 text-xs">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Super admin</SelectItem>
                <SelectItem value="manager">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Staff list */}
      {filteredStaff.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Users}
              title={searchQuery ? 'No staff found' : 'No staff members yet'}
              description={searchQuery ? 'Try a different search term' : 'Add your first staff member to get started'}
              action={!searchQuery ? {
                label: 'Add Staff',
                onClick: () => setIsCreateSheetOpen(true),
                icon: UserPlus
              } : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.slice(0, displayCount).map((member) => (
              <Card
                key={member.id}
                className="card-interactive"
                onClick={() => navigate(`${basePath}/staff/${member.id}`)}
              >
                <CardHeader className="p-4 sm:p-6 pb-1 sm:pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-tinedy-blue flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-tinedy-blue flex items-center justify-center text-white font-semibold text-base sm:text-lg flex-shrink-0">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg font-display truncate">
                          {member.full_name}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                          <Badge
                            variant={member.role === UserRole.Admin ? 'default' : member.role === UserRole.Manager ? 'default' : 'secondary'}
                            className={`text-[10px] sm:text-xs ${member.role === UserRole.Manager ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                          >
                            {member.role === UserRole.Admin ? '👑 Super admin' : member.role === UserRole.Manager ? '👔 Admin' : 'Staff'}
                          </Badge>
                          {member.average_rating !== undefined && (
                            <div className="flex items-center gap-1 text-yellow-500">
                              <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-yellow-400" />
                              <span className="text-[10px] sm:text-xs font-semibold text-tinedy-dark">
                                {member.average_rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Admin: แก้ไขได้ทุกคน | Manager: แก้ไขได้ตัวเอง + Staff | Staff: แก้ไขได้ตัวเอง */}
                      {(profile?.role === UserRole.Admin ||
                        member.id === user?.id ||
                        (profile?.role === UserRole.Manager && member.role === UserRole.Staff)) && (
                        <SimpleTooltip content="Edit staff">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditSheet(member)}
                            className="h-7 w-7 sm:h-8 sm:w-8"
                          >
                            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </SimpleTooltip>
                      )}
                      {/* ซ่อนปุ่ม Delete ถ้าเป็นโปรไฟล์ตัวเอง */}
                      {user?.id !== member.id && (
                        <PermissionAwareDeleteButton
                          resource="staff"
                          itemName={member.full_name}
                          onDelete={() => deleteStaff(member.id)}
                          className="h-7 w-7 sm:h-8 sm:w-8"
                          warningMessage={
                            (member.booking_count || 0) > 0 || (member.team_count || 0) > 0
                              ? `This staff has ${member.booking_count || 0} booking(s)${(member.team_count || 0) > 0 ? ` and is a member of ${member.team_count} team(s)` : ''}.`
                              : undefined
                          }
                        />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6 pt-0">
                  <div className="flex items-center text-xs sm:text-sm text-muted-foreground min-w-0">
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                      <span className="break-words">{member.phone}</span>
                    </div>
                  )}
                  {member.staff_number && (
                    <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                      <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                      {member.staff_number}
                    </div>
                  )}
                  {member.skills && member.skills.length > 0 ? (
                    <div className="flex items-start sm:items-center gap-2">
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                        <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                        <span className="font-medium">Skills:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {member.skills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-[10px] sm:text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Award className="h-4 w-4 mr-2" />
                      <span className="italic">No skills added</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground border-t pt-2">
                    Joined {formatDate(member.created_at)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More Button */}
          {displayCount < filteredStaff.length && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Showing {displayCount} of {filteredStaff.length} staff members
                </p>
                <Button
                  variant="outline"
                  onClick={() => setDisplayCount(prev => prev + ITEMS_PER_LOAD)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Load More Staff
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Edit Staff Sheet */}
      <StaffEditSheet
        open={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
        staff={staffForEdit}
        onSuccess={refresh}
      />
    </div>
  )
}
