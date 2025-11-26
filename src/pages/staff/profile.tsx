/**
 * Staff Profile Page
 *
 * หน้าโปรไฟล์ของ Staff:
 * - แสดงข้อมูลส่วนตัว
 * - แก้ไข profile (full_name, phone, avatar)
 * - เปลี่ยนรหัสผ่าน
 * - ตั้งค่า notification
 *
 * Note: Performance statistics ย้ายไปอยู่ที่ My Bookings > Stats tab
 */

import { useState } from 'react'
import { useStaffProfile } from '@/hooks/use-staff-profile'
import { ProfileUpdateForm } from '@/components/profile/ProfileUpdateForm'
import { NotificationSettingsCard } from '@/components/staff/notification-settings-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Lock,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { mapErrorToUserMessage } from '@/lib/error-messages'

export default function StaffProfile() {
  const {
    staffProfile,
    error,
    refresh,
    changePassword,
  } = useStaffProfile()

  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { toast } = useToast()

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'Please enter the same password in both fields',
        variant: 'destructive',
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      })
      return
    }

    try {
      setChangingPassword(true)
      await changePassword(newPassword)
      toast({
        title: 'Password Changed Successfully',
        description: 'Your password has been updated',
      })
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'general')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    } finally {
      setChangingPassword(false)
    }
  }

  // Prepare initial data for ProfileUpdateForm
  const profileInitialData = staffProfile ? {
    full_name: staffProfile.full_name,
    phone: staffProfile.phone || undefined, // Convert null to undefined
    email: staffProfile.email,
    avatar_url: staffProfile.avatar_url,
    role: staffProfile.role === 'admin' ? 'Administrator' :
          staffProfile.role === 'manager' ? 'Manager' : 'Staff',
    staff_number: staffProfile.staff_number,
    skills: staffProfile.skills,
  } : undefined

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Manage your personal information and notification settings
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 sm:p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Error: {error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-6 max-w-full mx-auto">
        {/* Profile Update Form */}
        {staffProfile && (
          <ProfileUpdateForm
            initialData={profileInitialData}
            profileId={staffProfile.id}
            onSuccess={refresh}
          />
        )}

        {/* Notification Settings */}
        <NotificationSettingsCard />

        {/* Change Password - ไม่ต้องรอข้อมูล แสดงได้เลย */}
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
            <Button
              onClick={handleChangePassword}
              disabled={!newPassword || !confirmPassword || changingPassword}
              className="mt-4"
            >
              {changingPassword ? 'Changing Password...' : 'Change Password'}
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
