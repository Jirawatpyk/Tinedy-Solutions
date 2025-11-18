import { useState } from 'react'
import { useStaffProfile } from '@/hooks/use-staff-profile'
import { ProfileAvatar } from '@/components/staff/profile-avatar'
import { PerformanceChart } from '@/components/staff/performance-chart'
import { StatsCard } from '@/components/staff/stats-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Briefcase,
  Star,
  TrendingUp,
  DollarSign,
  Save,
  Lock,
  AlertCircle,
  Mail,
  Phone,
  User,
  Calendar,
  Hash,
  Award,
  Shield,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { mapErrorToUserMessage } from '@/lib/error-messages'

export default function StaffProfile() {
  const {
    staffProfile,
    performanceStats,
    error,
    updateProfile,
    uploadAvatar,
    changePassword,
  } = useStaffProfile()

  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { toast } = useToast()

  const handleEditToggle = () => {
    if (!editing && staffProfile) {
      setFullName(staffProfile.full_name)
      setPhone(staffProfile.phone || '')
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
        title: 'Saved Successfully',
        description: 'Your profile has been updated',
      })
      setEditing(false)
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'general')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-4 sm:px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Manage your personal information and view your statistics
          </p>
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

      <div className="p-4 sm:p-6 space-y-6">
        {/* Performance Stats - ต้อง fetch จาก DB */}
        {!performanceStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Tasks"
              value={performanceStats.totalJobs}
              icon={Briefcase}
              description="Last 6 months"
            />
            <StatsCard
              title="Completed Tasks"
              value={performanceStats.completedJobs}
              icon={TrendingUp}
              description={`${performanceStats.completionRate}% completion rate`}
            />
            <StatsCard
              title="Average Rating"
              value={performanceStats.averageRating > 0 ? performanceStats.averageRating.toFixed(1) : 'N/A'}
              icon={Star}
              description="From customer reviews"
            />
            <StatsCard
              title="Total Revenue"
              value={`฿${performanceStats.totalRevenue.toLocaleString()}`}
              icon={DollarSign}
              description="Last 6 months"
            />
          </div>
        )}

        {/* Profile Information - มาจาก AuthContext แสดงได้เลย */}
        {staffProfile && (
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
                avatarUrl={staffProfile.avatar_url}
                userName={staffProfile.full_name}
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
                {staffProfile.role === 'admin' ? 'Administrator' :
                 staffProfile.role === 'manager' ? 'Manager' : 'Staff'}
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
                    <span>{staffProfile.full_name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{staffProfile.email}</span>
                </div>
                <p className="text-xs text-muted-foreground">Cannot change email</p>
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
                    <span>{staffProfile.phone || 'Not specified'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Join Date</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(staffProfile.created_at), 'dd MMMM yyyy', { locale: enUS })}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Staff ID</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span>{staffProfile.staff_number || 'Not specified'}</span>
                </div>
              </div>
            </div>

            {/* Skills Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Skills
              </Label>
              {staffProfile.skills && staffProfile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
                  {staffProfile.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <span className="text-muted-foreground italic">No skills added</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}

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

        {/* Performance History - ต้อง fetch จาก DB */}
        {!performanceStats ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : performanceStats.monthlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Performance History</CardTitle>
              <CardDescription>Work statistics for the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceChart stats={performanceStats} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
