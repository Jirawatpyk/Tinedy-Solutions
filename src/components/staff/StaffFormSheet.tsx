import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import {
  StaffCreateSchema,
  StaffCreateWithSkillsSchema,
  type StaffCreateFormData,
} from '@/schemas'
import { AppSheet } from '@/components/ui/app-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TagInput } from '@/components/ui/tag-input'
import { STAFF_SKILL_SUGGESTIONS, getSkillColor } from '@/constants/staff-skills'
import { AdminOnly } from '@/components/auth/permission-guard'
import { UserRole } from '@/types/common'

interface StaffFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const defaultValues: StaffCreateFormData = {
  email: '',
  full_name: '',
  phone: '',
  role: UserRole.Staff,
  password: '',
  staff_number: '',
  skills: [],
}

export function StaffFormSheet({ open, onOpenChange, onSuccess }: StaffFormSheetProps) {
  const form = useForm<StaffCreateFormData>({
    resolver: zodResolver(StaffCreateSchema),
    defaultValues,
  })

  // Reset form when sheet closes
  useEffect(() => {
    if (!open) {
      form.reset(defaultValues)
    }
  }, [open, form])

  const onSubmit = async (data: StaffCreateFormData) => {
    try {
      const createData = StaffCreateWithSkillsSchema.parse(data)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: createData.email,
            password: createData.password,
            full_name: createData.full_name,
            phone: createData.phone || null,
            role: createData.role,
            staff_number: createData.staff_number || null,
            skills: createData.skills && createData.skills.length > 0 ? createData.skills : null,
          }),
        }
      )

      const responseData = await response.json()

      if (!response.ok || !responseData?.success) {
        const errorMsg = responseData?.error || 'Failed to create staff member'
        const errorLower = errorMsg.toLowerCase()

        if ((errorLower.includes('already') && errorLower.includes('registered')) ||
            (errorLower.includes('already') && errorLower.includes('email')) ||
            (errorLower.includes('user') && errorLower.includes('already')) ||
            errorLower.includes('already exists')) {
          throw new Error('This email is already registered. Please use a different email.')
        }

        if (errorMsg.toLowerCase().includes('duplicate') &&
            errorMsg.toLowerCase().includes('staff_number')) {
          throw new Error('This staff number is already in use. Please use a different staff number.')
        }

        throw new Error(errorMsg)
      }

      toast.success('Staff member created successfully')
      onOpenChange(false)
      onSuccess()
      // form.reset happens in useEffect when open → false
    } catch (error) {
      const errorMessage = mapErrorToUserMessage(error, 'staff')
      toast.error(errorMessage.title, { description: errorMessage.description })
    }
  }

  return (
    <AppSheet open={open} onOpenChange={onOpenChange} title="Add New Staff Member" size="md">
      <div className="flex flex-col h-full">
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-20">
            {/* Email & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" {...field} value={field.value || ''} />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input id="password" type="password" {...field} value={field.value || ''} />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                  </div>
                )}
              />
            </div>

            {/* Full Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Controller
                name="full_name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input id="full_name" {...field} value={field.value || ''} />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              <Controller
                name="phone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" {...field} value={field.value || ''} />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Staff Number */}
            <Controller
              name="staff_number"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="staff_number">Staff Number</Label>
                  <Input
                    id="staff_number"
                    {...field}
                    value={field.value || ''}
                    placeholder="Auto-generated if left empty"
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Leave empty for auto-generation</p>
                </div>
              )}
            />

            {/* Skills */}
            <Controller
              name="skills"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="skills">Skills</Label>
                  <TagInput
                    tags={field.value || []}
                    onChange={field.onChange}
                    suggestions={[...STAFF_SKILL_SUGGESTIONS]}
                    getTagColor={getSkillColor}
                    placeholder="Type skill or select from suggestions..."
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />

            {/* Role */}
            <Controller
              name="role"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <AdminOnly>
                        <SelectItem value="manager">Admin</SelectItem>
                        <SelectItem value="admin">Super admin</SelectItem>
                      </AdminOnly>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
          </div>

          {/* Sticky footer */}
          <div className="sticky bottom-0 bg-background border-t pt-4 pb-6 flex gap-2 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-tinedy-blue"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Creating...' : 'Create Staff'}
            </Button>
          </div>
        </form>
      </div>
    </AppSheet>
  )
}
