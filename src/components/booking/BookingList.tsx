import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { User, Users, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Booking } from '@/types/booking'

interface PaginationMetadata {
  startIndex: number
  endIndex: number
  totalItems: number
  hasPrevPage: boolean
  hasNextPage: boolean
}

interface BookingListProps {
  bookings: Booking[]
  selectedBookings: string[]
  currentPage: number
  totalPages: number
  itemsPerPage: number
  metadata: PaginationMetadata
  onToggleSelect: (bookingId: string) => void
  onBookingClick: (booking: Booking) => void
  onItemsPerPageChange: (value: number) => void
  onFirstPage: () => void
  onPreviousPage: () => void
  onNextPage: () => void
  onLastPage: () => void
  onDeleteBooking: (bookingId: string) => void
  onStatusChange: (bookingId: string, currentStatus: string, newStatus: string) => void
  formatTime: (time: string) => string
  getStatusBadge: (status: string) => React.ReactElement
  getAvailableStatuses: (currentStatus: string) => string[]
  getStatusLabel: (status: string) => string
}

export function BookingList({
  bookings,
  selectedBookings,
  currentPage,
  totalPages,
  itemsPerPage,
  metadata,
  onToggleSelect,
  onBookingClick,
  onItemsPerPageChange,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
  onDeleteBooking,
  onStatusChange,
  formatTime,
  getStatusBadge,
  getAvailableStatuses,
  getStatusLabel
}: BookingListProps) {
  return (
    <div className="space-y-4">
      {/* Pagination Controls - Top */}
      {metadata.totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Label htmlFor="itemsPerPage" className="text-sm text-muted-foreground">
              Show:
            </Label>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange(Number(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              per page
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {metadata.startIndex} to {metadata.endIndex} of {metadata.totalItems} bookings
            </span>
          </div>
        </div>
      )}

      {/* Booking Cards */}
      <div className="space-y-4">
        {bookings.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No bookings found
          </p>
        ) : (
          bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                checked={selectedBookings.includes(booking.id)}
                onCheckedChange={() => onToggleSelect(booking.id)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1"
              />
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between flex-1 gap-4 cursor-pointer"
                onClick={() => onBookingClick(booking)}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-tinedy-dark">
                        {booking.customers?.full_name || 'Unknown Customer'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.customers?.email}
                      </p>
                    </div>
                    <div className="sm:hidden">
                      {getStatusBadge(booking.status)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center">
                      <Badge variant="outline" className="mr-2">
                        {booking.service_packages?.service_type}
                      </Badge>
                      {booking.service_packages?.name}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  </div>
                  {booking.profiles && (
                    <p className="text-sm text-tinedy-blue flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Staff: {booking.profiles.full_name}
                    </p>
                  )}
                  {booking.teams && (
                    <p className="text-sm text-tinedy-green flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Team: {booking.teams.name}
                    </p>
                  )}
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-4">
                  <div className="flex-1 sm:flex-none">
                    <p className="font-semibold text-tinedy-dark text-lg">
                      {formatCurrency(Number(booking.total_price))}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    {getStatusBadge(booking.status)}
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={booking.status}
                      onValueChange={(value) =>
                        onStatusChange(booking.id, booking.status, value)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableStatuses(booking.status).map((status) => (
                          <SelectItem key={status} value={status}>
                            {getStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteBooking(booking.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls - Bottom */}
      {metadata.totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onFirstPage}
              disabled={!metadata.hasPrevPage}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onPreviousPage}
              disabled={!metadata.hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={!metadata.hasNextPage}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onLastPage}
              disabled={!metadata.hasNextPage}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
