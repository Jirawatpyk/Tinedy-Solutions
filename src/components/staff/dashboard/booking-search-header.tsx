import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'

interface BookingSearchHeaderProps {
  searchInput: string
  onSearchChange: (value: string) => void
  onClear: () => void
}

export function BookingSearchHeader({ searchInput, onSearchChange, onClear }: BookingSearchHeaderProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl border-b border-tinedy-dark/5 sticky top-0 z-20 shadow-sm">
      <div className="px-3 sm:px-6 lg:px-8 py-2 tablet-landscape:py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <h1 className="text-lg tablet-landscape:text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-tinedy-dark via-tinedy-dark/90 to-tinedy-dark/80 bg-clip-text text-transparent">
            My Bookings
          </h1>
          {/* Search Input */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search bookings..."
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-8 h-9 text-sm"
              aria-label="Search bookings by ID, customer, package, address, or status"
            />
            {searchInput && (
              <button
                type="button"
                onClick={onClear}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-tinedy-off-white rounded-full transition-colors"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
