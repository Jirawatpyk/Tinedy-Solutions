import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/use-permissions'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { formatCurrency, formatDate } from '@/lib/utils'
import { formatTime } from '@/lib/booking-utils'
import type { ServicePackageV2WithTiers, PackagePricingTier } from '@/types'
import { PricingModel } from '@/types'

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Icons
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package as PackageIcon,
  DollarSign,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3,
  FileText,
} from 'lucide-react'

interface PackageStats {
  total_bookings: number
  completed_bookings: number
  pending_bookings: number
  cancelled_bookings: number
  total_revenue: number
  last_booking_date: string | null
}

interface BookingWithRelations {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  customers: {
    id: string
    full_name: string
    phone: string
  } | null
  profiles: {
    full_name: string
  } | null
  teams: {
    name: string
  } | null
}

export default function AdminPackageDetail() {
  const { packageId } = useParams<{ packageId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isAdmin } = usePermissions()

  // Both admin and manager use /admin routes
  const basePath = '/admin'

  // Main data
  const [packageData, setPackageData] = useState<ServicePackageV2WithTiers | null>(null)
  const [stats, setStats] = useState<PackageStats>({
    total_bookings: 0,
    completed_bookings: 0,
    pending_bookings: 0,
    cancelled_bookings: 0,
    total_revenue: 0,
    last_booking_date: null,
  })
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [bookingsPage, setBookingsPage] = useState(1)
  const BOOKINGS_PER_PAGE = 10

  useEffect(() => {
    if (packageId) {
      fetchPackageDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId])

  const fetchPackageDetails = async () => {
    if (!packageId) return

    try {
      setLoading(true)
      setError(null)

      // Fetch package data (try V2 first, then V1)
      const { data: v2Package, error: v2Error } = await supabase
        .from('service_packages_v2')
        .select(`
          *,
          tiers:package_pricing_tiers(*)
        `)
        .eq('id', packageId)
        .single()

      if (v2Error && v2Error.code !== 'PGRST116') {
        throw v2Error
      }

      let pkgData: ServicePackageV2WithTiers | null = null

      if (v2Package) {
        // V2 package found
        const tiers = v2Package.tiers || []
        pkgData = {
          ...v2Package,
          tiers,
          tier_count: tiers.length,
          min_price: tiers.length > 0 ? Math.min(...tiers.map((t: PackagePricingTier) => t.price_1_time)) : v2Package.base_price,
          max_price: tiers.length > 0 ? Math.max(...tiers.map((t: PackagePricingTier) => t.price_1_time)) : v2Package.base_price,
        }
      } else {
        // Try V1 package
        const { data: v1Package, error: v1Error } = await supabase
          .from('service_packages')
          .select('*')
          .eq('id', packageId)
          .single()

        if (v1Error) {
          throw v1Error
        }

        // Convert V1 to V2 format
        pkgData = {
          id: v1Package.id,
          name: v1Package.name,
          description: v1Package.description,
          service_type: v1Package.service_type,
          category: null,
          pricing_model: PricingModel.Fixed,
          duration_minutes: v1Package.duration_minutes,
          base_price: Number(v1Package.price),
          is_active: v1Package.is_active,
          display_order: 0,
          created_at: v1Package.created_at,
          updated_at: v1Package.created_at,
          tiers: [],
          tier_count: 0,
          min_price: Number(v1Package.price),
          max_price: Number(v1Package.price),
        }
      }

      setPackageData(pkgData)

      // Fetch statistics and bookings
      await Promise.all([
        fetchPackageStats(packageId),
        fetchPackageBookings(packageId),
      ])
    } catch (err) {
      console.error('Error fetching package details:', err)
      const errorMsg = mapErrorToUserMessage(err, 'general')
      setError(errorMsg.description)
    } finally {
      setLoading(false)
    }
  }

  const fetchPackageStats = async (pkgId: string) => {
    try {
      // Get all bookings for this package (V1 or V2)
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('status, total_price, booking_date')
        .or(`service_package_id.eq.${pkgId},package_v2_id.eq.${pkgId}`)

      if (error) throw error

      if (!bookingsData) {
        return
      }

      // Calculate statistics
      const total = bookingsData.length
      const completed = bookingsData.filter(b => b.status === 'completed').length
      const pending = bookingsData.filter(b => b.status === 'pending').length
      const cancelled = bookingsData.filter(b => b.status === 'cancelled').length
      const revenue = bookingsData
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + Number(b.total_price), 0)

      // Find last booking date
      const dates = bookingsData.map(b => new Date(b.booking_date))
      const lastDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null

      setStats({
        total_bookings: total,
        completed_bookings: completed,
        pending_bookings: pending,
        cancelled_bookings: cancelled,
        total_revenue: revenue,
        last_booking_date: lastDate ? lastDate.toISOString() : null,
      })
    } catch (err) {
      console.error('Error fetching package stats:', err)
    }
  }

  const fetchPackageBookings = async (pkgId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_price,
          customers (id, full_name, phone),
          profiles!bookings_staff_id_fkey (full_name),
          teams (name)
        `)
        .or(`service_package_id.eq.${pkgId},package_v2_id.eq.${pkgId}`)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setBookings((data as unknown as BookingWithRelations[]) || [])
    } catch (err) {
      console.error('Error fetching package bookings:', err)
    }
  }

  const handleToggleActive = async () => {
    if (!packageData) return

    try {
      const { error } = await supabase
        .from('service_packages_v2')
        .update({ is_active: !packageData.is_active })
        .eq('id', packageData.id)

      if (error) throw error

      setPackageData({
        ...packageData,
        is_active: !packageData.is_active,
      })

      toast({
        title: 'Success',
        description: `Package ${packageData.is_active ? 'deactivated' : 'activated'} successfully`,
      })
    } catch (err) {
      const errorMsg = mapErrorToUserMessage(err, 'general')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!packageData) return

    try {
      setDeleting(true)

      // Check if package has bookings
      if (stats.total_bookings > 0) {
        toast({
          title: 'Cannot Delete',
          description: `This package has ${stats.total_bookings} booking(s). Cannot delete packages with existing bookings.`,
          variant: 'destructive',
        })
        setIsDeleteDialogOpen(false)
        return
      }

      // Delete tiers first if V2 tiered
      if (packageData.pricing_model === PricingModel.Tiered && packageData.tiers && packageData.tiers.length > 0) {
        const { error: tiersError } = await supabase
          .from('package_pricing_tiers')
          .delete()
          .eq('package_id', packageData.id)

        if (tiersError) throw tiersError
      }

      // Delete package
      const { error } = await supabase
        .from('service_packages_v2')
        .delete()
        .eq('id', packageData.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Package deleted successfully',
      })

      // Navigate back to packages list
      navigate(`${basePath}/packages`)
    } catch (err) {
      const errorMsg = mapErrorToUserMessage(err, 'general')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'In Progress', className: 'bg-purple-100 text-purple-800' },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
    }

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' }

    return <Badge className={config.className}>{config.label}</Badge>
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Error state
  if (error || !packageData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Package</h2>
              <p className="text-muted-foreground mb-4">{error || 'Package not found'}</p>
              <Button onClick={() => navigate(`${basePath}/packages`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Packages
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const paginatedBookings = bookings.slice(
    (bookingsPage - 1) * BOOKINGS_PER_PAGE,
    bookingsPage * BOOKINGS_PER_PAGE
  )
  const totalPages = Math.ceil(bookings.length / BOOKINGS_PER_PAGE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Package Details: {packageData.name}</p>
          </div>
        </div>

        {/* Action Buttons (Admin Only) */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleActive}
              className="gap-2"
            >
              {packageData.is_active ? (
                <>
                  <XCircle className="h-4 w-4" />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Activate
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Package Information Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2">
                  <PackageIcon className="h-5 w-5" />
                  Package Information
                </CardTitle>
                <CardDescription>
                  Detailed information about this service package
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="capitalize">{packageData.service_type}</Badge>
                <Badge className={packageData.pricing_model === PricingModel.Fixed ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                  {packageData.pricing_model === PricingModel.Fixed ? 'Fixed Price' : 'Tiered Price'}
                </Badge>
                {packageData.category && (
                  <Badge variant="outline" className="capitalize">{packageData.category}</Badge>
                )}
                <Badge className={packageData.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {packageData.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1 text-sm">{packageData.description || 'No description provided'}</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Created:</span>
                  <span className="text-sm">{formatDate(packageData.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Last Updated:</span>
                  <span className="text-sm">{formatDate(packageData.updated_at)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Bookings
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_bookings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All-time bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed_bookings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Successfully completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-tinedy-yellow" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-tinedy-dark">
                {formatCurrency(stats.total_revenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From completed bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Booking
              </CardTitle>
              <Calendar className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {stats.last_booking_date ? formatDate(stats.last_booking_date) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Most recent booking
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {packageData.pricing_model === PricingModel.Fixed ? (
              /* Fixed Pricing */
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-sm font-medium">Base Price:</span>
                  <span className="text-lg font-bold text-tinedy-dark">
                    {formatCurrency(packageData.base_price || 0)}
                  </span>
                </div>
                {packageData.duration_minutes && (
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duration:
                    </span>
                    <span className="text-lg font-semibold">
                      {packageData.duration_minutes} minutes
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* Tiered Pricing */
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium">Price Range</p>
                    <p className="text-2xl font-bold text-tinedy-dark">
                      {formatCurrency(packageData.min_price || 0)} - {formatCurrency(packageData.max_price || 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">Total Tiers</p>
                    <p className="text-xl font-bold">{packageData.tier_count}</p>
                  </div>
                </div>

                {/* Tiers Table */}
                {packageData.tiers && packageData.tiers.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Area Range (sqm)</TableHead>
                          <TableHead>Staff</TableHead>
                          <TableHead className="text-right">1x/month</TableHead>
                          <TableHead className="text-right">2x/month</TableHead>
                          <TableHead className="text-right">4x/month</TableHead>
                          <TableHead className="text-right">8x/month</TableHead>
                          <TableHead className="text-right">Est. Hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packageData.tiers.map((tier) => (
                          <TableRow key={tier.id}>
                            <TableCell className="font-medium">
                              {tier.area_min} - {tier.area_max}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {tier.required_staff}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(tier.price_1_time)}
                            </TableCell>
                            <TableCell className="text-right">
                              {tier.price_2_times ? formatCurrency(tier.price_2_times) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {tier.price_4_times ? formatCurrency(tier.price_4_times) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {tier.price_8_times ? formatCurrency(tier.price_8_times) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {tier.estimated_hours ? `${tier.estimated_hours}h` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Bookings
                </CardTitle>
                <CardDescription className="mt-1">
                  Recent bookings using this package
                </CardDescription>
              </div>
              <Badge variant="outline">{bookings.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No bookings found for this package</p>
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{booking.customers?.full_name || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{booking.customers?.phone || ''}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{formatDate(booking.booking_date)}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {booking.teams?.name || booking.profiles?.full_name || 'Unassigned'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(booking.total_price)}
                          </TableCell>
                          <TableCell>{getStatusBadge(booking.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {(bookingsPage - 1) * BOOKINGS_PER_PAGE + 1} to{' '}
                      {Math.min(bookingsPage * BOOKINGS_PER_PAGE, bookings.length)} of {bookings.length}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBookingsPage(p => Math.max(1, p - 1))}
                        disabled={bookingsPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBookingsPage(p => Math.min(totalPages, p + 1))}
                        disabled={bookingsPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{packageData.name}"? This action cannot be undone.
              {stats.total_bookings > 0 && (
                <p className="mt-2 text-red-600 font-semibold">
                  Warning: This package has {stats.total_bookings} booking(s). You cannot delete packages with existing bookings.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || stats.total_bookings > 0}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
