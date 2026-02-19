import type { Booking } from '@/types'
import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PaymentMethodSkeleton } from '@/components/skeletons/lazy-loading-skeletons'
import { formatCurrency, formatDate, formatBookingId } from '@/lib/utils'
import { formatDateRange } from '@/lib/date-range-utils'
import { CheckCircle2, Calendar, Clock, MapPin, Upload, QrCode } from 'lucide-react'
import { toast } from 'sonner'

// Lazy load payment components to reduce initial bundle size
const PromptPayQR = lazy(() =>
  import('@/components/payment/PromptPayQR').then((m) => ({ default: m.PromptPayQR }))
)
const SlipUpload = lazy(() =>
  import('@/components/payment/SlipUpload').then((m) => ({ default: m.SlipUpload }))
)

type PaymentMethod = 'promptpay' | 'slip' | null

export function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [recurringBookings, setRecurringBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null)

  const fetchBooking = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customers (id, full_name, email, phone),
          service_packages_v2:package_v2_id (name, service_type)
        `)
        .eq('id', bookingId)
        .single()

      if (error) throw error

      // ✅ ถ้าเป็น child booking ให้ redirect ไปที่ parent
      if (data.parent_booking_id) {
        navigate(`/payment/${data.parent_booking_id}`, { replace: true })
        return
      }

      setBooking(data)

      // ✅ ถ้าเป็น recurring booking ให้ fetch ทั้ง group
      if (data.is_recurring && data.recurring_group_id) {
        const { data: groupBookings, error: groupError } = await supabase
          .from('bookings')
          .select(`
            *,
            customers (id, full_name, email, phone),
            service_packages_v2:package_v2_id (name, service_type)
          `)
          .eq('recurring_group_id', data.recurring_group_id)
          .order('booking_date')

        if (!groupError && groupBookings) {
          setRecurringBookings(groupBookings)
        }
      }

      // Redirect if already paid
      if (data.payment_status === 'paid') {
        navigate(`/payment/${bookingId}/success`)
      }
    } catch (error) {
      console.error('Error fetching booking:', error)
      toast.error('Failed to load booking details. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [bookingId, navigate, toast])

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
      <div className="min-h-screen bg-tinedy-off-white/50 py-8">
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
      <div className="min-h-screen bg-tinedy-off-white/50 py-8">
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

  // Calculate total amount for recurring bookings
  const isRecurring = booking.is_recurring && recurringBookings.length > 0
  const totalAmount = isRecurring
    ? recurringBookings.reduce((sum, b) => sum + Number(b.total_price), 0)
    : booking.total_price

  return (
    <div className="min-h-screen bg-tinedy-off-white/50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-tinedy-dark mb-2">
            Complete Your Payment
          </h1>
          <p className="text-muted-foreground">
            Booking ID: <span className="font-semibold">{formatBookingId(booking.id)}</span>
            {isRecurring && (
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                🔄 Recurring ({recurringBookings.length} sessions)
              </span>
            )}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Booking Summary */}
          <div className="space-y-6">
            {/* Service Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {isRecurring ? 'Recurring Booking Summary' : 'Booking Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Service */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Service</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {booking.service_packages_v2?.service_type ?? 'Service'}
                    </Badge>
                    <p className="font-medium">{booking.job_name ?? booking.service_packages_v2?.name ?? 'ไม่ระบุบริการ'}</p>
                  </div>
                </div>

                {/* Recurring Schedule */}
                {isRecurring ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Schedule ({recurringBookings.length} sessions)</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {recurringBookings.map((b, index) => (
                        <div key={b.id} className="flex items-center justify-between p-2 bg-tinedy-off-white/50 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-blue-600">{index + 1}/{recurringBookings.length}</span>
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{formatDate(b.booking_date)}</span>
                            <Clock className="h-3 w-3 text-muted-foreground ml-2" />
                            <span>{b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}</span>
                          </div>
                          <span className="text-green-600 font-medium">{formatCurrency(b.total_price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Single Date & Time */
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{formatDateRange(booking.booking_date, booking.end_date)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Time</p>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">
                          {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Location</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
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
                  <p className="text-sm text-muted-foreground">{booking.customers?.phone}</p>
                </div>

                {/* Total */}
                <div className="pt-4 border-t">
                  {isRecurring && (
                    <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
                      <span>Price per session:</span>
                      <span>{formatCurrency(booking.total_price)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">Total Amount</p>
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(totalAmount)}
                    </p>
                  </div>
                  {isRecurring && (
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      Pay once for all {recurringBookings.length} sessions
                    </p>
                  )}
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
                      : 'border-tinedy-dark/10 hover:border-tinedy-dark/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <QrCode className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-tinedy-dark">PromptPay QR</p>
                      <p className="text-sm text-muted-foreground">Scan to pay instantly</p>
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
                      : 'border-tinedy-dark/10 hover:border-tinedy-dark/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Upload className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-tinedy-dark">Bank Transfer</p>
                      <p className="text-sm text-muted-foreground">Upload transfer slip</p>
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
              <Suspense fallback={<PaymentMethodSkeleton />}>
                <PromptPayQR
                  amount={totalAmount}
                  bookingId={booking.id}
                  recurringGroupId={isRecurring ? (booking.recurring_group_id || undefined) : undefined}
                  onSuccess={() => navigate(`/payment/${booking.id}/success`)}
                />
              </Suspense>
            )}

            {paymentMethod === 'slip' && (
              <Suspense fallback={<PaymentMethodSkeleton />}>
                <SlipUpload
                  bookingId={booking.id}
                  amount={totalAmount}
                  recurringGroupId={isRecurring ? (booking.recurring_group_id || undefined) : undefined}
                  onSuccess={() => navigate(`/payment/${booking.id}/success`)}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
