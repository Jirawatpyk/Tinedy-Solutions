import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Plus, Search, Edit, Trash2, Mail, Phone, User, Shield, Hash, Award } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface StaffMember {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: 'admin' | 'staff'
  phone: string | null
  staff_number: string | null
  skills: string[] | null
  created_at: string
  updated_at: string
}

export function AdminStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)

  // Pagination
  const [displayCount, setDisplayCount] = useState(12)
  const ITEMS_PER_LOAD = 12

  const { toast } = useToast()

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'staff' as 'admin' | 'staff',
    password: '',
    staff_number: '',
    skills: '',
  })

  const fetchStaff = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, role, phone, staff_number, skills, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setStaff(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
      toast({
        title: 'Error',
        description: 'Failed to load staff members',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const filterStaff = useCallback(() => {
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

    setFilteredStaff(filtered)
    // Reset display count when filter changes
    setDisplayCount(ITEMS_PER_LOAD)
  }, [staff, searchQuery, roleFilter, ITEMS_PER_LOAD])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  useEffect(() => {
    filterStaff()
  }, [filterStaff])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Convert skills string to array
      const skillsArray = formData.skills
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0)

      if (editingStaff) {
        // Update existing staff
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role,
            skills: skillsArray.length > 0 ? skillsArray : null,
          })
          .eq('id', editingStaff.id)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Staff member updated successfully',
        })
      } else {
        // Call Edge Function to create staff (production-grade approach)
        const { data, error } = await supabase.functions.invoke('create-staff', {
          body: {
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role,
            staff_number: formData.staff_number || undefined,
            skills: skillsArray.length > 0 ? skillsArray : undefined,
          },
        })

        console.log('Edge Function Response:', { data, error })

        if (error) {
          console.error('Edge Function Error:', error)
          throw new Error(`Edge Function Error: ${error.message || JSON.stringify(error)}`)
        }

        if (!data?.success) {
          console.error('Edge Function returned failure:', data)
          throw new Error(data?.error || 'Failed to create staff')
        }

        toast({
          title: 'Success',
          description: 'Staff member created successfully',
        })
      }

      setIsDialogOpen(false)
      resetForm()
      fetchStaff()
    } catch (error) {
      const dbError = error as { message?: string }
      toast({
        title: 'Error',
        description: dbError.message || 'Failed to save staff member',
        variant: 'destructive',
      })
    }
  }

  const deleteStaff = async (staffId: string, staffName: string) => {
    if (!confirm(`Are you sure you want to delete ${staffName}?`)) return

    try {
      // Note: This only deletes from profiles table
      // For production, you should also delete from auth.users via Supabase admin API
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', staffId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Staff member deleted successfully',
      })
      fetchStaff()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete staff member',
        variant: 'destructive',
      })
    }
  }

  const openEditDialog = (staffMember: StaffMember) => {
    setEditingStaff(staffMember)
    setFormData({
      email: staffMember.email,
      full_name: staffMember.full_name,
      phone: staffMember.phone || '',
      role: staffMember.role,
      password: '', // Don't show existing password
      staff_number: staffMember.staff_number || '',
      skills: staffMember.skills ? staffMember.skills.join(', ') : '',
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setEditingStaff(null)
    setFormData({
      email: '',
      full_name: '',
      phone: '',
      role: 'staff',
      password: '',
      staff_number: '',
      skills: '',
    })
  }

  const getStaffStats = () => {
    const totalStaff = staff.length
    const admins = staff.filter(s => s.role === 'admin').length
    const staffMembers = staff.filter(s => s.role === 'staff').length
    return { totalStaff, admins, staffMembers }
  }

  const stats = getStaffStats()

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and filter skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-full sm:w-48" />
            </div>
          </CardContent>
        </Card>

        {/* Staff cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-28" />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-tinedy-dark">
            Staff Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your team members
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-tinedy-blue hover:bg-tinedy-blue/90"
              onClick={resetForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={!!editingStaff}
                  required
                />
              </div>

              {!editingStaff && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff_number">Staff Number</Label>
                <Input
                  id="staff_number"
                  value={formData.staff_number}
                  onChange={(e) =>
                    setFormData({ ...formData, staff_number: e.target.value })
                  }
                  placeholder="Auto-generated if left empty"
                  disabled={!!editingStaff}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for auto-generation
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills</Label>
                <Textarea
                  id="skills"
                  value={formData.skills}
                  onChange={(e) =>
                    setFormData({ ...formData, skills: e.target.value })
                  }
                  placeholder="Cleaning, Plumbing, Electrical (comma-separated)"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Enter skills separated by commas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'admin' | 'staff') =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-tinedy-blue">
                  {editingStaff ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <User className="h-4 w-4 text-tinedy-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.totalStaff}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-tinedy-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.admins}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Full access users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            <User className="h-4 w-4 text-tinedy-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.staffMembers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Regular staff
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
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
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-tinedy-blue flex items-center justify-center text-white font-semibold text-lg">
                        {member.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-display">
                          {member.full_name}
                        </CardTitle>
                        <Badge
                          variant={member.role === 'admin' ? 'default' : 'secondary'}
                          className="mt-1"
                        >
                          {member.role === 'admin' ? '👑 Admin' : 'Staff'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteStaff(member.id, member.full_name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 mr-2" />
                    {member.email}
                  </div>
                  {member.phone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      {member.phone}
                    </div>
                  )}
                  {member.staff_number && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Hash className="h-4 w-4 mr-2" />
                      {member.staff_number}
                    </div>
                  )}
                  {member.skills && member.skills.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Award className="h-4 w-4 mr-2" />
                        <span className="font-medium">Skills:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {member.skills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
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
