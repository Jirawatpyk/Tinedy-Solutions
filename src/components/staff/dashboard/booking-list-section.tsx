import { SimplifiedBookingCard } from '@/components/staff/simplified-booking-card'
import { EmptyState } from '@/components/staff/empty-state'
import { Button } from '@/components/ui/button'
import { BookingCardSkeleton } from '@/components/staff/skeletons'
import { Search } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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
  const shouldReduceMotion = useReducedMotion()
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <BookingCardSkeleton key={i} />
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
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
        <AnimatePresence mode="popLayout">
          {visibleBookings.map((booking, index) => (
            <motion.div
              key={booking.id}
              layout={!shouldReduceMotion}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95, transformOrigin: 'center top' }}
              transition={shouldReduceMotion
                ? { duration: 0.01 }
                : { duration: 0.3, delay: Math.min(index * 0.05, 0.5), layout: { duration: 0.3 } }
              }
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
            </motion.div>
          ))}
        </AnimatePresence>
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
