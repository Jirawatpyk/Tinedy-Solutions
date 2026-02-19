import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagInput } from '@/components/ui/tag-input'
import { STAFF_SKILL_SUGGESTIONS, getSkillColor } from '@/constants/staff-skills'
import { useAuth } from '@/contexts/auth-context'
import { UserRole } from '@/types/common'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import {
  StaffUpdateSchema,
  StaffUpdateWithSkillsSchema,
  type StaffUpdateFormData,
} from '@/schemas'

export interface StaffForEdit {
  id: string
  full_name: string
  phone?: string | null
  role: 'admin' | 'manager' | 'staff'
  staff_number?: string | null
  skills?: string[] | null
}

interface StaffEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: StaffForEdit | null
  onSuccess?: () => void
}

export function StaffEditDialog({
  open,
  onOpenChange,
  staff,
  onSuccess,
}: StaffEditDialogProps) {
  const { profile } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<StaffUpdateFormData>({
    resolver: zodResolver(StaffUpdateSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      role: 'staff',
      staff_number: '',
      skills: [],
      password: '',
    },
  })

  // Reset form when dialog opens with staff data from props
  // Note: staff data (including staff_number, skills) is passed from parent component
  useEffect(() => {
    if (!staff || !open) return

    form.reset({
      full_name: staff.full_name,
      phone: staff.phone || '',
      role: staff.role,
      staff_number: staff.staff_number || '',
      skills: staff.skills || [],
      password: '',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, open])

  const onSubmit = async (data: StaffUpdateFormData) => {
    if (!staff) return

    setIsSubmitting(true)
    try {
      // Transform form data to WithSkills type
      const updateData = StaffUpdateWithSkillsSchema.parse(data)

      // Build update payload - manager cannot change role
      const updatePayload = {
        full_name: updateData.full_name,
        phone: updateData.phone,
        staff_number: updateData.staff_number,
        skills: updateData.skills && updateData.skills.length > 0 ? updateData.skills : null,
        ...(profile?.role === UserRole.Admin && { role: updateData.role }),
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', staff.id)

      if (error) {
        console.error('[Update Staff] Database error:', error)

        if (error.code === '23505') {
          if (error.message.toLowerCase().includes('staff_number') ||
              error.details?.toLowerCase().includes('staff_number')) {
            throw new Error('This staff number is already in use. Please use a different staff number.')
          }
          if (error.message.toLowerCase().includes('email') ||
              error.details?.toLowerCase().includes('email')) {
            throw new Error('This email is already registered. Please use a different email.')
          }
          throw new Error('Duplicate value detected. Please check your input.')
        }
        throw error
      }

      // Update password if provided
      if (data.password && data.password.trim()) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('Authentication required')
        }

        const passwordResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-staff-password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              user_id: staff.id,
              new_password: data.password,
            }),
          }
        )

        const passwordResult = await passwordResponse.json()

        // Check both response.ok and result.success
        if (!passwordResponse.ok || !passwordResult.success) {
          console.error('[Update Password] Edge Function error:', passwordResult)
          throw new Error(passwordResult.error || 'Failed to update password')
        }
      }

      toast.success('Staff member updated successfully')

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      const errorMessage = mapErrorToUserMessage(error, 'staff')
      toast.error(errorMessage.title, { description: errorMessage.description })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isAdmin = profile?.role === UserRole.Admin

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
          <DialogDescription>
            Update staff member information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 pr-4 pl-1">
            <div className="space-y-4">
              {/* Full Name & Phone - 2 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Controller
                  name="full_name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        {...field}
                        value={field.value || ''}
                      />
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
                      <Input
                        id="phone"
                        type="tel"
                        {...field}
                        value={field.value || ''}
                      />
                      {fieldState.error && (
                        <p className="text-xs text-destructive">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      {...field}
                      value={field.value || ''}
                      placeholder="Leave blank to keep current password"
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Optional: Only fill if you want to change password (min 6 characters)
                    </p>
                  </div>
                )}
              />

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
                      placeholder="STF0001"
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Format: STF#### (e.g. STF0001)
                    </p>
                  </div>
                )}
              />

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

              <Controller
                name="role"
                control={form.control}
                render={({ field, fieldState }) => {
                  if (!isAdmin) {
                    // Manager view: Read-only
                    return (
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Input
                          id="role"
                          value={field.value.charAt(0).toUpperCase() + field.value.slice(1)}
                          disabled
                          className="bg-muted cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground">
                          Role cannot be changed. Contact admin if role change is needed.
                        </p>
                      </div>
                    )
                  }

                  // Admin view: Editable
                  return (
                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="manager">Admin</SelectItem>
                          <SelectItem value="admin">Super admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldState.error && (
                        <p className="text-xs text-destructive">{fieldState.error.message}</p>
                      )}
                    </div>
                  )
                }}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-tinedy-blue"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
