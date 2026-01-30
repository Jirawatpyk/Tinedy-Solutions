/**
 * BookingCustomerCard Component
 *
 * Customer info card with quick action buttons:
 * - Avatar with initials
 * - Name, phone, address
 * - Call, Map, Navigate buttons
 *
 * @example
 * ```tsx
 * <BookingCustomerCard
 *   customer={{ full_name: 'John Doe', phone: '0812345678' }}
 *   address="123 Main St, Bangkok 10100"
 * />
 * ```
 *
 * @see BookingDetailContent - Parent component that uses this
 */

import { Phone, MapPin, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/string-utils'

interface CustomerInfo {
  full_name: string
  phone?: string | null
  avatar_url?: string | null
}

interface BookingCustomerCardProps {
  /** Customer data */
  customer: CustomerInfo | null | undefined
  /** Full formatted address */
  address: string
}

export function BookingCustomerCard({
  customer,
  address,
}: BookingCustomerCardProps) {
  const customerName = customer?.full_name || 'Unknown Customer'
  // Ensure phone is non-empty string (not just truthy)
  const phone = customer?.phone?.trim() || null

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (phone && phone.length > 0) {
      window.location.href = `tel:${phone}`
    }
  }

  const handleOpenMap = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
        '_blank'
      )
    }
  }

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (address) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
        '_blank'
      )
    }
  }

  return (
    <Card className="mx-4">
      <CardContent className="p-4">
        {/* Customer Info */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={customer?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(customerName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{customerName}</h3>
            {phone && (
              <p className="text-sm text-muted-foreground">{phone}</p>
            )}
            {address && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {address}
              </p>
            )}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-h-[44px]"
            onClick={handleCall}
            disabled={!phone}
            aria-label="Call customer"
          >
            <Phone className="h-4 w-4 mr-2" />
            Call
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-h-[44px]"
            onClick={handleOpenMap}
            disabled={!address}
            aria-label="Open in Google Maps"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Map
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-h-[44px]"
            onClick={handleNavigate}
            disabled={!address}
            aria-label="Get directions"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Navigate
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
