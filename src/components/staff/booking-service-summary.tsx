/**
 * BookingServiceSummary Component
 *
 * Compact service summary showing:
 * - Service name
 * - Duration + Price inline
 * - Team name (if team booking)
 *
 * @example
 * ```tsx
 * <BookingServiceSummary
 *   serviceName="Deep Cleaning"
 *   duration="2 hours"
 *   price={1500}
 *   teamName="Alpha Team"
 * />
 * ```
 *
 * @see BookingDetailContent - Parent component that uses this
 */

import { Briefcase, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface BookingServiceSummaryProps {
  /** Service name */
  serviceName: string | undefined
  /** Duration string (e.g., "2 hours") */
  duration: string
  /** Service price */
  price: number | undefined
  /** Team name (optional - for team bookings) */
  teamName?: string | null
}

export function BookingServiceSummary({
  serviceName,
  duration,
  price,
  teamName,
}: BookingServiceSummaryProps) {
  return (
    <div className="px-4 py-3 bg-muted/30 rounded-lg mx-4">
      {/* Service Name */}
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="font-medium truncate">
          {serviceName || 'Unknown Service'}
        </span>
      </div>

      {/* Duration, Price, Team */}
      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
        <span>{duration}</span>
        {price !== undefined && price > 0 && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <span>{formatCurrency(price)}</span>
          </>
        )}
        {teamName && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {teamName}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
