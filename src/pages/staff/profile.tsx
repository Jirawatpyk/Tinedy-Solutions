/**
 * Staff Profile Page
 *
 * Mobile-optimized Profile page:
 * - PageHeader with Logout button
 * - Compact profile header card
 * - Inline compact stats
 * - Settings as list items with sheets
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStaffProfile } from '@/hooks/use-staff-profile'
import { useStaffDashboard } from '@/hooks/use-staff-dashboard'
import { useAuth } from '@/contexts/auth-context'
import { ProfileUpdateForm } from '@/components/profile/ProfileUpdateForm'
import { NotificationSettingsCard } from '@/components/staff/notification-settings-card'
import { TeamMembershipCard } from '@/components/staff/team-membership-card'
import { PageHeader } from '@/components/staff/page-header'
import { ProfileHeaderCard } from '@/components/staff/profile-header-card'
import { CompactStats } from '@/components/staff/compact-stats'
import { SettingsListItem } from '@/components/staff/settings-list-item'
import { ChangePasswordSheet } from '@/components/staff/change-password-sheet'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import {
  Lock,
  AlertCircle,
  Users,
  Bell,
  LogOut,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatRole } from '@/lib/role-utils'

export default function StaffProfile() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { toast } = useToast()
  const {
    staffProfile,
    error,
    refresh,
    changePassword,
  } = useStaffProfile()

  // F6 fix: useStaffDashboard uses React Query - stats cached across pages
  const { stats, isLoading: statsLoading } = useStaffDashboard()

  // Sheet states
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [showTeamSheet, setShowTeamSheet] = useState(false)
  const [showNotificationSheet, setShowNotificationSheet] = useState(false)
  const [showPasswordSheet, setShowPasswordSheet] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Prepare initial data for ProfileUpdateForm
  const profileInitialData = staffProfile ? {
    full_name: staffProfile.full_name,
    phone: staffProfile.phone || undefined,
    email: staffProfile.email,
    avatar_url: staffProfile.avatar_url,
    role: formatRole(staffProfile.role),
    staff_number: staffProfile.staff_number,
    skills: staffProfile.skills,
    created_at: staffProfile.created_at,
  } : undefined

  return (
    <div className="flex-1 flex flex-col">
      {/* Header with Logout */}
      <PageHeader
        title="My Profile"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLogoutDialog(true)}
            className="h-9 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </Button>
        }
      />

      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Error: {error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex-1 p-4 space-y-4">
        {/* Profile Header Card */}
        {staffProfile && (
          <ProfileHeaderCard
            avatarUrl={staffProfile.avatar_url}
            fullName={staffProfile.full_name}
            staffNumber={staffProfile.staff_number}
            email={staffProfile.email}
            onEdit={() => setShowProfileEdit(true)}
          />
        )}

        {/* Compact Performance Stats */}
        <div className="bg-card rounded-xl border">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">Performance</h3>
          </div>
          <CompactStats stats={stats} loading={statsLoading} />
        </div>

        {/* Settings List */}
        <div className="divide-y rounded-xl border bg-card overflow-hidden">
          <SettingsListItem
            icon={Users}
            label="Team Membership"
            description="View your teams"
            onClick={() => setShowTeamSheet(true)}
          />
          <SettingsListItem
            icon={Bell}
            label="Notifications"
            description="Manage notification settings"
            onClick={() => setShowNotificationSheet(true)}
          />
          <SettingsListItem
            icon={Lock}
            label="Change Password"
            description="Update your password"
            onClick={() => setShowPasswordSheet(true)}
          />
        </div>
      </div>

      {/* Profile Edit Sheet */}
      <Sheet open={showProfileEdit} onOpenChange={setShowProfileEdit}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Edit Profile</SheetTitle>
          </SheetHeader>
          {staffProfile && (
            <ProfileUpdateForm
              initialData={profileInitialData}
              profileId={staffProfile.id}
              onSuccess={() => {
                refresh()
                setShowProfileEdit(false)
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Team Membership Sheet */}
      <Sheet open={showTeamSheet} onOpenChange={setShowTeamSheet}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Team Membership</SheetTitle>
          </SheetHeader>
          <TeamMembershipCard />
        </SheetContent>
      </Sheet>

      {/* Notification Settings Sheet */}
      <Sheet open={showNotificationSheet} onOpenChange={setShowNotificationSheet}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Notification Settings</SheetTitle>
          </SheetHeader>
          <NotificationSettingsCard />
        </SheetContent>
      </Sheet>

      {/* Change Password Sheet */}
      <ChangePasswordSheet
        open={showPasswordSheet}
        onOpenChange={setShowPasswordSheet}
        onChangePassword={changePassword}
      />

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        title="Sign Out"
        description="Are you sure you want to sign out of your account?"
        variant="danger"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        onConfirm={handleLogout}
      />
    </div>
  )
}
