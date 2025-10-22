import { useState } from 'react'
import { useStaffProfile } from '@/hooks/use-staff-profile'
import { ProfileAvatar } from '@/components/staff/profile-avatar'
import { PerformanceChart } from '@/components/staff/performance-chart'
import { StatsCard } from '@/components/staff/stats-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { getErrorMessage } from '@/lib/error-utils'

export default function StaffProfile() {
  const {
    staffProfile,
    performanceStats,
    loading,
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
        title: 'บันทึกสำเร็จ',
        description: 'ข้อมูลโปรไฟล์ของคุณได้รับการอัปเดตแล้ว',
      })
      setEditing(false)
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
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
        title: 'รหัสผ่านไม่ตรงกัน',
        description: 'กรุณากรอกรหัสผ่านใหม่ให้ตรงกันทั้งสองช่อง',
        variant: 'destructive',
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: 'รหัสผ่านสั้นเกินไป',
        description: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร',
        variant: 'destructive',
      })
      return
    }

    try {
      setChangingPassword(true)
      await changePassword(newPassword)
      toast({
        title: 'เปลี่ยนรหัสผ่านสำเร็จ',
        description: 'รหัสผ่านของคุณได้รับการอัปเดตแล้ว',
      })
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
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
          <AlertDescription>เกิดข้อผิดพลาด: {error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading || !staffProfile || !performanceStats) {
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
            จัดการข้อมูลส่วนตัวและดูสถิติของคุณ
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Performance Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="งานทั้งหมด"
            value={performanceStats.totalJobs}
            icon={Briefcase}
            description="6 เดือนล่าสุด"
          />
          <StatsCard
            title="งานสำเร็จ"
            value={performanceStats.completedJobs}
            icon={TrendingUp}
            description={`${performanceStats.completionRate}% completion rate`}
          />
          <StatsCard
            title="คะแนนเฉลี่ย"
            value={performanceStats.averageRating > 0 ? performanceStats.averageRating.toFixed(1) : 'N/A'}
            icon={Star}
            description="จากรีวิวลูกค้า"
          />
          <StatsCard
            title="รายได้รวม"
            value={`฿${performanceStats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            description="6 เดือนล่าสุด"
          />
        </div>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>ข้อมูลส่วนตัว</CardTitle>
                <CardDescription>จัดการข้อมูลโปรไฟล์ของคุณ</CardDescription>
              </div>
              {!editing ? (
                <Button onClick={handleEditToggle} variant="outline" size="sm">
                  แก้ไข
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleEditToggle} variant="outline" size="sm">
                    ยกเลิก
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={saving} size="sm">
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
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

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
                {editing ? (
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="กรอกชื่อ-นามสกุล"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{staffProfile.full_name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{staffProfile.email}</span>
                </div>
                <p className="text-xs text-muted-foreground">ไม่สามารถเปลี่ยนอีเมลได้</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                {editing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="กรอกเบอร์โทรศัพท์"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{staffProfile.phone || 'ไม่ได้ระบุ'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>วันที่สมัคร</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(staffProfile.created_at), 'dd MMMM yyyy', { locale: th })}
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
              เปลี่ยนรหัสผ่าน
            </CardTitle>
            <CardDescription>อัปเดตรหัสผ่านของคุณเพื่อความปลอดภัย</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="ยืนยันรหัสผ่านใหม่"
                />
              </div>
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={!newPassword || !confirmPassword || changingPassword}
              className="mt-4"
            >
              {changingPassword ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
            </Button>
          </CardContent>
        </Card>

        {/* Performance History */}
        {performanceStats.monthlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>ประวัติผลงาน</CardTitle>
              <CardDescription>สถิติการทำงาน 6 เดือนล่าสุด</CardDescription>
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
