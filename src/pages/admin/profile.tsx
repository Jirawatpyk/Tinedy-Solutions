import { useState } from 'react'
import { useAdminProfile } from '@/hooks/use-admin-profile'
import { ProfileAvatar } from '@/components/staff/profile-avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Save,
  Lock,
  AlertCircle,
  Mail,
  Phone,
  User,
  Calendar,
  Shield,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { getErrorMessage } from '@/lib/error-utils'

export default function AdminProfile() {
  const {
    adminProfile,
    loading,
    error,
    updateProfile,
    uploadAvatar,
    changePassword,
  } = useAdminProfile()

  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { toast } = useToast()

  const handleEditToggle = () => {
    if (!editing && adminProfile) {
      setFullName(adminProfile.full_name)
      setPhone(adminProfile.phone || '')
    }
    setEditing(!editing)
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      await updateProfile({
        full_name: fullName,
        phone: phone || undefined,
      })
      toast({
        title: 'Success',
        description: 'Your profile has been updated successfully',
      })
      setEditing(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both password fields match',
        variant: 'destructive',
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      })
      return
    }

    try {
      setChangingPassword(true)
      await changePassword(newPassword)
      toast({
        title: 'Password changed successfully',
        description: 'Your password has been updated',
      })
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="px-4 sm:px-6 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-4 sm:px-6 py-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your personal information and account settings
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Manage your profile information</CardDescription>
              </div>
              {!editing ? (
                <Button onClick={handleEditToggle} variant="outline" size="sm">
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleEditToggle} variant="outline" size="sm">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={saving} size="sm">
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex justify-center py-4">
              <ProfileAvatar
                avatarUrl={adminProfile.avatar_url}
                userName={adminProfile.full_name}
                onUpload={uploadAvatar}
                size="lg"
              />
            </div>

            <Separator />

            {/* Role Badge */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Account Role</p>
                  <p className="text-xs text-gray-500">Your access level in the system</p>
                </div>
              </div>
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-sm font-semibold">
                {adminProfile.role === 'admin' ? 'Administrator' :
                 adminProfile.role === 'manager' ? 'Manager' : 'Staff'}
              </Badge>
            </div>

            <Separator />

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                {editing ? (
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{adminProfile.full_name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{adminProfile.email}</span>
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                {editing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{adminProfile.phone || 'Not specified'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Join Date</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(adminProfile.created_at), 'MMMM dd, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
