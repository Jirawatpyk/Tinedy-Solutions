import type { Booking } from '@/types'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PromptPayQR } from '@/components/payment/PromptPayQR'
import { SlipUpload } from '@/components/payment/SlipUpload'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CheckCircle2, Calendar, Clock, MapPin, Upload, QrCode } from 'lucide-react'

type PaymentMethod = 'promptpay' | 'slip' | null

export function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null)

  const fetchBooking = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customers (id, full_name, email, phone),
          service_packages (name, service_type)
        `)
        .eq('id', bookingId)
        .single()

      if (error) throw error

      setBooking(data)

      // Redirect if already paid
      if (data.payment_status === 'paid') {
        navigate(`/payment/${bookingId}/success`)
      }
    } catch (error) {
      console.error('Error fetching booking:', error)
    } finally {
      setLoading(false)
    }
  }, [bookingId, navigate])

  const checkPaymentStatus = useCallback(async () => {
    if (!bookingId) return

    try {
      const { data } = await supabase
        .from('bookings')
        .select('payment_status')
        .eq('id', bookingId)
        .single()

      if (data?.payment_status === 'paid') {
        navigate(`/payment/${bookingId}/success`)
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
    }
  }, [bookingId, navigate])

  useEffect(() => {
    if (bookingId) {
      fetchBooking()

      // Poll for payment status every 3 seconds
      const interval = setInterval(() => {
        checkPaymentStatus()
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [bookingId, fetchBooking, checkPaymentStatus])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Alert variant="destructive">
            <AlertDescription>
              Booking not found. Please check your payment link.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Payment
          </h1>
          <p className="text-gray-600">
            Booking ID: <span className="font-mono font-semibold">#{booking.id.slice(0, 8)}</span>
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Booking Summary */}
          <div className="space-y-6">
            {/* Service Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Service */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Service</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {booking.service_packages?.service_type || 'Service'}
                    </Badge>
                    <p className="font-medium">{booking.service_packages?.name}</p>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">{formatDate(booking.booking_date)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Time</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">
                        {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Location</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <p className="text-sm">
                      {[booking.address, booking.city, booking.state, booking.zip_code]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>

                {/* Customer */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Customer</p>
                  <p className="font-medium">{booking.customers?.full_name}</p>
                  <p className="text-sm text-gray-600">{booking.customers?.phone}</p>
                </div>

                {/* Total */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">Total Amount</p>
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(booking.total_price)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment Methods */}
          <div className="space-y-6">
            {/* Payment Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* PromptPay Button */}
                <button
                  onClick={() => setPaymentMethod('promptpay')}
                  className={`w-full p-4 border-2 rounded-lg transition-all ${
                    paymentMethod === 'promptpay'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <QrCode className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">PromptPay QR</p>
                      <p className="text-sm text-gray-600">Scan to pay instantly</p>
                    </div>
                    {paymentMethod === 'promptpay' && (
                      <CheckCircle2 className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                </button>

                {/* Upload Slip Button */}
                <button
                  onClick={() => setPaymentMethod('slip')}
                  className={`w-full p-4 border-2 rounded-lg transition-all ${
                    paymentMethod === 'slip'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Upload className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">Upload Slip</p>
                      <p className="text-sm text-gray-600">Bank transfer slip</p>
                    </div>
                    {paymentMethod === 'slip' && (
                      <CheckCircle2 className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                </button>
              </CardContent>
            </Card>

            {/* Payment Method Content */}
            {paymentMethod === 'promptpay' && (
              <PromptPayQR
                amount={booking.total_price}
                bookingId={booking.id}
              />
            )}

            {paymentMethod === 'slip' && (
              <SlipUpload
                bookingId={booking.id}
                amount={booking.total_price}
                onSuccess={() => navigate(`/payment/${booking.id}/success`)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
