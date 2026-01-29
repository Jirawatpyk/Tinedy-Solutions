import { SimplifiedBookingCard } from '@/components/staff/simplified-booking-card'
import { EmptyState } from '@/components/staff/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Search } from 'lucide-react'
import type { StaffBooking } from '@/lib/queries/staff-bookings-queries'

// Empty state when search returns no results
const SearchEmptyState = () => (
  <div className="text-center py-12 text-muted-foreground">
    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
    <p className="text-lg font-medium">No results found</p>
    <p className="text-sm">Try adjusting your search terms</p>
  </div>
)

export interface BookingListSectionProps {
  bookings: StaffBooking[]
  loading: boolean
  limit: number
  onLoadMore: () => void
  onViewDetails: (booking: StaffBooking) => void
  onStartProgress: (bookingId: string) => Promise<void>
  onMarkCompleted: (bookingId: string) => Promise<void>
  searchInput: string
  emptyType: 'today' | 'upcoming' | 'past'
  showDate: boolean
  startingBookingId: string | null
  completingBookingId: string | null
}

export function BookingListSection({
  bookings,
  loading,
  limit,
  onLoadMore,
  onViewDetails,
  onStartProgress,
  onMarkCompleted,
  searchInput,
  emptyType,
  showDate,
  startingBookingId,
  completingBookingId,
}: BookingListSectionProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="space-y-4">
        {searchInput ? <SearchEmptyState /> : <EmptyState type={emptyType} />}
      </div>
    )
  }

  const visibleBookings = bookings.slice(0, limit)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        {visibleBookings.map((booking, index) => (
          <div
            key={booking.id}
            className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <SimplifiedBookingCard
              booking={booking}
              onViewDetails={onViewDetails}
              onStartProgress={onStartProgress}
              onMarkCompleted={onMarkCompleted}
              showDate={showDate}
              isStartingProgress={startingBookingId === booking.id}
              isCompletingProgress={completingBookingId === booking.id}
            />
          </div>
        ))}
      </div>
      {bookings.length > limit && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={onLoadMore}
            variant="outline"
            size="lg"
            className="min-h-[44px]"
          >
            Load More ({bookings.length - limit} remaining)
          </Button>
        </div>
      )}
    </div>
  )
}
