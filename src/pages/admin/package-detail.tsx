import { useParams } from 'react-router-dom'
import { useBookingStatusManager } from '@/hooks/use-booking-status-manager'
import { usePackageDetail } from '@/hooks/use-package-detail'

// UI Components
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PackageFormV2 } from '@/components/service-packages/PackageFormV2'

// Icons
import { ArrowLeft, XCircle } from 'lucide-react'

// Package Detail Sub-Components
import {
  PackageHeader,
  PackageInfoCard,
  PackageStatsCards,
  PackagePricingCard,
  PackageBookingsCard,
} from '@/components/packages/detail'

export default function AdminPackageDetail() {
  const { packageId } = useParams<{ packageId: string }>()

  const {
    packageData,
    packageSource,
    stats,
    bookings,
    loading,
    error,
    isEditDialogOpen,
    toggling,
    bookingsPage,
    statusFilter,
    dispatch,
    fetchPackageDetails,
    handleToggleActive,
    handleDelete,
    handleArchive,
  } = usePackageDetail(packageId)

  // Use booking status manager for badge rendering
  const { getStatusBadge } = useBookingStatusManager({
    selectedBooking: null,
    setSelectedBooking: () => {},
    onSuccess: () => {},
  })

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 sm:h-8 w-36 sm:w-48 mb-4 sm:mb-6" />
        <Skeleton className="h-48 sm:h-64 w-full mb-4 sm:mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 sm:mb-6">
          <Skeleton className="h-28 sm:h-32" />
          <Skeleton className="h-28 sm:h-32" />
          <Skeleton className="h-28 sm:h-32" />
          <Skeleton className="h-28 sm:h-32" />
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
              <Button onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Packages
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PackageHeader
        packageData={packageData}
        packageSource={packageSource}
        stats={{ total_bookings: stats.total_bookings }}
        toggling={toggling}
        backHref="/admin/packages"
        onToggleActive={handleToggleActive}
        onEdit={() => dispatch({ type: 'OPEN_EDIT_MODAL' })}
        onDelete={handleDelete}
        onArchive={handleArchive}
      />

      {/* Main Content */}
      <div className="space-y-6">
        <PackageInfoCard packageData={packageData} />
        <PackageStatsCards stats={stats} />
        <PackagePricingCard packageData={packageData} />
        <PackageBookingsCard
          bookings={bookings}
          statusFilter={statusFilter}
          onStatusFilterChange={(filter) => dispatch({ type: 'SET_STATUS_FILTER', payload: filter })}
          bookingsPage={bookingsPage}
          onPageChange={(page) => dispatch({ type: 'SET_PAGE', payload: page })}
          getStatusBadge={getStatusBadge}
          BOOKINGS_PER_PAGE={10}
        />
      </div>

      {/* Edit Package Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && dispatch({ type: 'CLOSE_MODAL' })}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Package</DialogTitle>
            <DialogDescription>
              Update package information and pricing tiers
            </DialogDescription>
          </DialogHeader>
          <PackageFormV2
            package={packageData}
            packageSource={packageSource}
            onSuccess={() => {
              dispatch({ type: 'CLOSE_MODAL' })
              fetchPackageDetails()
            }}
            onCancel={() => dispatch({ type: 'CLOSE_MODAL' })}
            showCancel={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
