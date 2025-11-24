/**
 * GeneralSettingsForm Component
 *
 * ฟอร์มสำหรับจัดการข้อมูลธุรกิจทั่วไป
 * - ข้อมูลธุรกิจ (ชื่อ, อีเมล, เบอร์โทร, ที่อยู่, คำอธิบาย)
 * - อัพโหลด Logo
 * - ใช้ React Hook Form + Zod validation
 */

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import {
  GeneralSettingsSchema,
  GeneralSettingsTransformSchema,
  validateLogoFile,
  type GeneralSettingsFormData,
} from '@/schemas'
import { Building2, Mail, Phone, MapPin, Save, Upload, X } from 'lucide-react'
import { useState, useRef } from 'react'

interface GeneralSettingsFormProps {
  initialData?: Partial<GeneralSettingsFormData> & { business_logo_url?: string | null }
  settingsId?: string
  onSuccess?: () => void
}

export function GeneralSettingsForm({ initialData, settingsId, onSuccess }: GeneralSettingsFormProps) {
  const { toast } = useToast()
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialData?.business_logo_url || null)
  const [showRemoveLogoDialog, setShowRemoveLogoDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(GeneralSettingsSchema),
    defaultValues: {
      business_name: initialData?.business_name || '',
      business_email: initialData?.business_email || '',
      business_phone: initialData?.business_phone || '',
      business_address: initialData?.business_address || '',
      business_description: initialData?.business_description || '',
    },
  })

  const onSubmit = async (data: GeneralSettingsFormData) => {
    try {
      // Transform data
      const transformedData = GeneralSettingsTransformSchema.parse(data)

      // Update settings
      const { error } = await supabase
        .from('settings')
        .update(transformedData)
        .eq('id', settingsId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'General settings saved successfully',
      })

      onSuccess?.()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'general')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateLogoFile(file)
    if (!validation.valid) {
      toast({
        title: 'Invalid File',
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    try {
      setUploadingLogo(true)

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `business-logo-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-logos')
        .getPublicUrl(uploadData.path)

      // Update settings with new logo URL
      const { error: updateError } = await supabase
        .from('settings')
        .update({ business_logo_url: publicUrl })
        .eq('id', settingsId)

      if (updateError) throw updateError

      setLogoUrl(publicUrl)

      toast({
        title: 'Logo Uploaded',
        description: 'Business logo has been updated successfully',
      })
    } catch (error) {
      console.error('Error uploading logo:', error)
      const errorMsg = mapErrorToUserMessage(error, 'general')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveLogo = async () => {
    try {
      const { error } = await supabase
        .from('settings')
        .update({ business_logo_url: null })
        .eq('id', settingsId)

      if (error) throw error

      setLogoUrl(null)
      setShowRemoveLogoDialog(false)

      toast({
        title: 'Logo Removed',
        description: 'Business logo has been removed',
      })
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'general')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          General Settings
        </CardTitle>
        <CardDescription>
          Manage your business information and branding
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Business Logo */}
          <div className="space-y-2">
            <Label>Business Logo</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative">
                  <img
                    src={logoUrl}
                    alt="Business Logo"
                    className="h-20 w-20 object-contain rounded border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => setShowRemoveLogoDialog(true)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="h-20 w-20 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                  <Building2 className="h-8 w-8" />
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                </Button>
                <p className="text-sm text-muted-foreground mt-1">
                  JPG, PNG or WEBP. Max 2MB.
                </p>
              </div>
            </div>
          </div>

          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="business_name" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Business Name *
            </Label>
            <Controller
              name="business_name"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    id="business_name"
                    placeholder="Tinedy Solutions"
                    {...field}
                  />
                  {fieldState.error && (
                    <p className="text-sm text-red-500">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>

          {/* Business Email */}
          <div className="space-y-2">
            <Label htmlFor="business_email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Business Email *
            </Label>
            <Controller
              name="business_email"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    id="business_email"
                    type="email"
                    placeholder="contact@tinedy.com"
                    {...field}
                  />
                  {fieldState.error && (
                    <p className="text-sm text-red-500">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>

          {/* Business Phone */}
          <div className="space-y-2">
            <Label htmlFor="business_phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Business Phone *
            </Label>
            <Controller
              name="business_phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    id="business_phone"
                    placeholder="02-123-4567"
                    {...field}
                  />
                  {fieldState.error && (
                    <p className="text-sm text-red-500">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>

          {/* Business Address */}
          <div className="space-y-2">
            <Label htmlFor="business_address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Business Address *
            </Label>
            <Controller
              name="business_address"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Textarea
                    id="business_address"
                    placeholder="123 Business Street, Bangkok, Thailand"
                    rows={3}
                    {...field}
                  />
                  {fieldState.error && (
                    <p className="text-sm text-red-500">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>

          {/* Business Description */}
          <div className="space-y-2">
            <Label htmlFor="business_description">Business Description</Label>
            <Controller
              name="business_description"
              control={form.control}
              render={({ field }) => (
                <Textarea
                  id="business_description"
                  placeholder="Optional description of your business"
                  rows={4}
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value || '')}
                />
              )}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="bg-tinedy-blue hover:bg-tinedy-blue/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Confirm Delete Logo Dialog */}
      <ConfirmDialog
        open={showRemoveLogoDialog}
        onOpenChange={setShowRemoveLogoDialog}
        title="Remove Business Logo"
        description="Are you sure you want to remove the business logo? This action cannot be undone."
        variant="danger"
        confirmLabel="Remove Logo"
        cancelLabel="Cancel"
        onConfirm={handleRemoveLogo}
      />
    </Card>
  )
}
