import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BookingDetailModal } from './booking-detail-modal'
import { BookingFormContainer } from '@/components/booking/BookingFormContainer'
import { BookingEditModal } from '@/components/booking/BookingEditModal'
import { CalendarCell } from '@/components/calendar/CalendarCell'
import { BookingListSidebar } from '@/components/calendar/BookingListSidebar'
import { CalendarFilters } from '@/components/calendar/filters/CalendarFilters'
import { MobileCalendar } from '@/components/calendar/MobileCalendar'
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'
import { BookingStatus } from '@/types/booking'
import type { Booking } from '@/types/booking'
import { useCalendarData } from '@/hooks/calendar'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { format } from 'date-fns'
import { PageHeader } from '@/components/common/PageHeader'

export function AdminCalendar() {
  // ========== Calendar Data Hook ==========
  const calendar = useCalendarData()

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

  // ========== Local Modal States ==========
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // ========== Modal Handlers (keep local - open/close modals) ==========

  const handleCreateBooking = (_date: Date) => {
    setIsCreateOpen(true)
  }

  const openBookingDetail = (booking: Booking) => {
    calendar.modalControls.setSelectedBooking(booking)
    calendar.modalControls.setIsDetailOpen(true)
  }

  const handleEditBooking = (booking: Booking) => {
    calendar.modalControls.setSelectedBooking(booking)
    calendar.modalControls.setIsEditOpen(true)
    calendar.modalControls.setIsDetailOpen(false)
  }

  // Error state
  if (calendar.bookingData.error) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Calendar"
          subtitle="View and manage your bookings"
        />

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
        <PageHeader
          title="Calendar"
          subtitle="View and manage your bookings"
        />

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
        {/* Mobile Header with Title and Filter */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-display font-bold text-tinedy-dark">Calendar</h1>
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
            getAvailableStatuses={calendar.actions.getAvailableStatuses}
          />
        </CalendarErrorBoundary>
      </div>

      {/* Desktop View - ซ่อนบน mobile */}
      <div className="hidden md:block space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Calendar"
          subtitle="View and manage your bookings"
        />

        {/* New Filter System (Sprint 2 - UX Improvements) */}
        <CalendarFilters
          filterControls={calendar.filterControls}
          onPresetDateChange={calendar.dateControls.handlePresetDateChange}
        />

        <CalendarErrorBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[calc(100vh-220px)]">
            {/* Calendar */}
            <Card className="lg:col-span-2 flex flex-col lg:h-full">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-2xl">
                    {format(calendar.dateControls.currentDate, 'MMMM yyyy')}
                  </CardTitle>
                  <div className="flex gap-1">
                    <SimpleTooltip content="Previous month">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={calendar.dateControls.goToPreviousMonth}
                        className="h-8 w-8"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </SimpleTooltip>
                    <SimpleTooltip content="Next month">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={calendar.dateControls.goToNextMonth}
                        className="h-8 w-8"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </SimpleTooltip>
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
                    <div className="w-3 h-3 rounded-full bg-tinedy-dark/60" />
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
            getAvailableStatuses={calendar.actions.getAvailableStatuses}
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
        onRequestRefund={calendar.actions.handleRequestRefund}
        onCompleteRefund={calendar.actions.handleCompleteRefund}
        onCancelRefund={calendar.actions.handleCancelRefund}
        getStatusBadge={calendar.actions.getStatusBadge}
        getPaymentStatusBadge={calendar.actions.getPaymentStatusBadge}
        getAvailableStatuses={calendar.actions.getAvailableStatuses}
        getStatusLabel={calendar.actions.getStatusLabel}
        isUpdatingStatus={calendar.actions.isUpdatingStatus}
        isUpdatingPayment={calendar.actions.isUpdatingPayment}
        isDeleting={calendar.actions.isDeleting}
      />

      {/* Create Booking Modal */}
      <BookingFormContainer
        open={isCreateOpen}
        onOpenChange={(open) => { if (!open) setIsCreateOpen(false) }}
        onSuccess={() => {
          calendar.bookingData.refetchBookings()
        }}
      />

      {/* Edit Booking Modal */}
      {calendar.modalControls.selectedBooking && (
        <BookingEditModal
          open={calendar.modalControls.isEditOpen}
          onOpenChange={(open) => { if (!open) calendar.modalControls.setIsEditOpen(false) }}
          booking={calendar.modalControls.selectedBooking as Booking}
          onSuccess={() => {
            calendar.bookingData.refetchBookings()
          }}
        />
      )}

      {/* Status Change Confirmation Dialog */}
      {calendar.actions.pendingStatusChange && (
        <ConfirmDialog
          open={calendar.actions.showStatusConfirmDialog}
          onOpenChange={(open) => !open && calendar.actions.cancelStatusChange()}
          title="Confirm Status Change"
          description={calendar.actions.getStatusTransitionMessage(
            calendar.actions.pendingStatusChange.currentStatus,
            calendar.actions.pendingStatusChange.newStatus
          )}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          onConfirm={calendar.actions.confirmStatusChange}
          variant={([BookingStatus.Cancelled, BookingStatus.NoShow] as string[]).includes(calendar.actions.pendingStatusChange.newStatus) ? 'destructive' : 'default'}
        />
      )}
    </div>
  )
}
