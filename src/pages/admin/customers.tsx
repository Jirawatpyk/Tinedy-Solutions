import type { CustomerRecord } from '@/types'
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/lib/error-utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/use-debounce'
import { Plus, Search, Edit, Mail, Phone, MapPin, Users, UserCheck, UserPlus, MessageCircle, Tag } from 'lucide-react'
import { TagInput } from '@/components/customers/tag-input'
import { formatDate } from '@/lib/utils'
import { getTagColor } from '@/lib/tag-utils'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/common/DeleteButton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AdminCustomers() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null)

  // Debounce search query to reduce filtering overhead
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Pagination
  const [displayCount, setDisplayCount] = useState(12)
  const ITEMS_PER_LOAD = 12

  const { toast } = useToast()

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    line_id: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    relationship_level: 'new' as 'new' | 'regular' | 'vip' | 'inactive',
    preferred_contact_method: 'phone' as 'phone' | 'email' | 'line' | 'sms',
    tags: [] as string[],
    source: '',
    birthday: '',
    company_name: '',
    tax_id: '',
    notes: '',
  })

  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load customers',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const filterCustomers = useCallback(() => {
    let filtered = customers

    // Filter by search query (using debounced value)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (customer) =>
          customer.full_name.toLowerCase().includes(query) ||
          customer.email.toLowerCase().includes(query) ||
          customer.phone.includes(debouncedSearchQuery)
      )
    }

    // Filter by relationship level
    if (relationshipFilter !== 'all') {
      filtered = filtered.filter(
        (customer) => customer.relationship_level === relationshipFilter
      )
    }

    setFilteredCustomers(filtered)
    // Reset display count when filter changes
    setDisplayCount(ITEMS_PER_LOAD)
  }, [customers, debouncedSearchQuery, relationshipFilter, ITEMS_PER_LOAD])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    filterCustomers()
  }, [filterCustomers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Clean up form data - convert empty strings to null for optional fields
      const cleanedData = {
        ...formData,
        line_id: formData.line_id || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        source: formData.source || null,
        birthday: formData.birthday || null, // Convert empty string to null for date field
        company_name: formData.company_name || null,
        tax_id: formData.tax_id || null,
        notes: formData.notes || null,
        tags: formData.tags && formData.tags.length > 0 ? formData.tags : null,
      }

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(cleanedData)
          .eq('id', editingCustomer.id)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'CustomerRecord updated successfully',
        })
      } else {
        const { error } = await supabase.from('customers').insert(cleanedData)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'CustomerRecord created successfully',
        })
      }

      setIsDialogOpen(false)
      resetForm()
      fetchCustomers()
    } catch (error) {
      console.error('Error saving customer:', error)
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const deleteCustomer = async (customerId: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'CustomerRecord deleted successfully',
      })
      fetchCustomers()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete customer',
        variant: 'destructive',
      })
    }
  }

  const openEditDialog = (customer: CustomerRecord) => {
    setEditingCustomer(customer)
    setFormData({
      full_name: customer.full_name,
      email: customer.email,
      phone: customer.phone,
      line_id: customer.line_id || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zip_code: customer.zip_code || '',
      relationship_level: customer.relationship_level || 'new',
      preferred_contact_method: customer.preferred_contact_method || 'phone',
      tags: customer.tags || [],
      source: customer.source || '',
      birthday: customer.birthday || '',
      company_name: customer.company_name || '',
      tax_id: customer.tax_id || '',
      notes: customer.notes || '',
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setEditingCustomer(null)
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      line_id: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      relationship_level: 'new',
      preferred_contact_method: 'phone',
      tags: [],
      source: '',
      birthday: '',
      company_name: '',
      tax_id: '',
      notes: '',
    })
  }

  const getCustomerStats = () => {
    const totalCustomers = customers.length
    const vipCustomers = customers.filter(c => c.relationship_level === 'vip').length
    const activeCustomers = customers.filter(c => c.relationship_level !== 'inactive').length
    const recentCustomers = customers.filter(c => {
      const createdDate = new Date(c.created_at)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return createdDate >= thirtyDaysAgo
    }).length
    return { totalCustomers, vipCustomers, activeCustomers, recentCustomers }
  }

  const stats = getCustomerStats()

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header - Always show */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-tinedy-dark">
              Customers Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your customer database
            </p>
          </div>
          <Button className="bg-tinedy-blue hover:bg-tinedy-blue/90" disabled>
            <Plus className="h-4 w-4 mr-2" />
            New Customer
          </Button>
        </div>

        {/* Stats Cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24 mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filters skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-full sm:w-48" />
            </div>
          </CardContent>
        </Card>

        {/* CustomerRecord cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Skeleton className="h-6 w-40" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-24" />
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
            Customers Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer database
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-tinedy-blue hover:bg-tinedy-blue/90"
              onClick={resetForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Edit Customer' : 'New Customer'}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer
                  ? 'Update customer information'
                  : 'Add a new customer to your database'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line_id">LINE ID</Label>
                  <Input
                    id="line_id"
                    value={formData.line_id}
                    onChange={(e) =>
                      setFormData({ ...formData, line_id: e.target.value })
                    }
                    placeholder="@username"
                  />
                </div>
              </div>

              {/* Relationship & Contact Section */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground">Relationship & Contact Preferences</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="relationship_level">Relationship Level</Label>
                    <Select
                      value={formData.relationship_level}
                      onValueChange={(value: 'new' | 'regular' | 'vip' | 'inactive') =>
                        setFormData({ ...formData, relationship_level: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">🆕 New Customer</SelectItem>
                        <SelectItem value="regular">💚 Regular Customer</SelectItem>
                        <SelectItem value="vip">👑 VIP Customer</SelectItem>
                        <SelectItem value="inactive">💤 Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferred_contact_method">Preferred Contact</Label>
                    <Select
                      value={formData.preferred_contact_method}
                      onValueChange={(value: 'phone' | 'email' | 'line' | 'sms') =>
                        setFormData({ ...formData, preferred_contact_method: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">📱 Phone</SelectItem>
                        <SelectItem value="email">✉️ Email</SelectItem>
                        <SelectItem value="line">💬 LINE</SelectItem>
                        <SelectItem value="sms">💌 SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source">How did they find us?</Label>
                    <Select
                      value={formData.source || undefined}
                      onValueChange={(value) =>
                        setFormData({ ...formData, source: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="google">Google Search</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="walk-in">Walk-in</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthday">Birthday</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={formData.birthday}
                      onChange={(e) =>
                        setFormData({ ...formData, birthday: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Tags Section */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-tinedy-blue" />
                  <Label htmlFor="tags">CustomerRecord Tags</Label>
                </div>
                <TagInput
                  tags={formData.tags}
                  onChange={(newTags) => setFormData({ ...formData, tags: newTags })}
                />
              </div>

              {/* Corporate Information (Optional) */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground">Corporate Information (Optional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) =>
                        setFormData({ ...formData, company_name: e.target.value })
                      }
                      placeholder="ABC Company Ltd."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">Tax ID</Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) =>
                        setFormData({ ...formData, tax_id: e.target.value })
                      }
                      placeholder="0-0000-00000-00-0"
                    />
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground">Address Information</h3>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">Zip Code</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) =>
                      setFormData({ ...formData, zip_code: e.target.value })
                    }
                  />
                </div>
              </div>
              </div>

              {/* Notes Section */}
              <div className="border-t pt-4 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Add any additional notes about this customer..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
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
                  {editingCustomer ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-tinedy-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-tinedy-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.totalCustomers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              In your database
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
            <span className="text-xl">👑</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.vipCustomers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Premium tier customers
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-tinedy-green">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <UserCheck className="h-4 w-4 text-tinedy-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.activeCustomers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Not marked as inactive
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <UserPlus className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.recentCustomers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Added in last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, email or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="vip">👑 VIP Only</SelectItem>
                  <SelectItem value="regular">💚 Regular Only</SelectItem>
                  <SelectItem value="new">🆕 New Only</SelectItem>
                  <SelectItem value="inactive">💤 Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers list */}
      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No customers found
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.slice(0, displayCount).map((customer) => {
            const hasCompleteProfile = customer.address && customer.city && customer.state
            const isRecent = () => {
              const createdDate = new Date(customer.created_at)
              const sevenDaysAgo = new Date()
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
              return createdDate >= sevenDaysAgo
            }

            // Relationship level badge config
            const relationshipConfig = {
              new: { label: '🆕 New', className: 'bg-gray-100 text-gray-700 border-gray-300' },
              regular: { label: '💚 Regular', className: 'bg-green-100 text-green-700 border-green-300' },
              vip: { label: '👑 VIP', className: 'bg-amber-100 text-amber-700 border-amber-300' },
              inactive: { label: '💤 Inactive', className: 'bg-red-100 text-red-700 border-red-300' },
            }

            const relationshipInfo = relationshipConfig[customer.relationship_level]

            // Preferred contact icon
            const contactIcons = {
              phone: <Phone className="h-3 w-3" />,
              email: <Mail className="h-3 w-3" />,
              line: <MessageCircle className="h-3 w-3" />,
              sms: <MessageCircle className="h-3 w-3" />,
            }

            return (
              <Card
                key={customer.id}
                className="hover:shadow-lg transition-all hover:border-tinedy-blue/50 cursor-pointer"
                onClick={() => navigate(`/admin/customers/${customer.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-full bg-tinedy-blue flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                        {customer.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-display text-tinedy-dark mb-2">
                          {customer.full_name}
                        </CardTitle>
                      <div className="flex flex-wrap gap-1.5">
                        {/* Relationship Level Badge */}
                        <Badge variant="outline" className={`text-xs ${relationshipInfo.className}`}>
                          {relationshipInfo.label}
                        </Badge>

                        {/* Preferred Contact Badge */}
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50">
                          {contactIcons[customer.preferred_contact_method]}
                          <span className="ml-1">{customer.preferred_contact_method.toUpperCase()}</span>
                        </Badge>

                        {/* Complete Profile Badge */}
                        {hasCompleteProfile && (
                          <Badge variant="outline" className="border-tinedy-green text-tinedy-green bg-green-50 text-xs">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        )}

                        {/* Recent Badge */}
                        {isRecent() && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                            ✨ Recent
                          </Badge>
                        )}

                        {/* CustomerRecord Tags */}
                        {customer.tags && customer.tags.length > 0 && (
                          <>
                            {customer.tags.slice(0, 2).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className={`text-xs ${getTagColor(tag)}`}
                              >
                                {tag}
                              </Badge>
                            ))}
                            {customer.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700">
                                +{customer.tags.length - 2}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditDialog(customer)
                        }}
                        className="h-8 w-8 hover:bg-tinedy-blue/10 hover:text-tinedy-blue"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <DeleteButton
                        itemName={customer.full_name}
                        onDelete={() => deleteCustomer(customer.id)}
                        className="h-8 w-8"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="flex items-center text-sm">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 mr-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-muted-foreground truncate">{customer.email}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-50 mr-2">
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-muted-foreground">{customer.phone}</span>
                  </div>
                  {customer.line_id && (
                    <div className="flex items-center text-sm">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 mr-2">
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                      </div>
                      <span className="text-muted-foreground">{customer.line_id}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-start text-sm">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-50 mr-2 mt-0.5">
                        <MapPin className="h-4 w-4 text-orange-600" />
                      </div>
                      <span className="text-muted-foreground flex-1">
                        {customer.address}
                        {customer.city && `, ${customer.city}`}
                        {customer.state && `, ${customer.state}`}
                        {customer.zip_code && ` ${customer.zip_code}`}
                      </span>
                    </div>
                  )}
                  {customer.notes && (
                    <div className="bg-muted/50 rounded-md p-3 mt-3">
                      <p className="text-sm text-muted-foreground">
                        {customer.notes}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground border-t pt-2 mt-3">
                    Added {formatDate(customer.created_at)}
                  </p>
                </CardContent>
              </Card>
            )
          })}
          </div>

          {/* Load More Button */}
          {displayCount < filteredCustomers.length && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Showing {displayCount} of {filteredCustomers.length} customers
                </p>
                <Button
                  variant="outline"
                  onClick={() => setDisplayCount(prev => prev + ITEMS_PER_LOAD)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Load More Customers
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
