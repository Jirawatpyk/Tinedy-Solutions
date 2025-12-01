import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/common/StatCard/StatCard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { AdminOnly } from '@/components/auth/permission-guard'
import { Plus, Search, Edit, Mail, Phone, User, Shield, Hash, Award, Star, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { mapErrorToUserMessage, getLoadErrorMessage, getDeleteErrorMessage } from '@/lib/error-messages'
import { useAuth } from '@/contexts/auth-context'
import { useStaffWithRatings } from '@/hooks/useStaff'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  StaffCreateSchema,
  StaffUpdateSchema,
  StaffCreateWithSkillsSchema,
  StaffUpdateWithSkillsSchema,
  type StaffCreateFormData,
  type StaffUpdateFormData,
} from '@/schemas'

export function AdminStaff() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { staff, loading,refresh, error: staffError} = useStaffWithRatings({
    enableRealtime: true,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<(typeof staff)[0] | null>(null)

  // Both admin and manager use /admin routes
  const basePath = '/admin'

  // Pagination
  const [displayCount, setDisplayCount] = useState(12)
  const ITEMS_PER_LOAD = 12

  const { toast } = useToast()

  // React Hook Form - Create Form (uses base schema, transforms on submit)
  const createForm = useForm<StaffCreateFormData>({
    resolver: zodResolver(StaffCreateSchema),
    defaultValues: {
      email: '',
      full_name: '',
      phone: '',
      role: 'staff',
      password: '',
      staff_number: '',
      skills: '',
    },
  })

  // React Hook Form - Update Form (uses base schema, transforms on submit)
  const updateForm = useForm<StaffUpdateFormData>({
    resolver: zodResolver(StaffUpdateSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      role: 'staff',
      staff_number: '',
      skills: '',
    },
  })

  // Filter staff with useMemo for better performance
  const filteredStaff = useMemo(() => {
    let filtered = staff

    if (searchQuery) {
      filtered = filtered.filter(
        (member) =>
          member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((member) => member.role === roleFilter)
    }

    return filtered
  }, [staff, searchQuery, roleFilter])

  // Reset display count when filter changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_LOAD)
  }, [filteredStaff, ITEMS_PER_LOAD])

  // Error handling for staff loading
  useEffect(() => {
    if (staffError) {
      const errorMessage = getLoadErrorMessage('staff')
      toast({
        title: errorMessage.title,
        description: staffError,
        variant: 'destructive',
      })
    }
  }, [staffError, toast])

  const onSubmit = async (data: StaffCreateFormData | StaffUpdateFormData) => {
    try {
      if (editingStaff) {
        // Update existing staff - transform form data to WithSkills type
        const updateData = StaffUpdateWithSkillsSchema.parse(data)

        // Manager ไม่สามารถแก้ไข role ได้ - ส่งเฉพาะ fields ที่อนุญาต
        const updatePayload = profile?.role === 'admin'
          ? {
              full_name: updateData.full_name,
              phone: updateData.phone,
              role: updateData.role, // Admin เท่านั้นที่สามารถเปลี่ยน role
              staff_number: updateData.staff_number,
              skills: updateData.skills && updateData.skills.length > 0 ? updateData.skills : null,
            }
          : {
              full_name: updateData.full_name,
              phone: updateData.phone,
              // Manager ไม่ส่ง role field เพื่อป้องกัน RLS policy error
              staff_number: updateData.staff_number,
              skills: updateData.skills && updateData.skills.length > 0 ? updateData.skills : null,
            }

        const { error } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', editingStaff.id)

        if (error) {
          // Log error for debugging
          console.error('[Update Staff] Database error:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          })

          // Check for duplicate staff_number error (PostgreSQL unique constraint violation)
          if (error.code === '23505') {
            // Check if it's staff_number or email duplicate
            if (error.message.toLowerCase().includes('staff_number') ||
                error.details?.toLowerCase().includes('staff_number')) {
              throw new Error('This staff number is already in use. Please use a different staff number.')
            }
            if (error.message.toLowerCase().includes('email') ||
                error.details?.toLowerCase().includes('email')) {
              throw new Error('This email is already registered. Please use a different email.')
            }
            // Generic duplicate error
            throw new Error('Duplicate value detected. Please check your input.')
          }
          throw error
        }

        // Update password if provided
        const formData = data as StaffUpdateFormData
        if (formData.password && formData.password.trim()) {
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
                user_id: editingStaff.id,
                new_password: formData.password,
              }),
            }
          )

          const passwordResult = await passwordResponse.json()

          if (!passwordResult.success) {
            throw new Error(passwordResult.error || 'Failed to update password')
          }
        }

        toast({
          title: 'Success',
          description: 'Staff member updated successfully',
        })
      } else {
        // Create new staff - transform form data to WithSkills type
        const createData = StaffCreateWithSkillsSchema.parse(data)

        // Get auth token for Edge Function
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('Authentication required')
        }

        // Call Edge Function directly with fetch to get proper error responses
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

          // Log error for debugging
          console.error('[Create Staff] Edge Function error:', {
            errorMsg,
            responseData,
            response: { ok: response.ok, status: response.status }
          })

          // Check for duplicate email error (flexible matching)
          const errorLower = errorMsg.toLowerCase()
          if ((errorLower.includes('already') && errorLower.includes('registered')) ||
              (errorLower.includes('already') && errorLower.includes('email')) ||
              (errorLower.includes('user') && errorLower.includes('already')) ||
              errorLower.includes('already exists')) {
            throw new Error('This email is already registered. Please use a different email.')
          }

          // Check for duplicate staff_number error
          if (errorMsg.toLowerCase().includes('duplicate') &&
              errorMsg.toLowerCase().includes('staff_number')) {
            throw new Error('This staff number is already in use. Please use a different staff number.')
          }

          throw new Error(errorMsg)
        }

        toast({
          title: 'Success',
          description: 'Staff member created successfully',
        })
      }

      setIsDialogOpen(false)
      resetForm()
      refresh()
    } catch (error) {
      const errorMessage = mapErrorToUserMessage(error, 'staff')
      toast({
        title: errorMessage.title,
        description: errorMessage.description,
        variant: 'destructive',
      })
    }
  }

  const deleteStaff = async (staffId: string) => {
    try {
      // ป้องกันการลบโปรไฟล์ตัวเอง
      if (user?.id === staffId) {
        toast({
          title: 'Cannot delete your own profile',
          description: 'You cannot delete your own account. Please contact another administrator.',
          variant: 'destructive',
        })
        return
      }

      console.log('[Delete Staff] Starting deletion for userId:', staffId)

      // Call Edge Function to delete user from auth.users (will cascade to profiles)
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: staffId },
      })

      console.log('[Delete Staff] Edge Function response:', { data, error })

      if (error) {
        console.error('[Delete Staff] Edge Function error:', error)
        throw error
      }

      if (!data?.success) {
        console.error('[Delete Staff] Edge Function returned failure:', data)
        throw new Error(data?.error || data?.details || 'Failed to delete user')
      }

      console.log('[Delete Staff] Success!', data)

      toast({
        title: 'Success',
        description: data.message || 'Staff member deleted successfully',
      })
      refresh()
    } catch (error) {
      console.error('[Delete Staff] Caught error:', error)
      const errorMessage = getDeleteErrorMessage('staff')
      toast({
        title: errorMessage.title,
        description: errorMessage.description,
        variant: 'destructive',
      })
    }
  }

  const openEditDialog = (staffMember: typeof staff[0]) => {
    setEditingStaff(staffMember)
    updateForm.reset({
      full_name: staffMember.full_name,
      phone: staffMember.phone || '',
      password: '',
      role: staffMember.role as 'admin' | 'manager' | 'staff',
      staff_number: staffMember.staff_number || '',
      skills: staffMember.skills ? staffMember.skills.join(', ') : '',
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setEditingStaff(null)
    createForm.reset({
      email: '',
      full_name: '',
      phone: '',
      role: 'staff',
      password: '',
      staff_number: '',
      skills: '',
    })
    updateForm.reset({
      full_name: '',
      phone: '',
      password: '',
      role: 'staff',
      staff_number: '',
      skills: '',
    })
  }

  const getStaffStats = () => {
    const totalStaff = staff.length
    const admins = staff.filter(s => s.role === 'admin').length
    const managers = staff.filter(s => s.role === 'manager').length
    const staffMembers = staff.filter(s => s.role === 'staff').length
    return { totalStaff, admins, managers, staffMembers }
  }

  const stats = getStaffStats()

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header - Always show */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Manage your team members
          </p>
          <Button className="bg-tinedy-blue hover:bg-tinedy-blue/90" disabled>
            <Plus className="h-4 w-4 mr-2" />
            New Staff
          </Button>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCard
              key={i}
              title=""
              value={0}
              isLoading={true}
            />
          ))}
        </div>

        {/* Search and filter skeleton */}
        <Card>
          <CardContent className="py-3 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Skeleton className="h-8 sm:h-9 flex-1" />
              <Skeleton className="h-8 sm:h-9 w-full sm:w-48" />
            </div>
          </CardContent>
        </Card>

        {/* Staff cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: Math.min(staff.length, 9) || 9 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="p-4 sm:p-6 pb-1 sm:pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0" />
                    <div className="space-y-2 flex-1 min-w-0">
                      <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
                      <Skeleton className="h-4 sm:h-5 w-14 sm:w-16 rounded-full" />
                    </div>
                  </div>
                  <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                    <Skeleton className="h-8 w-8 sm:h-10 sm:w-10" />
                    <Skeleton className="h-8 w-8 sm:h-10 sm:w-10" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6 pt-0">
                <Skeleton className="h-3 sm:h-4 w-full" />
                <Skeleton className="h-3 sm:h-4 w-28 sm:w-32" />
                <Skeleton className="h-3 w-24 sm:w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[40px]">
        <p className="text-sm text-muted-foreground">
          Manage your team members
        </p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-tinedy-blue hover:bg-tinedy-blue/90"
              onClick={resetForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </DialogTitle>
              <DialogDescription>
                {editingStaff
                  ? 'Update staff member information'
                  : 'Create a new staff account'}
              </DialogDescription>
            </DialogHeader>

            {!editingStaff ? (
              // CREATE FORM
              <form onSubmit={createForm.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto flex-1 pr-4 pl-1">
                  <div className="space-y-4">
                {/* Email & Password - 2 Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    name="email"
                    control={createForm.control}
                    render={({ field, fieldState }) => (
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
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
                    name="password"
                    control={createForm.control}
                    render={({ field, fieldState }) => (
                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          {...field}
                          value={field.value || ''}
                        />
                        {fieldState.error && (
                          <p className="text-xs text-destructive">{fieldState.error.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Minimum 6 characters
                        </p>
                      </div>
                    )}
                  />
                </div>

                {/* Full Name & Phone - 2 Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    name="full_name"
                    control={createForm.control}
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
                    control={createForm.control}
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
                  name="staff_number"
                  control={createForm.control}
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
                      <p className="text-xs text-muted-foreground">
                        Leave empty for auto-generation
                      </p>
                    </div>
                  )}
                />

                <Controller
                  name="skills"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="skills">Skills</Label>
                      <Textarea
                        id="skills"
                        {...field}
                        value={field.value || ''}
                        placeholder="Cleaning, Plumbing, Electrical (comma-separated)"
                        rows={3}
                      />
                      {fieldState.error && (
                        <p className="text-xs text-destructive">{fieldState.error.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Enter skills separated by commas
                      </p>
                    </div>
                  )}
                />

                <Controller
                  name="role"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
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
                          <AdminOnly>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
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
                </div>
                <DialogFooter className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-tinedy-blue"
                  >
                    Create
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              // UPDATE FORM
              <form onSubmit={updateForm.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto flex-1 pr-4 pl-1">
                  <div className="space-y-4">
                {/* Full Name & Phone - 2 Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    name="full_name"
                    control={updateForm.control}
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
                    control={updateForm.control}
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
                  control={updateForm.control}
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
                  control={updateForm.control}
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
                  control={updateForm.control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="skills">Skills</Label>
                      <Textarea
                        id="skills"
                        {...field}
                        value={field.value || ''}
                        placeholder="Cleaning, Plumbing, Electrical (comma-separated)"
                        rows={3}
                      />
                      {fieldState.error && (
                        <p className="text-xs text-destructive">{fieldState.error.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Enter skills separated by commas
                      </p>
                    </div>
                  )}
                />

                <Controller
                  name="role"
                  control={updateForm.control}
                  render={({ field, fieldState }) => {
                    const isAdmin = profile?.role === 'admin'

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
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
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
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-tinedy-blue"
                  >
                    Update
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Staff"
          value={stats.totalStaff}
          description="All team members"
          icon={User}
          iconColor="text-tinedy-blue"
        />

        <StatCard
          title="Administrators"
          value={stats.admins}
          description="Full access users"
          icon={Shield}
          iconColor="text-tinedy-green"
        />

        <StatCard
          title="Managers"
          value={stats.managers}
          description="Team managers"
          icon={Users}
          iconColor="text-tinedy-purple"
        />

        <StatCard
          title="Staff Members"
          value={stats.staffMembers}
          description="Regular staff"
          icon={User}
          iconColor="text-tinedy-yellow"
        />
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-8 text-xs"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48 h-8 text-xs">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Staff list */}
      {filteredStaff.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No staff members found
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.slice(0, displayCount).map((member) => (
              <Card
                key={member.id}
                className="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
                onClick={() => navigate(`${basePath}/staff/${member.id}`)}
              >
                <CardHeader className="p-4 sm:p-6 pb-1 sm:pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-tinedy-blue flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-tinedy-blue flex items-center justify-center text-white font-semibold text-base sm:text-lg flex-shrink-0">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg font-display truncate">
                          {member.full_name}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                          <Badge
                            variant={member.role === 'admin' ? 'default' : member.role === 'manager' ? 'default' : 'secondary'}
                            className={`text-[10px] sm:text-xs ${member.role === 'manager' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                          >
                            {member.role === 'admin' ? '👑 Admin' : member.role === 'manager' ? '👔 Manager' : 'Staff'}
                          </Badge>
                          {member.average_rating !== undefined && (
                            <div className="flex items-center gap-1 text-yellow-500">
                              <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-yellow-400" />
                              <span className="text-[10px] sm:text-xs font-semibold text-gray-700">
                                {member.average_rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Admin: แก้ไขได้ทุกคน | Manager: แก้ไขได้ตัวเอง + Staff | Staff: แก้ไขได้ตัวเอง */}
                      {(profile?.role === 'admin' ||
                        member.id === user?.id ||
                        (profile?.role === 'manager' && member.role === 'staff')) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(member)}
                          className="h-8 w-8 sm:h-10 sm:w-10"
                        >
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      )}
                      {/* ซ่อนปุ่ม Delete ถ้าเป็นโปรไฟล์ตัวเอง */}
                      {user?.id !== member.id && (
                        <PermissionAwareDeleteButton
                          resource="staff"
                          itemName={member.full_name}
                          onDelete={() => deleteStaff(member.id)}
                          className="h-8 w-8 sm:h-10 sm:w-10"
                        />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6 pt-0">
                  <div className="flex items-center text-xs sm:text-sm text-muted-foreground min-w-0">
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                      <span className="break-words">{member.phone}</span>
                    </div>
                  )}
                  {member.staff_number && (
                    <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                      <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                      {member.staff_number}
                    </div>
                  )}
                  {member.skills && member.skills.length > 0 ? (
                    <div className="flex items-start sm:items-center gap-2">
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                        <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                        <span className="font-medium">Skills:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {member.skills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-[10px] sm:text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Award className="h-4 w-4 mr-2" />
                      <span className="italic">No skills added</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground border-t pt-2">
                    Joined {formatDate(member.created_at)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More Button */}
          {displayCount < filteredStaff.length && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Showing {displayCount} of {filteredStaff.length} staff members
                </p>
                <Button
                  variant="outline"
                  onClick={() => setDisplayCount(prev => prev + ITEMS_PER_LOAD)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Load More Staff
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
