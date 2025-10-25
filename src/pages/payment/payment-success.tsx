import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, Calendar, Clock, MapPin, CheckCheck } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  total_price: number
  payment_status?: string
  payment_method?: string
  payment_date?: string
  address: string
  city: string
  state: string
  customers: {
    full_name: string
    email: string
    phone: string
  } | null
  service_packages: {
    name: string
    service_type: string
  } | null
}

export function PaymentSuccessPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBooking = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customers (full_name, email, phone),
          service_packages (name, service_type)
        `)
        .eq('id', bookingId)
        .single()

      if (error) throw error
      setBooking(data)
    } catch (error) {
      console.error('Error fetching booking:', error)
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    if (bookingId) {
      fetchBooking()
    }
  }, [bookingId, fetchBooking])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Booking not found
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const isPaid = booking.payment_status === 'paid'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardContent className="pt-8">
            {/* Success Icon */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {isPaid ? 'Payment Confirmed!' : 'Payment Submitted!'}
              </h1>
              <p className="text-muted-foreground">
                {isPaid
                  ? `Thank you, ${booking.customers?.full_name}! Your payment has been received and your booking is confirmed.`
                  : `Thank you, ${booking.customers?.full_name}! Your payment slip has been submitted. We will verify it within 24 hours.`}
              </p>
            </div>

            {/* Booking Details */}
            <div className="space-y-6 border-t pt-6">
              <div>
                <h2 className="font-semibold text-lg mb-4">Booking Details</h2>

                <div className="space-y-3">
                  {/* Booking ID */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Booking ID</span>
                    <span className="font-mono font-medium">
                      #{booking.id.slice(0, 8)}
                    </span>
                  </div>

                  {/* Service */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium">{booking.service_packages?.name}</span>
                  </div>

                  {/* Date */}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Date</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{formatDate(booking.booking_date)}</span>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Time</span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                      </span>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground">Location</span>
                    <div className="flex items-start gap-2 max-w-xs text-right">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">
                        {[booking.address, booking.city, booking.state]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="border-t pt-6">
                <h2 className="font-semibold text-lg mb-4">Payment Summary</h2>

                <div className="space-y-3">
                  {/* Amount */}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(Number(booking.total_price) || 0)}
                    </span>
                  </div>

                  {/* Payment Method */}
                  {booking.payment_method && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Method</span>
                      <span className="font-medium capitalize">
                        {booking.payment_method.replace('_', ' ')}
                      </span>
                    </div>
                  )}

                  {/* Payment Date */}
                  {booking.payment_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Date</span>
                      <span className="font-medium">{formatDate(booking.payment_date)}</span>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    {isPaid ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Confirmed
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                        Pending Verification
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ {isPaid ? 'Confirmation email sent' : 'We will email you once verified'}</li>
                  <li>✓ Service will be provided on the scheduled date</li>
                  <li>✓ Check your email for more details</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="pt-4">
                <Button
                  className="w-full"
                  size="lg"
                  disabled
                >
                  <CheckCheck className="h-5 w-5 mr-2" />
                  Payment Completed
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  You can safely close this page now
                </p>
              </div>

              {/* Contact Info */}
              <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                <p>Need help? Contact us at support@tinedy.com</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
