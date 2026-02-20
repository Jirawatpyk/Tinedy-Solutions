/**
 * Admin Profile Page
 *
 * หน้าโปรไฟล์ของ Admin:
 * - แสดงข้อมูลส่วนตัว
 * - แก้ไข profile (full_name, phone, avatar)
 * - เปลี่ยนรหัสผ่าน
 * - ใช้ ProfileUpdateForm component (Phase 5)
 */

import { useState } from 'react'
import { useAdminProfile } from '@/hooks/use-admin-profile'
import { ProfileUpdateForm } from '@/components/profile/ProfileUpdateForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { formatRole } from '@/lib/role-utils'
import { PageHeader } from '@/components/common/PageHeader'

export default function AdminProfile() {
  const {
    adminProfile,
    loading,
    error,
    refresh,
    changePassword,
  } = useAdminProfile()

  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match', {
        description: 'Please ensure both password fields match',
      })
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password too short', {
        description: 'Password must be at least 6 characters long',
      })
      return
    }

    try {
      setChangingPassword(true)
      await changePassword(newPassword)
      toast.success('Your password has been updated')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'general')
      toast.error(errorMsg.title, { description: errorMsg.description })
    } finally {
      setChangingPassword(false)
    }
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading || !adminProfile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          subtitle="Manage your personal information"
        />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  // Prepare initial data for ProfileUpdateForm
  const profileInitialData = adminProfile ? {
    full_name: adminProfile.full_name,
    phone: adminProfile.phone || undefined, // Convert null to undefined
    email: adminProfile.email,
    avatar_url: adminProfile.avatar_url,
    role: formatRole(adminProfile.role),
    created_at: adminProfile.created_at,
  } : undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal information"
      />
        {/* Profile Update Form */}
        {adminProfile && (
          <ProfileUpdateForm
            initialData={profileInitialData}
            profileId={adminProfile.id}
            onSuccess={refresh}
          />
        )}

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your password for security</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t mt-4">
              <Button
                onClick={handleChangePassword}
                disabled={!newPassword || !confirmPassword || changingPassword}
              >
                {changingPassword ? 'Changing Password...' : 'Change Password'}
              </Button>
            </div>
          </CardContent>
        </Card>
    </div>
  )
}
