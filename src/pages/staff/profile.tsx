/**
 * Staff Profile Page
 *
 * Mobile-optimized Profile page:
 * - PageHeader with Logout button (hidden on desktop)
 * - Compact profile header card
 * - Inline compact stats
 * - Settings as list items with responsive sheets
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
import { ResponsiveSheet } from '@/components/ui/responsive-sheet'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import {
  Lock,
  AlertCircle,
  Users,
  Bell,
  LogOut,
  User,
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
      {/* Header with Logout - Hidden on desktop (lg:hidden by default in PageHeader) */}
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

      <div className="flex-1 p-4 space-y-4 lg:max-w-3xl lg:mx-auto lg:w-full lg:py-6">
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

      {/* Profile Edit Sheet - Responsive */}
      <ResponsiveSheet
        open={showProfileEdit}
        onOpenChange={setShowProfileEdit}
        title="Edit Profile"
        description="Update your personal information"
        icon={<User className="h-5 w-5" />}
        mobileHeight="h-[90vh]"
        desktopWidth="w-[540px]"
        data-testid="profile-edit-sheet"
      >
        {staffProfile && (
          <div className="overflow-y-auto flex-1 px-6 pb-6">
            <ProfileUpdateForm
              initialData={profileInitialData}
              profileId={staffProfile.id}
              onSuccess={() => {
                refresh()
                setShowProfileEdit(false)
              }}
            />
          </div>
        )}
      </ResponsiveSheet>

      {/* Team Membership Sheet - Responsive */}
      <ResponsiveSheet
        open={showTeamSheet}
        onOpenChange={setShowTeamSheet}
        title="My Teams"
        description="Teams you are a member of"
        icon={<Users className="h-5 w-5" />}
        data-testid="team-membership-sheet"
      >
        <div className="overflow-y-auto flex-1 px-6 pb-4">
          <TeamMembershipCard />
        </div>
      </ResponsiveSheet>

      {/* Notification Settings Sheet - Responsive */}
      <ResponsiveSheet
        open={showNotificationSheet}
        onOpenChange={setShowNotificationSheet}
        title="Notification Settings"
        description="Manage your notification preferences"
        icon={<Bell className="h-5 w-5" />}
        data-testid="notification-settings-sheet"
      >
        <div className="overflow-y-auto flex-1 px-6 pb-4">
          <NotificationSettingsCard />
        </div>
      </ResponsiveSheet>

      {/* Change Password Sheet - Uses its own responsive logic */}
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
