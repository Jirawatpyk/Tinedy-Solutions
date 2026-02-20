import type { CustomerRecord } from '@/types'
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomers } from '@/hooks/use-customers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { StatCard } from '@/components/common/StatCard/StatCard'
import { getLoadErrorMessage } from '@/lib/error-messages'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/use-debounce'
import { AdminOnly } from '@/components/auth/permission-guard'
import { Plus, Search, Edit, Mail, Phone, MapPin, Users, UserCheck, UserPlus, MessageCircle, RotateCcw, UserX } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { CustomerFormSheet } from '@/components/customers/CustomerFormSheet'
import { formatDate } from '@/lib/utils'
import { getTagColor } from '@/lib/tag-utils'
import { Badge } from '@/components/ui/badge'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { useOptimisticDelete } from '@/hooks/optimistic'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AdminCustomers() {
  const navigate = useNavigate()

  // Both admin and manager use /admin routes
  const basePath = '/admin'
  const [searchQuery, setSearchQuery] = useState('')
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all')

  // Archive filter
  const [showArchived, setShowArchived] = useState(false)

  // Use React Query hook for customers data
  const { customers, loading, refresh, error: customersError } = useCustomers({
    showArchived,
    enableRealtime: true
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null)

  // Debounce search query to reduce filtering overhead
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Pagination
  const [displayCount, setDisplayCount] = useState(12)
  const ITEMS_PER_LOAD = 12

  // Initialize optimistic delete hook
  const deleteOps = useOptimisticDelete({
    table: 'customers',
    onSuccess: refresh,
  })

  // Filter customers using useMemo for better performance
  const filteredCustomers = useMemo(() => {
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

    return filtered
  }, [customers, debouncedSearchQuery, relationshipFilter])

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_LOAD)
  }, [debouncedSearchQuery, relationshipFilter, ITEMS_PER_LOAD])

  // Handle customers error
  useEffect(() => {
    if (customersError) {
      const errorMessage = getLoadErrorMessage('customer')
      toast.error(errorMessage.title, { description: customersError })
    }
  }, [customersError])

  const deleteCustomer = async (customerId: string) => {
    deleteOps.permanentDelete.mutate({ id: customerId })
  }

  const archiveCustomer = async (customerId: string) => {
    deleteOps.softDelete.mutate({ id: customerId })
  }

  const restoreCustomer = async (customerId: string) => {
    deleteOps.restore.mutate({ id: customerId })
  }

  const openEditDialog = (customer: CustomerRecord) => {
    setEditingCustomer(customer)
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingCustomer(null)
    setIsDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingCustomer(null)
  }

  const handleDialogSuccess = () => {
    refresh()
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
        <PageHeader
          title="Customers"
          subtitle="Manage your customer database"
          actions={
            <Button className="bg-tinedy-blue hover:bg-tinedy-blue/90" disabled>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Customer</span>
            </Button>
          }
        />

        {/* Stats Cards skeleton */}
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCard
              key={i}
              title=""
              value={0}
              isLoading={true}
            />
          ))}
        </div>

        {/* Search and Filters skeleton */}
        <Card>
          <CardContent className="py-3 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 w-full sm:w-48" />
            </div>
          </CardContent>
        </Card>

        {/* CustomerRecord cards skeleton */}
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-5 sm:h-6 w-32 sm:w-40" />
                  <div className="flex gap-1">
                    <Skeleton className="h-7 w-7 sm:h-8 sm:w-8" />
                    <Skeleton className="h-7 w-7 sm:h-8 sm:w-8" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6">
                <Skeleton className="h-3 sm:h-4 w-full" />
                <Skeleton className="h-3 sm:h-4 w-28 sm:w-32" />
                <Skeleton className="h-3 sm:h-4 w-40 sm:w-48" />
                <Skeleton className="h-8 sm:h-10 w-full" />
                <Skeleton className="h-3 w-20 sm:w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Manage your customer database"
        actions={
          <>
            <AdminOnly>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-archived-customers"
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
                <label
                  htmlFor="show-archived-customers"
                  className="hidden sm:block text-sm font-medium cursor-pointer"
                >
                  Show archived
                </label>
              </div>
            </AdminOnly>
            <Button
              className="bg-tinedy-blue hover:bg-tinedy-blue/90"
              onClick={openCreateDialog}
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Customer</span>
            </Button>
          </>
        }
      />

      {/* Customer Form Sheet */}
      <CustomerFormSheet
        open={isDialogOpen}
        onOpenChange={(o) => !o && handleDialogClose()}
        onSuccess={handleDialogSuccess}
        customer={editingCustomer}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          description="In your database"
          icon={Users}
          iconColor="text-tinedy-blue"
        />

        <StatCard
          title="VIP Customers"
          value={stats.vipCustomers}
          description="Premium tier customers"
          icon={UserCheck}
          iconColor="text-amber-500"
        />

        <StatCard
          title="Active Customers"
          value={stats.activeCustomers}
          description="Not marked as inactive"
          icon={UserCheck}
          iconColor="text-tinedy-green"
        />

        <StatCard
          title="New This Month"
          value={stats.recentCustomers}
          description="Added in last 30 days"
          icon={UserPlus}
          iconColor="text-purple-500"
        />
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="py-3 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
                <SelectTrigger className="h-8 text-xs">
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
          <CardContent className="py-4 sm:py-6">
            <EmptyState
              icon={searchQuery || relationshipFilter !== 'all' ? Search : UserX}
              title={searchQuery || relationshipFilter !== 'all' ? 'No customers found' : 'No customers yet'}
              description={
                searchQuery || relationshipFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first customer'
              }
              action={
                searchQuery || relationshipFilter !== 'all'
                  ? {
                      label: 'Clear filters',
                      onClick: () => {
                        setSearchQuery('')
                        setRelationshipFilter('all')
                      },
                    }
                  : {
                      label: 'Add Customer',
                      onClick: openCreateDialog,
                      icon: Plus,
                    }
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.slice(0, displayCount).map((customer) => {
            const isArchived = !!customer.deleted_at
            const hasCompleteProfile = customer.address && customer.city && customer.state
            const isRecent = () => {
              const createdDate = new Date(customer.created_at)
              const sevenDaysAgo = new Date()
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
              return createdDate >= sevenDaysAgo
            }

            // Relationship level badge config
            const relationshipConfig = {
              new: { label: '🆕 New', className: 'bg-tinedy-off-white text-tinedy-dark border-tinedy-dark/20' },
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
                className={`card-interactive ${isArchived ? 'opacity-60 border-dashed' : ''}`}
                onClick={() => navigate(`${basePath}/customers/${customer.id}`)}
              >
                <CardHeader className="pb-3 px-4 sm:px-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${isArchived ? 'bg-tinedy-dark/40' : 'bg-tinedy-blue'} flex items-center justify-center text-white font-semibold text-base sm:text-lg flex-shrink-0`}>
                        {customer.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg font-display text-tinedy-dark mb-1 sm:mb-2 truncate">
                          {customer.full_name}
                        </CardTitle>
                      <div className="flex flex-wrap gap-1 sm:gap-1.5">
                        {/* Archived Badge */}
                        {isArchived && (
                          <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 text-[10px] sm:text-xs">
                            Archived
                          </Badge>
                        )}

                        {/* Relationship Level Badge */}
                        <Badge variant="outline" className={`text-[10px] sm:text-xs ${relationshipInfo.className}`}>
                          {relationshipInfo.label}
                        </Badge>

                        {/* Preferred Contact Badge */}
                        <Badge variant="outline" className="text-[10px] sm:text-xs border-blue-300 text-blue-700 bg-blue-50">
                          <span className="flex items-center gap-0.5 sm:gap-1">
                            {contactIcons[customer.preferred_contact_method]}
                            <span>{customer.preferred_contact_method.toUpperCase()}</span>
                          </span>
                        </Badge>

                        {/* Complete Profile Badge */}
                        {hasCompleteProfile && (
                          <Badge variant="outline" className="border-tinedy-green text-tinedy-green bg-green-50 text-[10px] sm:text-xs">
                            <UserCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                            Complete
                          </Badge>
                        )}

                        {/* Recent Badge */}
                        {isRecent() && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-[10px] sm:text-xs">
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
                                className={`text-[10px] sm:text-xs ${getTagColor(tag)}`}
                              >
                                {tag}
                              </Badge>
                            ))}
                            {customer.tags.length > 2 && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs bg-tinedy-off-white text-tinedy-dark">
                                +{customer.tags.length - 2}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {isArchived ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            restoreCustomer(customer.id)
                          }}
                          className="border-green-500 text-green-700 hover:bg-green-50 text-xs"
                        >
                          <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Restore</span>
                        </Button>
                      ) : (
                        <>
                          <SimpleTooltip content="Edit customer">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditDialog(customer)
                              }}
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              disabled={isArchived}
                            >
                              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </SimpleTooltip>
                          <PermissionAwareDeleteButton
                            resource="customers"
                            itemName={customer.full_name}
                            onDelete={() => deleteCustomer(customer.id)}
                            onCancel={() => archiveCustomer(customer.id)}
                            cancelText="Archive"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            warningMessage={
                              customer.booking_count > 0
                                ? `This customer has ${customer.booking_count} booking(s) that will also be deleted.`
                                : undefined
                            }
                          />
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-2.5 px-4 sm:px-6">
                  <div className="flex items-center text-xs sm:text-sm">
                    <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-50 mr-2 flex-shrink-0">
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    </div>
                    <span className="text-muted-foreground truncate">{customer.email}</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm">
                    <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-50 mr-2 flex-shrink-0">
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                    </div>
                    <span className="text-muted-foreground">{customer.phone}</span>
                  </div>
                  {customer.line_id && (
                    <div className="flex items-center text-xs sm:text-sm">
                      <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 mr-2 flex-shrink-0">
                        <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600" />
                      </div>
                      <span className="text-muted-foreground">{customer.line_id}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-start text-xs sm:text-sm">
                      <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-50 mr-2 mt-0.5 flex-shrink-0">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                      </div>
                      <span className="text-muted-foreground flex-1 line-clamp-2">
                        {customer.address}
                        {customer.city && `, ${customer.city}`}
                        {customer.state && `, ${customer.state}`}
                        {customer.zip_code && ` ${customer.zip_code}`}
                      </span>
                    </div>
                  )}
                  {customer.notes && (
                    <div className="bg-muted/50 rounded-md p-2 sm:p-3 mt-2 sm:mt-3">
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {customer.notes}
                      </p>
                    </div>
                  )}
                  <p className="text-[10px] sm:text-xs text-muted-foreground border-t pt-2 mt-2 sm:mt-3">
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
              <CardContent className="flex flex-col items-center justify-center py-4 sm:py-6 px-4 sm:px-6">
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  <span className="hidden sm:inline">Showing {displayCount} of {filteredCustomers.length} customers</span>
                  <span className="sm:hidden">{displayCount} of {filteredCustomers.length}</span>
                </p>
                <Button
                  variant="outline"
                  onClick={() => setDisplayCount(prev => prev + ITEMS_PER_LOAD)}
                  className="gap-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Load More Customers</span>
                  <span className="sm:hidden">Load More</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
