import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, User, Package, Phone, CheckCircle2, StickyNote, MapPin, MessageCircle } from 'lucide-react'
import { type StaffBooking, formatFullAddress } from '@/hooks/use-staff-bookings'
import { format } from 'date-fns'

interface BookingCardProps {
  booking: StaffBooking
  onViewDetails: (booking: StaffBooking) => void
  onMarkCompleted?: (bookingId: string) => void
  showDate?: boolean
}

export function BookingCard({ booking, onViewDetails, onMarkCompleted, showDate = false }: BookingCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'เสร็จสิ้น'
      case 'confirmed':
        return 'ยืนยันแล้ว'
      case 'pending':
        return 'รอยืนยัน'
      case 'cancelled':
        return 'ยกเลิก'
      default:
        return status
    }
  }

  const canMarkCompleted = booking.status === 'confirmed'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-6">
        {/* Header - Status and Time */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-semibold text-lg">{booking.start_time} - {booking.end_time}</span>
          </div>
          <Badge className={getStatusColor(booking.status)} variant="outline">
            {getStatusText(booking.status)}
          </Badge>
        </div>

        {/* Date (for upcoming bookings) */}
        {showDate && (
          <div className="mb-3 text-sm text-muted-foreground">
            {format(new Date(booking.booking_date), 'dd MMM yyyy')}
          </div>
        )}

        {/* Customer Info */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">
              {booking.customers?.full_name || 'Unknown Customer'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">
              {booking.customers?.phone || 'No phone'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">
              {booking.service_packages?.name || 'Unknown Service'}
            </span>
          </div>

          {booking.service_packages?.duration_minutes && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">
                {booking.service_packages.duration_minutes} นาที
              </span>
            </div>
          )}

          {booking.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground break-words">
                {formatFullAddress(booking)}
              </span>
            </div>
          )}

          {booking.notes && (
            <div className="flex items-start gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground line-clamp-2">
                {booking.notes}
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-3">
          <Button
            onClick={() => window.open(`tel:${booking.customers?.phone}`)}
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={!booking.customers?.phone}
          >
            <Phone className="h-3 w-3 mr-1" />
            โทร
          </Button>
          <Button
            onClick={() => {
              if (booking.address) {
                const fullAddress = formatFullAddress(booking)
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`, '_blank')
              }
            }}
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={!booking.address}
          >
            <MapPin className="h-3 w-3 mr-1" />
            แผนที่
          </Button>
          <Button
            onClick={() => {
              // TODO: Integrate with chat system
              alert('ฟีเจอร์แชทกำลังพัฒนา')
            }}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            แชท
          </Button>
        </div>

        {/* Main Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => onViewDetails(booking)}
            variant="outline"
            className="flex-1 min-w-[120px]"
            size="sm"
          >
            ดูรายละเอียด
          </Button>
          {canMarkCompleted && onMarkCompleted && (
            <Button
              onClick={() => onMarkCompleted(booking.id)}
              variant="default"
              className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              เสร็จสิ้น
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
