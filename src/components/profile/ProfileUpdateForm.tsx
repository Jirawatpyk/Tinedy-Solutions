/**
 * ProfileUpdateForm Component
 *
 * ฟอร์มสำหรับแก้ไขข้อมูล Profile
 * - Full name
 * - Phone
 * - Avatar upload
 * - ใช้ React Hook Form + Zod validation
 * - ใช้ได้ทั้ง Admin และ Staff profile pages
 */

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import {
  ProfileUpdateSchema,
  ProfileUpdateTransformSchema,
  validateAvatarFile,
  type ProfileUpdateFormData,
} from '@/schemas'
import { User, Phone, Upload, X, Mail, Calendar, Shield } from 'lucide-react'
import { useState, useRef } from 'react'
import { format } from 'date-fns'

interface ProfileUpdateFormProps {
  initialData?: Partial<ProfileUpdateFormData> & {
    email?: string
    avatar_url?: string | null
    role?: string
    staff_number?: string | null
    skills?: string[] | null
    created_at?: string
  }
  profileId: string
  onSuccess?: () => void
}

export function ProfileUpdateForm({ initialData, profileId, onSuccess }: ProfileUpdateFormProps) {
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialData?.avatar_url || null)
  const [showRemoveAvatarDialog, setShowRemoveAvatarDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(ProfileUpdateSchema),
    defaultValues: {
      full_name: initialData?.full_name || '',
      phone: initialData?.phone || '',
    },
  })

  const onSubmit = async (data: ProfileUpdateFormData) => {
    try {
      // Transform data
      const transformedData = ProfileUpdateTransformSchema.parse(data)

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update(transformedData)
        .eq('id', profileId)

      if (error) throw error

      toast.success('Profile updated successfully')

      onSuccess?.()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'general')
      toast.error(errorMsg.title, { description: errorMsg.description })
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateAvatarFile(file)
    if (!validation.valid) {
      toast.error('Invalid File', { description: validation.error })
      return
    }

    try {
      setUploadingAvatar(true)

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${profileId}-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(uploadData.path)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profileId)

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)

      toast.success('Profile picture has been updated successfully')

      onSuccess?.()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      const errorMsg = mapErrorToUserMessage(error, 'general')
      toast.error(errorMsg.title, { description: errorMsg.description })
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profileId)

      if (error) throw error

      setAvatarUrl(null)
      setShowRemoveAvatarDialog(false)

      toast.success('Profile picture has been removed')

      onSuccess?.()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'general')
      toast.error(errorMsg.title, { description: errorMsg.description })
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal details and profile picture</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar Upload - Centered */}
            <div className="flex flex-col items-center space-y-4 pb-6 border-b">
            {avatarUrl ? (
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-24 w-24 rounded-full object-cover border-2 border-tinedy-dark/10"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={() => setShowRemoveAvatarDialog(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="h-24 w-24 rounded-full border-2 border-dashed flex items-center justify-center text-muted-foreground bg-tinedy-off-white/50">
                <User className="h-10 w-10" />
              </div>
            )}
            <div className="flex flex-col items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
                id="avatar-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingAvatar ? 'Uploading...' : 'Change Profile Picture'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                JPG, PNG or WEBP (max 2MB)
              </p>
            </div>
          </div>

          {/* Account Role */}
          {initialData?.role && (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-tinedy-dark">Account Role</p>
                </div>
              </div>
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm font-semibold capitalize">
                {initialData.role}
              </Badge>
            </div>
          )}

          {/* Full Name & Email - 2 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-medium">
                Full Name *
              </Label>
              <Controller
                name="full_name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="full_name"
                        placeholder="Enter your full name"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                    {fieldState.error && (
                      <p className="text-sm text-red-500">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            {/* Email - Read-only */}
            {initialData?.email && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={initialData.email}
                    disabled
                    className="pl-10 bg-tinedy-off-white/50"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
            )}
          </div>

          {/* Phone Number & Join Date - 2 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </Label>
              <Controller
                name="phone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="0812345678"
                        className="pl-10"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || '')}
                      />
                    </div>
                    {fieldState.error && (
                      <p className="text-sm text-red-500">{fieldState.error.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      10 digits starting with 0 (optional)
                    </p>
                  </>
                )}
              />
            </div>

            {/* Join Date (if exists) */}
            {initialData?.created_at && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Join Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={format(new Date(initialData.created_at), 'MMMM dd, yyyy')}
                    disabled
                    className="pl-10 bg-tinedy-off-white/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Staff Number & Skills - 2 Columns */}
          {(initialData?.staff_number || (initialData?.skills && initialData.skills.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Staff Number (if exists) */}
              {initialData?.staff_number && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Staff Number (Read-only)</Label>
                  <Input
                    value={initialData.staff_number}
                    disabled
                    className="bg-tinedy-off-white/50"
                  />
                </div>
              )}

              {/* Skills (Read-only for staff) */}
              {initialData?.skills && initialData.skills.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Skills (Read-only)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {initialData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="bg-tinedy-blue hover:bg-tinedy-blue/90"
            >
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

      {/* Confirm Delete Avatar Dialog */}
      <ConfirmDialog
        open={showRemoveAvatarDialog}
        onOpenChange={setShowRemoveAvatarDialog}
        title="Remove Profile Picture"
        description="Are you sure you want to remove your profile picture? This action cannot be undone."
        variant="danger"
        confirmLabel="Remove Picture"
        cancelLabel="Cancel"
        onConfirm={handleRemoveAvatar}
      />
    </>
  )
}
