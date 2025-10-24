import { useEffect, useState, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBookingFilters } from '@/hooks/useBookingFilters'
import { usePagination } from '@/hooks/useBookingPagination'
import { useConflictDetection } from '@/hooks/useConflictDetection'
import { useBookingForm } from '@/hooks/useBookingForm'
import { useBulkActions } from '@/hooks/useBulkActions'
import { useBookingStatusManager } from '@/hooks/useBookingStatusManager'
import { useToast } from '@/hooks/use-toast'
import { Plus } from 'lucide-react'
import { BookingDetailModal } from './booking-detail-modal'
import { getErrorMessage } from '@/lib/error-utils'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import { BookingFiltersPanel } from '@/components/booking/BookingFiltersPanel'
import { BulkActionsToolbar } from '@/components/booking/BulkActionsToolbar'
import { BookingList } from '@/components/booking/BookingList'
import { BookingStatusConfirmDialog } from '@/components/booking/BookingStatusConfirmDialog'
import { BookingConflictDialog } from '@/components/booking/BookingConflictDialog'
import { BookingCreateModal } from '@/components/booking/BookingCreateModal'
import { BookingEditModal } from '@/components/booking/BookingEditModal'
import { calculateEndTime, formatTime } from '@/lib/booking-utils'
import type { Booking } from '@/types/booking'
import type { ServicePackage } from '@/types'

interface StaffMember {
  id: string
  full_name: string
  email: string
  role: string
}

interface Team {
  id: string
  name: string
}

export function AdminBookings() {
  const location = useLocation()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [createAssignmentType, setCreateAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [editAssignmentType, setEditAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  // Booking filters hook
  const {
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount,
    setQuickFilter
  } = useBookingFilters()
  // Items per page state (for dynamic pagination)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  // Pagination hook
  const {
    items: paginatedBookings,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    goToPage,
    metadata
  } = usePagination(filteredBookings, {
    initialPage: 1,
    itemsPerPage: itemsPerPage
  })
  // Detail Modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false)
  // Flag to prevent processing location.state multiple times
  const hasProcessedState = useRef(false)
  // Edit Booking Form - Using useBookingForm hook (shared with edit modal and availability modal)
  const editForm = useBookingForm({
    onSubmit: async () => {
      // This is handled by the BookingEditModal component
    }
  })
  // Conflict Detection (using hook) - for create modal conflict override handling
  const {
    conflicts,
    clearConflicts,
  } = useConflictDetection()
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [pendingBookingData, setPendingBookingData] = useState<Record<string, unknown> | null>(null)
  // Staff Availability Modal
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false)
  const [isEditAvailabilityModalOpen, setIsEditAvailabilityModalOpen] = useState(false)
  const { toast } = useToast()

  // Create Booking Form - Using useBookingForm hook (shared with create modal and availability modal)
  const createForm = useBookingForm({
    onSubmit: async () => {
      // This is handled by the BookingCreateModal component
    }
  })

  const fetchBookings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customers (id, full_name, email),
          service_packages (name, service_type),
          profiles (full_name),
          teams (name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Bulk Actions (using hook)
  const {
    selectedBookings,
    bulkStatus,
    setBulkStatus,
    toggleSelectAll,
    toggleSelectBooking,
    handleBulkStatusUpdate,
    handleBulkDelete,
    handleBulkExport,
  } = useBulkActions({
    bookings,
    filteredBookings,
    onSuccess: fetchBookings,
  })

  // Status Manager (using hook)
  const {
    showStatusConfirmDialog,
    pendingStatusChange,
    getStatusBadge,
    getPaymentStatusBadge,
    getAvailableStatuses,
    getStatusLabel,
    getStatusTransitionMessage,
    handleStatusChange,
    confirmStatusChange,
    cancelStatusChange,
    markAsPaid,
  } = useBookingStatusManager({
    selectedBooking,
    setSelectedBooking,
    onSuccess: fetchBookings,
  })

  const filterBookings = useCallback(() => {
    let filtered = bookings

    if (filters.searchQuery) {
      filtered = filtered.filter(
        (booking) =>
          booking.customers?.full_name
            .toLowerCase()
            .includes(filters.searchQuery.toLowerCase()) ||
          booking.service_packages?.name
            .toLowerCase()
            .includes(filters.searchQuery.toLowerCase())
      )
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter((booking) => booking.status === filters.status)
    }

    if (filters.staffId !== 'all') {
      if (filters.staffId === 'unassigned') {
        filtered = filtered.filter((booking) => !booking.staff_id)
      } else {
        filtered = filtered.filter((booking) => booking.staff_id === filters.staffId)
      }
    }

    if (filters.teamId !== 'all') {
      filtered = filtered.filter((booking) => booking.team_id === filters.teamId)
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter((booking) => booking.booking_date >= filters.dateFrom)
    }

    if (filters.dateTo) {
      filtered = filtered.filter((booking) => booking.booking_date <= filters.dateTo)
    }

    // Service type filter
    if (filters.serviceType !== 'all') {
      filtered = filtered.filter(
        (booking) => booking.service_packages?.service_type === filters.serviceType
      )
    }

    setFilteredBookings(filtered)
  }, [bookings, filters])

  useEffect(() => {
    // OPTIMIZE: Run all queries in parallel for better performance
    Promise.all([
      fetchBookings(),
      fetchServicePackages(),
      fetchStaffMembers(),
      fetchTeams()
    ])
  }, [fetchBookings])

  useEffect(() => {
    filterBookings()
  }, [filterBookings])

  // Reset to page 1 when filters change
  // Using primitive dependencies to prevent unnecessary re-renders
  useEffect(() => {
    goToPage(1)
  }, [
    filters.searchQuery,
    filters.status,
    filters.staffId,
    filters.teamId,
    filters.dateFrom,
    filters.dateTo,
    filters.serviceType,
    goToPage
  ])

  // Handle navigation from Dashboard - open Edit modal
  useEffect(() => {
    const state = location.state as {
      editBookingId?: string;
      bookingData?: Booking;
      createBooking?: boolean;
      bookingDate?: string;
      prefilledData?: {
        booking_date: string;
        start_time: string;
        end_time: string;
        service_package_id: string;
        staff_id: string;
        team_id: string;
        total_price?: number;
      }
    } | null

    // Skip if no state
    if (!state) {
      // Reset flag when there's no state
      hasProcessedState.current = false
      return
    }

    // Skip if already processed this specific state
    if (hasProcessedState.current) return

    // Wait for service packages to load before processing create booking
    if (state?.createBooking && servicePackages.length === 0) {
      return
    }

    // Mark as processed
    hasProcessedState.current = true

    // Handle create booking from Quick Availability Check
    if (state?.createBooking && state?.prefilledData) {
      // Pre-fill all data from Quick Availability Check
      createForm.setValues({
        booking_date: state.prefilledData.booking_date,
        start_time: state.prefilledData.start_time,
        end_time: state.prefilledData.end_time,
        service_package_id: state.prefilledData.service_package_id,
        staff_id: state.prefilledData.staff_id,
        team_id: state.prefilledData.team_id,
        total_price: state.prefilledData.total_price || 0,
      })
      // Set assignment type
      if (state.prefilledData.staff_id) {
        setCreateAssignmentType('staff')
      } else if (state.prefilledData.team_id) {
        setCreateAssignmentType('team')
      }
      // Open create dialog
      setIsDialogOpen(true)
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, document.title)
      return
    }

    // Handle create booking from Calendar (legacy - only booking_date)
    if (state?.createBooking && state?.bookingDate) {
      // Pre-fill the booking date using hook
      createForm.setValues({ booking_date: state.bookingDate || '' })
      // Open create dialog
      setIsDialogOpen(true)
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, document.title)
      return
    }

    // Handle edit booking from Dashboard/Calendar
    if (state?.editBookingId && bookings.length > 0) {
      const booking = bookings.find(b => b.id === state.editBookingId)
      if (booking) {
        // Open edit modal - populate form using hook
        editForm.setValues({
          customer_id: booking.customers?.id || '',
          service_package_id: booking.service_package_id,
          staff_id: booking.staff_id || '',
          team_id: booking.team_id || '',
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          address: booking.address,
          city: booking.city || '',
          state: booking.state || '',
          zip_code: booking.zip_code || '',
          notes: booking.notes || '',
          total_price: Number(booking.total_price),
          status: booking.status,
        })

        // Set assignment type based on booking data
        if (booking.staff_id) {
          setEditAssignmentType('staff')
        } else if (booking.team_id) {
          setEditAssignmentType('team')
        } else {
          setEditAssignmentType('none')
        }

        setIsEditOpen(true)
        setIsDetailOpen(false)

        // Clear the state to prevent reopening on refresh
        window.history.replaceState({}, document.title)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, bookings, servicePackages])

  const fetchServicePackages = async () => {
    try {
      const { data, error } = await supabase
        .from('service_packages')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setServicePackages(data || [])
    } catch (error) {
      console.error('Error fetching service packages:', error)
    }
  }

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name')

      if (error) throw error
      setStaffMembers(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

  // Calculate end_time from start_time and duration
  // Proceed with booking after conflict override (for create modal)
  const proceedWithConflictOverride = async () => {
    if (!pendingBookingData) return

    try {
      const { error } = await supabase.from('bookings').insert(pendingBookingData)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking created successfully (conflict overridden)',
      })
      setIsDialogOpen(false)
      setShowConflictDialog(false)
      resetForm()
      setPendingBookingData(null)
      clearConflicts()
      fetchBookings()
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  // Cancel conflict override
  const cancelConflictOverride = () => {
    setShowConflictDialog(false)
    setPendingBookingData(null)
    clearConflicts()
  }

  const resetForm = () => {
    createForm.reset()
    setCreateAssignmentType('none')
    clearConflicts()
  }


  const deleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking deleted successfully',
      })
      fetchBookings()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete booking',
        variant: 'destructive',
      })
    }
  }


  const openBookingDetail = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailOpen(true)
  }

  const openEditBooking = (booking: Booking) => {
    // Set selected booking for excludeBookingId in Staff Availability Modal
    setSelectedBooking(booking)

    editForm.setValues({
      customer_id: booking.customers?.id || '',
      service_package_id: booking.service_package_id,
      staff_id: booking.staff_id || '',
      team_id: booking.team_id || '',
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      address: booking.address,
      city: booking.city || '',
      state: booking.state || '',
      zip_code: booking.zip_code || '',
      notes: booking.notes || '',
      total_price: Number(booking.total_price),
      status: booking.status,
    })

    // Set assignment type based on booking data
    if (booking.staff_id) {
      setEditAssignmentType('staff')
    } else if (booking.team_id) {
      setEditAssignmentType('team')
    } else {
      setEditAssignmentType('none')
    }

    setIsEditOpen(true)
    setIsDetailOpen(false)
  }



  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Filters skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-full sm:w-48" />
              <Skeleton className="h-10 w-full sm:w-48" />
              <Skeleton className="h-10 w-full sm:w-48" />
            </div>
          </CardContent>
        </Card>

        {/* Bookings list skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-10 w-32" />
                      <Skeleton className="h-10 w-10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-tinedy-dark">
            Bookings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all service bookings
          </p>
        </div>
        <Button className="bg-tinedy-blue hover:bg-tinedy-blue/90" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </Button>

        <BookingCreateModal
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSuccess={fetchBookings}
          servicePackages={servicePackages}
          staffMembers={staffMembers}
          teams={teams}
          onOpenAvailabilityModal={() => {
            setIsDialogOpen(false)
            setIsAvailabilityModalOpen(true)
          }}
          createForm={createForm}
          assignmentType={createAssignmentType}
          setAssignmentType={setCreateAssignmentType}
          calculateEndTime={calculateEndTime}
        />

        {/* Staff Availability Modal - Create Form */}
        {createForm.formData.service_package_id && createForm.formData.booking_date && createForm.formData.start_time && (
          <StaffAvailabilityModal
            isOpen={isAvailabilityModalOpen}
            onClose={() => {
              setIsAvailabilityModalOpen(false)
              setIsDialogOpen(true)
            }}
            assignmentType={createAssignmentType === 'staff' ? 'individual' : 'team'}
            onSelectStaff={(staffId) => {
              createForm.handleChange('staff_id', staffId)
              setIsAvailabilityModalOpen(false)
              setIsDialogOpen(true)
              toast({
                title: 'Staff Selected',
                description: 'Staff member has been assigned to the booking',
              })
            }}
            onSelectTeam={(teamId) => {
              createForm.handleChange('team_id', teamId)
              setIsAvailabilityModalOpen(false)
              setIsDialogOpen(true)
              toast({
                title: 'Team Selected',
                description: 'Team has been assigned to the booking',
              })
            }}
            date={createForm.formData.booking_date}
            startTime={createForm.formData.start_time}
            endTime={
              createForm.formData.service_package_id
                ? calculateEndTime(
                    createForm.formData.start_time,
                    servicePackages.find(pkg => pkg.id === createForm.formData.service_package_id)?.duration_minutes || 0
                  )
                : createForm.formData.end_time || ''
            }
            servicePackageId={createForm.formData.service_package_id}
            servicePackageName={
              servicePackages.find(pkg => pkg.id === createForm.formData.service_package_id)?.name
            }
          />
        )}

        {/* Staff Availability Modal - Edit Form */}
        {editForm.formData.service_package_id && editForm.formData.booking_date && editForm.formData.start_time && (
          <StaffAvailabilityModal
            isOpen={isEditAvailabilityModalOpen}
            onClose={() => {
              setIsEditAvailabilityModalOpen(false)
              setIsEditOpen(true)
            }}
            assignmentType={editAssignmentType === 'staff' ? 'individual' : 'team'}
            onSelectStaff={(staffId) => {
              editForm.handleChange('staff_id', staffId)
              setIsEditAvailabilityModalOpen(false)
              setIsEditOpen(true)
              toast({
                title: 'Staff Selected',
                description: 'Staff member has been assigned to the booking',
              })
            }}
            onSelectTeam={(teamId) => {
              editForm.handleChange('team_id', teamId)
              setIsEditAvailabilityModalOpen(false)
              setIsEditOpen(true)
              toast({
                title: 'Team Selected',
                description: 'Team has been assigned to the booking',
              })
            }}
            date={editForm.formData.booking_date}
            startTime={editForm.formData.start_time}
            endTime={
              editForm.formData.service_package_id
                ? calculateEndTime(
                    editForm.formData.start_time || '',
                    servicePackages.find(pkg => pkg.id === editForm.formData.service_package_id)?.duration_minutes || 0
                  )
                : editForm.formData.end_time || ''
            }
            servicePackageId={editForm.formData.service_package_id}
            servicePackageName={
              servicePackages.find(pkg => pkg.id === editForm.formData.service_package_id)?.name
            }
            currentAssignedStaffId={editForm.formData.staff_id}
            currentAssignedTeamId={editForm.formData.team_id}
            excludeBookingId={selectedBooking?.id}
          />
        )}
      </div>

      {/* Filters */}
      <BookingFiltersPanel
        filters={filters}
        updateFilter={updateFilter}
        resetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
        getActiveFilterCount={getActiveFilterCount}
        setQuickFilter={setQuickFilter}
        staffMembers={staffMembers}
        teams={teams}
      />

      {/* Booking Detail Modal */}
      <BookingDetailModal
        booking={selectedBooking}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={openEditBooking}
        onDelete={deleteBooking}
        onStatusChange={handleStatusChange}
        onMarkAsPaid={markAsPaid}
        getStatusBadge={getStatusBadge}
        getPaymentStatusBadge={getPaymentStatusBadge}
        getAvailableStatuses={getAvailableStatuses}
        getStatusLabel={getStatusLabel}
      />

      {/* Edit Booking Modal */}
      <BookingEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        booking={selectedBooking}
        onSuccess={fetchBookings}
        servicePackages={servicePackages}
        staffMembers={staffMembers}
        teams={teams}
        onOpenAvailabilityModal={() => {
          setIsEditOpen(false)
          setIsEditAvailabilityModalOpen(true)
        }}
        editForm={editForm}
        assignmentType={editAssignmentType}
        onAssignmentTypeChange={setEditAssignmentType}
        calculateEndTime={calculateEndTime}
      />

      {/* Status Change Confirmation Dialog */}
      <BookingStatusConfirmDialog
        isOpen={showStatusConfirmDialog}
        onClose={cancelStatusChange}
        onConfirm={confirmStatusChange}
        message={pendingStatusChange ? getStatusTransitionMessage(pendingStatusChange.currentStatus, pendingStatusChange.newStatus) : ''}
      />

      {/* Conflict Warning Dialog */}
      <BookingConflictDialog
        isOpen={showConflictDialog}
        onClose={cancelConflictOverride}
        onProceed={proceedWithConflictOverride}
        conflicts={conflicts}
        getStatusBadge={getStatusBadge}
        formatTime={formatTime}
      />

      {/* Bookings list */}
      <Card>
        <CardHeader>
          <BulkActionsToolbar
            selectedBookings={selectedBookings}
            totalBookings={filteredBookings.length}
            bulkStatus={bulkStatus}
            onBulkStatusChange={setBulkStatus}
            onToggleSelectAll={toggleSelectAll}
            onBulkStatusUpdate={handleBulkStatusUpdate}
            onBulkExport={handleBulkExport}
            onBulkDelete={handleBulkDelete}
          />
        </CardHeader>
        <CardContent>
          <BookingList
            bookings={paginatedBookings}
            selectedBookings={selectedBookings}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            metadata={metadata}
            onToggleSelect={toggleSelectBooking}
            onBookingClick={openBookingDetail}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value)
              goToPage(1)
            }}
            onFirstPage={goToFirst}
            onPreviousPage={prevPage}
            onNextPage={nextPage}
            onLastPage={goToLast}
            onDeleteBooking={deleteBooking}
            onStatusChange={handleStatusChange}
            formatTime={formatTime}
            getStatusBadge={getStatusBadge}
            getAvailableStatuses={getAvailableStatuses}
            getStatusLabel={getStatusLabel}
          />
        </CardContent>
      </Card>
    </div>
  )
}
