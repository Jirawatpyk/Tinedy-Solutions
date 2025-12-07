import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BookingDetailModal } from './booking-detail-modal'
import { BookingCreateModal, BookingEditModal } from '@/components/booking'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import { CalendarCell } from '@/components/calendar/CalendarCell'
import { BookingListSidebar } from '@/components/calendar/BookingListSidebar'
import { CalendarFilters } from '@/components/calendar/filters/CalendarFilters'
import { MobileCalendar } from '@/components/calendar/MobileCalendar'
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'
import type { PackageSelectionData } from '@/components/service-packages'
import type { RecurringPattern } from '@/types/recurring-booking'
import type { Booking } from '@/types/booking'
import type { BookingFormState } from '@/hooks/useBookingForm'
import { useServicePackages } from '@/hooks/useServicePackages'
import { useStaffList } from '@/hooks/useStaff'
import { useTeamsList } from '@/hooks/useTeams'
import { useCalendarData } from '@/hooks/calendar'
import { useToast } from '@/hooks/use-toast'
import { getAvailableStatuses } from '@/lib/booking-badges'
import {
  getStatusBadge,
  getPaymentStatusBadge,
  getStatusLabel,
} from '@/lib/booking-badges'
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'

export function AdminCalendar() {
  // ========== Calendar Data Hook (replaces 20+ useState calls) ==========
  const calendar = useCalendarData()
  const { toast } = useToast()

  // ========== Create bookingsByDate Map for Mobile Calendar ==========
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>()
    calendar.bookingData.bookings.forEach((booking) => {
      const dateKey = booking.booking_date
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(booking)
    })
    return map
  }, [calendar.bookingData.bookings])

  // ========== Local Modal States (NOT in hook - UI-only) ==========
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedCreateDate, setSelectedCreateDate] = useState<string>('')
  const [createAssignmentType, setCreateAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [createFormData, setCreateFormData] = useState<BookingFormState>({})
  const [isCreateAvailabilityOpen, setIsCreateAvailabilityOpen] = useState(false)

  const [editAssignmentType, setEditAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [editFormData, setEditFormData] = useState<BookingFormState>({})
  const [isEditAvailabilityOpen, setIsEditAvailabilityOpen] = useState(false)

  // Package Selection State
  const [createPackageSelection, setCreatePackageSelection] = useState<PackageSelectionData | null>(null)
  const [editPackageSelection, setEditPackageSelection] = useState<PackageSelectionData | null>(null)

  // Recurring Bookings State
  const [createRecurringDates, setCreateRecurringDates] = useState<string[]>([])
  const [createRecurringPattern, setCreateRecurringPattern] = useState<RecurringPattern>('auto-monthly' as RecurringPattern)

  // ========== External Data (not from calendar hook) ==========
  const { packages: servicePackages } = useServicePackages()
  const { staffList } = useStaffList({ role: 'staff', enableRealtime: false })
  const { teamsList: teams } = useTeamsList({ enableRealtime: false })

  // ========== Helper Functions (keep local - not in hooks) ==========

  // Calculate end time from start time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    if (!startTime) return ''
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60) % 24
    const endMinutes = totalMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
  }

  // Local Form Helpers (for modal components)
  const createForm = {
    formData: createFormData,
    handleChange: <K extends keyof BookingFormState>(field: K, value: BookingFormState[K]) => {
      setCreateFormData((prev: BookingFormState) => ({ ...prev, [field]: value }))
    },
    setValues: (values: Partial<BookingFormState>) => {
      setCreateFormData((prev: BookingFormState) => ({ ...prev, ...values }))
    },
    reset: () => {
      setCreateFormData({})
      setCreateAssignmentType('none')
    }
  }

  const editForm = {
    formData: editFormData,
    handleChange: <K extends keyof BookingFormState>(field: K, value: BookingFormState[K]) => {
      setEditFormData((prev: BookingFormState) => ({ ...prev, [field]: value }))
    },
    setValues: (values: Partial<BookingFormState>) => {
      setEditFormData((prev: BookingFormState) => ({ ...prev, ...values }))
    },
    reset: () => {
      setEditFormData({})
      setEditAssignmentType('none')
    }
  }

  // ========== Modal Handlers (keep local - open/close modals) ==========

  const handleCreateBooking = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd')
    setSelectedCreateDate(formattedDate)
    setCreateFormData({ booking_date: formattedDate })
    setIsCreateOpen(true)
  }

  const openBookingDetail = (booking: Booking) => {
    calendar.modalControls.setSelectedBooking(booking)
    calendar.modalControls.setIsDetailOpen(true)
  }

  const handleEditBooking = (booking: Booking) => {
    // Populate edit form with booking data
    setEditFormData({
      service_package_id: booking.service_package_id,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      address: booking.address,
      city: booking.city,
      state: booking.state,
      zip_code: booking.zip_code,
      notes: booking.notes || undefined,
      total_price: booking.total_price,
      staff_id: booking.staff_id || '',
      team_id: booking.team_id || '',
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

    // Set package selection for PackageSelector component
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (booking.service_package_id || ('package_v2_id' in booking && (booking as any).package_v2_id)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const packageId = ('package_v2_id' in booking && (booking as any).package_v2_id) || booking.service_package_id

      // หา package จาก unified packages (รวม V1 + V2 แล้ว)
      const pkg = servicePackages.find(p => p.id === packageId)

      if (pkg) {
        // Check if this is a V2 Tiered Pricing package
        const isTiered = 'pricing_model' in pkg && pkg.pricing_model === 'tiered'

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (isTiered && 'area_sqm' in booking && 'frequency' in booking && (booking as any).area_sqm && (booking as any).frequency) {
          // V2 Tiered Pricing - restore area and frequency
          setEditPackageSelection({
            packageId: pkg.id,
            pricingModel: 'tiered',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            areaSqm: Number((booking as any).area_sqm) || 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            frequency: ((booking as any).frequency as 1 | 2 | 4 | 8) || 1,
            price: booking.total_price || 0,
            requiredStaff: 1, // Will be recalculated by PackageSelector
            packageName: pkg.name,
          })
        } else {
          // Fixed Pricing (V1 หรือ V2)
          setEditPackageSelection({
            packageId: pkg.id,
            pricingModel: 'fixed',
            price: Number(pkg.base_price || booking.total_price || 0),
            requiredStaff: 1,
            packageName: pkg.name,
            estimatedHours: pkg.duration_minutes ? pkg.duration_minutes / 60 : undefined,
          })
        }
      }
    }

    calendar.modalControls.setSelectedBooking(booking)
    calendar.modalControls.setIsEditOpen(true)
    calendar.modalControls.setIsDetailOpen(false)
  }

  // Error state
  if (calendar.bookingData.error) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[40px]">
          <div>
            <p className="text-sm text-muted-foreground">View and manage your bookings</p>
          </div>
        </div>

        {/* Error Card */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-red-100 p-2">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Failed to Load Calendar</h3>
              <p className="mt-1 text-sm text-red-700">{calendar.bookingData.error || 'Unknown error'}</p>
              <button
                type="button"
                onClick={() => calendar.bookingData.refetchBookings()}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (calendar.bookingData.isLoading) {
    return (
      <div className="space-y-6">
        {/* Page Header - Always show */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[40px]">
          <div>
            <p className="text-sm text-muted-foreground">View and manage your bookings</p>
          </div>
        </div>

        {/* Filters skeleton */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-8 w-[380px]" />
              <Skeleton className="h-6 w-px" />
              <Skeleton className="h-8 flex-1 min-w-[200px]" />
              <Skeleton className="h-8 flex-1 min-w-[200px]" />
              <Skeleton className="h-8 flex-1 min-w-[200px]" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Skeleton */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-2xl">
                  {format(calendar.dateControls.currentDate, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar Skeleton */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-display">Select a date</CardTitle>
              <p className="text-sm text-muted-foreground">
                Click on a date to view bookings
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Mobile Calendar View - แสดงเฉพาะ mobile */}
      <div className="block md:hidden h-[calc(100vh-120px)]">
        {/* Mobile Filter Button */}
        <div className="flex justify-end mb-2 px-2">
          <CalendarFilters
            filterControls={calendar.filterControls}
            onPresetDateChange={calendar.dateControls.handlePresetDateChange}
          />
        </div>
        <CalendarErrorBoundary>
          <MobileCalendar
            currentDate={calendar.dateControls.currentDate}
            selectedDate={calendar.dateControls.selectedDate}
            bookings={calendar.bookingData.bookings}
            conflictMap={calendar.bookingData.conflictMap}
            bookingsByDate={bookingsByDate}
            onDateSelect={calendar.dateControls.handleDateClick}
            onMonthChange={calendar.dateControls.setCurrentDate}
            onBookingClick={openBookingDetail}
            onCreateBooking={handleCreateBooking}
            onStatusChange={calendar.actions.handleInlineStatusChange}
            getAvailableStatuses={getAvailableStatuses}
          />
        </CalendarErrorBoundary>
      </div>

      {/* Desktop View - ซ่อนบน mobile */}
      <div className="hidden md:block space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[40px]">
          <div>
            <p className="text-sm text-muted-foreground">View and manage your bookings</p>
          </div>
        </div>

        {/* New Filter System (Sprint 2 - UX Improvements) */}
        <CalendarFilters
          filterControls={calendar.filterControls}
          onPresetDateChange={calendar.dateControls.handlePresetDateChange}
        />

        <CalendarErrorBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2 flex flex-col h-fit">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-2xl">
                    {format(calendar.dateControls.currentDate, 'MMMM yyyy')}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={calendar.dateControls.goToPreviousMonth}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={calendar.dateControls.goToNextMonth}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 flex flex-col overflow-auto">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 flex-1">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days - OPTIMIZED: Use memoized CalendarCell component */}
                {calendar.dateControls.calendarDays.map((day: Date, index: number) => {
                  const dayBookings = calendar.bookingData.getBookingsForDate(day)

                  // Get pre-calculated conflict IDs for this date (use yyyy-MM-dd format to match booking_date)
                  const dateKey = format(day, 'yyyy-MM-dd')
                  const dayConflictIds = calendar.bookingData.conflictIdsByDate.get(dateKey) || new Set<string>()

                  return (
                    <CalendarCell
                      key={index}
                      day={day}
                      currentDate={calendar.dateControls.currentDate}
                      selectedDate={calendar.dateControls.selectedDate}
                      dayBookings={dayBookings}
                      conflictingBookingIds={dayConflictIds}
                      onDateClick={calendar.dateControls.handleDateClick}
                      onCreateBooking={handleCreateBooking}
                    />
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t flex-shrink-0">
                <p className="text-sm font-semibold mb-2">Status Legend:</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>Pending</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Confirmed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Cancelled</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-gray-500" />
                    <span>No Show</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking List Sidebar */}
          <BookingListSidebar
            selectedDate={calendar.dateControls.selectedDate}
            selectedDateRange={calendar.dateControls.selectedDateRange}
            bookings={calendar.bookingData.selectedDateBookings}
            conflictMap={calendar.bookingData.conflictMap}
            onBookingClick={openBookingDetail}
            onStatusChange={calendar.actions.handleInlineStatusChange}
            getAvailableStatuses={getAvailableStatuses}
            loading={calendar.bookingData.isFetching && !calendar.bookingData.isLoading}
          />
          </div>
        </CalendarErrorBoundary>
      </div>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        booking={calendar.modalControls.selectedBooking as Booking | null}
        isOpen={calendar.modalControls.isDetailOpen}
        onClose={() => calendar.modalControls.setIsDetailOpen(false)}
        onEdit={() => calendar.modalControls.selectedBooking && handleEditBooking(calendar.modalControls.selectedBooking as Booking)}
        onCancel={calendar.actions.handleArchive}
        onDelete={calendar.actions.handleDelete}
        onStatusChange={calendar.actions.handleStatusChange}
        onMarkAsPaid={calendar.actions.handleMarkAsPaid}
        onVerifyPayment={calendar.actions.handleVerifyPayment}
        getStatusBadge={getStatusBadge}
        getPaymentStatusBadge={getPaymentStatusBadge}
        getAvailableStatuses={getAvailableStatuses}
        getStatusLabel={getStatusLabel}
        isUpdatingStatus={calendar.actions.isUpdatingStatus}
        isUpdatingPayment={calendar.actions.isUpdatingPayment}
        isDeleting={calendar.actions.isDeleting}
      />

      {/* Create Booking Modal */}
      <BookingCreateModal
        isOpen={isCreateOpen && !isCreateAvailabilityOpen}
        onClose={() => {
          setIsCreateOpen(false)
          setSelectedCreateDate('')
          setCreatePackageSelection(null)
          setCreateRecurringDates([])
          createForm.reset()
        }}
        onSuccess={() => {
          calendar.bookingData.refetchBookings()
          setCreatePackageSelection(null)
          setCreateRecurringDates([])
        }}
        servicePackages={servicePackages}
        staffMembers={staffList}
        teams={teams}
        onOpenAvailabilityModal={() => {
          setIsCreateAvailabilityOpen(true)
        }}
        onBeforeOpenAvailability={(formData) => {
          // Sync form data from BookingCreateModal to createForm before opening availability modal
          createForm.setValues({
            booking_date: formData.booking_date || '',
            start_time: formData.start_time || '',
            end_time: formData.end_time || '',
            service_package_id: formData.service_package_id || '',
            package_v2_id: formData.package_v2_id || '',
            staff_id: formData.staff_id || '',
            team_id: formData.team_id || '',
            total_price: formData.total_price || 0,
            area_sqm: formData.area_sqm || null,
            frequency: formData.frequency || null,
          })
        }}
        assignmentType={createAssignmentType}
        setAssignmentType={setCreateAssignmentType}
        calculateEndTime={calculateEndTime}
        packageSelection={createPackageSelection}
        setPackageSelection={setCreatePackageSelection}
        defaultDate={selectedCreateDate}
        defaultStaffId={createForm.formData.staff_id}
        defaultTeamId={createForm.formData.team_id}
        recurringDates={createRecurringDates}
        setRecurringDates={setCreateRecurringDates}
        recurringPattern={createRecurringPattern}
        setRecurringPattern={setCreateRecurringPattern}
      />

      {/* Edit Booking Modal */}
      {calendar.modalControls.selectedBooking && (
        <BookingEditModal
          isOpen={calendar.modalControls.isEditOpen && !isEditAvailabilityOpen}
          onClose={() => {
            calendar.modalControls.setIsEditOpen(false)
            editForm.reset()
          }}
          booking={calendar.modalControls.selectedBooking as Booking}
          onSuccess={() => {
            calendar.bookingData.refetchBookings()
            setEditPackageSelection(null) // Clear selection after success
          }}
          servicePackages={servicePackages}
          staffMembers={staffList}
          teams={teams}
          onOpenAvailabilityModal={() => {
            setIsEditAvailabilityOpen(true)
          }}
          onBeforeOpenAvailability={(formData) => {
            // Sync form data from BookingEditModal to editForm before opening availability modal
            editForm.setValues({
              booking_date: formData.booking_date || '',
              start_time: formData.start_time || '',
              end_time: formData.end_time || '',
              service_package_id: formData.service_package_id || '',
              package_v2_id: formData.package_v2_id || '',
              staff_id: formData.staff_id || '',
              team_id: formData.team_id || '',
              total_price: formData.total_price || 0,
              area_sqm: formData.area_sqm || null,
              frequency: formData.frequency || null,
            })
          }}
          editForm={editForm}
          assignmentType={editAssignmentType}
          onAssignmentTypeChange={setEditAssignmentType}
          calculateEndTime={calculateEndTime}
          packageSelection={editPackageSelection}
          setPackageSelection={setEditPackageSelection}
          defaultStaffId={editForm.formData.staff_id}
          defaultTeamId={editForm.formData.team_id}
        />
      )}

      {/* Staff Availability Modal - Create */}
      {(createFormData.service_package_id || createFormData.package_v2_id) && createFormData.booking_date && createFormData.start_time && (
        <StaffAvailabilityModal
          isOpen={isCreateAvailabilityOpen}
          onClose={() => {
            setIsCreateAvailabilityOpen(false)
            setIsCreateOpen(true)
          }}
          assignmentType={createAssignmentType === 'staff' ? 'individual' : 'team'}
          onSelectStaff={(staffId) => {
            createForm.handleChange('staff_id', staffId)
            createForm.handleChange('team_id', '') // Clear team when staff is selected
            setIsCreateAvailabilityOpen(false)
            setIsCreateOpen(true)
            toast({
              title: 'Staff Selected',
              description: 'Staff member has been assigned to the booking',
            })
          }}
          onSelectTeam={(teamId) => {
            createForm.handleChange('team_id', teamId)
            createForm.handleChange('staff_id', '') // Clear staff when team is selected
            setIsCreateAvailabilityOpen(false)
            setIsCreateOpen(true)
            toast({
              title: 'Team Selected',
              description: 'Team has been assigned to the booking',
            })
          }}
          date={createRecurringDates.length === 0 ? (createFormData.booking_date || '') : undefined}
          dates={createRecurringDates.length > 0 ? createRecurringDates : undefined}
          startTime={createFormData.start_time || ''}
          endTime={
            createFormData.service_package_id && createFormData.start_time
              ? calculateEndTime(
                  createFormData.start_time,
                  servicePackages.find(pkg => pkg.id === createFormData.service_package_id)?.duration_minutes || 0
                )
              : createFormData.end_time || ''
          }
          servicePackageId={createFormData.service_package_id || createFormData.package_v2_id || ''}
          servicePackageName={
            servicePackages.find(pkg => pkg.id === createFormData.service_package_id)?.name ||
            createPackageSelection?.packageName
          }
        />
      )}

      {/* Staff Availability Modal - Edit */}
      {(editFormData.service_package_id || editFormData.package_v2_id) && editFormData.booking_date && editFormData.start_time && (
        <StaffAvailabilityModal
          isOpen={isEditAvailabilityOpen}
          onClose={() => {
            setIsEditAvailabilityOpen(false)
            calendar.modalControls.setIsEditOpen(true)
          }}
          assignmentType={editAssignmentType === 'staff' ? 'individual' : 'team'}
          onSelectStaff={(staffId) => {
            editForm.handleChange('staff_id', staffId)
            editForm.handleChange('team_id', '') // Clear team when staff is selected
            setIsEditAvailabilityOpen(false)
            calendar.modalControls.setIsEditOpen(true)
            toast({
              title: 'Staff Selected',
              description: 'Staff member has been assigned to the booking',
            })
          }}
          onSelectTeam={(teamId) => {
            editForm.handleChange('team_id', teamId)
            editForm.handleChange('staff_id', '') // Clear staff when team is selected
            setIsEditAvailabilityOpen(false)
            calendar.modalControls.setIsEditOpen(true)
            toast({
              title: 'Team Selected',
              description: 'Team has been assigned to the booking',
            })
          }}
          date={editFormData.booking_date || ''}
          startTime={editFormData.start_time || ''}
          endTime={
            editFormData.service_package_id && editFormData.start_time
              ? calculateEndTime(
                  editFormData.start_time,
                  servicePackages.find(pkg => pkg.id === editFormData.service_package_id)?.duration_minutes || 0
                )
              : editFormData.end_time || ''
          }
          servicePackageId={editFormData.service_package_id || editFormData.package_v2_id || ''}
          servicePackageName={
            servicePackages.find(pkg => pkg.id === editFormData.service_package_id)?.name ||
            editPackageSelection?.packageName
          }
          currentAssignedStaffId={editFormData.staff_id}
          currentAssignedTeamId={editFormData.team_id}
          excludeBookingId={calendar.modalControls.selectedBooking?.id}
        />
      )}
    </div>
  )
}
