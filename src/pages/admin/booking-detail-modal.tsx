import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User, Users, Mail, MapPin, Clock, Edit, Send, Trash2, CreditCard, Star } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

// Helper function to format full address
function formatFullAddress(booking: { address: string; city: string; state: string; zip_code: string }): string {
  const parts = [
    booking.address,
    booking.city,
    booking.state,
    booking.zip_code
  ].filter(part => part && part.trim())

  return parts.join(', ')
}

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  address: string
  city: string
  state: string
  zip_code: string
  staff_id: string | null
  team_id: string | null
  service_package_id: string
  payment_status?: string
  payment_method?: string
  amount_paid?: number
  payment_date?: string
  payment_notes?: string
  customers: { full_name: string; email: string; id: string } | null
  service_packages: { name: string; service_type: string } | null
  profiles: { full_name: string } | null
  teams: { name: string } | null
}

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
}

interface BookingDetailModalProps {
  booking: Booking | null
  isOpen: boolean
  onClose: () => void
  onEdit: (booking: Booking) => void
  onDelete: (bookingId: string) => void
  onStatusChange: (bookingId: string, currentStatus: string, newStatus: string) => void
  onMarkAsPaid: (bookingId: string, method: string) => void
  getStatusBadge: (status: string) => React.ReactNode
  getPaymentStatusBadge: (status?: string) => React.ReactNode
  getAvailableStatuses: (currentStatus: string) => string[]
  getStatusLabel: (status: string) => string
}

export function BookingDetailModal({
  booking,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onMarkAsPaid,
  getStatusBadge,
  getPaymentStatusBadge,
  getAvailableStatuses,
  getStatusLabel,
}: BookingDetailModalProps) {
  const [sendingReminder, setSendingReminder] = useState(false)
  const [review, setReview] = useState<Review | null>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [savingReview, setSavingReview] = useState(false)
  const { toast } = useToast()

  const resetReview = useCallback(() => {
    setReview(null)
    setRating(0)
  }, [])

  const fetchReview = useCallback(async () => {
    if (!booking?.id) return

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('booking_id', booking.id)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setReview(data)
        setRating(data.rating)
      } else {
        resetReview()
      }
    } catch (error) {
      console.error('Error fetching review:', error)
    }
  }, [booking, resetReview])

  // Fetch existing review when booking changes
  useEffect(() => {
    if (booking?.id) {
      fetchReview()
    } else {
      resetReview()
    }
  }, [booking?.id, fetchReview, resetReview])

  const handleSaveReview = async () => {
    if (!booking?.id || (!booking?.staff_id && !booking?.team_id) || !booking?.customers?.id || rating === 0) {
      toast({
        title: 'Cannot save review',
        description: 'Please select a rating and ensure booking has assigned staff or team',
        variant: 'destructive',
      })
      return
    }

    setSavingReview(true)

    try {
      if (review) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update({
            rating,
          })
          .eq('id', review.id)

        if (error) throw error

        toast({
          title: 'Review Updated',
          description: 'The review has been updated successfully',
        })
      } else {
        // Create new review
        const reviewData: {
          booking_id: string
          customer_id: string
          rating: number
          staff_id?: string | null
          team_id?: string | null
        } = {
          booking_id: booking.id,
          customer_id: booking.customers.id,
          rating,
        }

        // Add staff_id or team_id
        if (booking.staff_id) {
          reviewData.staff_id = booking.staff_id
        } else if (booking.team_id) {
          reviewData.team_id = booking.team_id
        }

        const { error } = await supabase
          .from('reviews')
          .insert(reviewData)

        if (error) throw error

        toast({
          title: 'Review Saved',
          description: 'The review has been saved successfully',
        })
      }

      await fetchReview()
    } catch (error) {
      console.error('Error saving review:', error)
      toast({
        title: 'Error',
        description: 'Failed to save review',
        variant: 'destructive',
      })
    } finally {
      setSavingReview(false)
    }
  }

  // Format time to remove seconds (HH:MM:SS -> HH:MM)
  const formatTime = (time: string) => {
    return time.split(':').slice(0, 2).join(':')
  }

  const handleSendReminder = async () => {
    if (!booking || !booking.customers) return

    setSendingReminder(true)

    try {
      // Call Edge Function to send email
      const { data, error } = await supabase.functions.invoke('send-booking-reminder', {
        body: {
          customerName: booking.customers.full_name,
          customerEmail: booking.customers.email,
          serviceName: booking.service_packages?.name || 'Service',
          bookingDate: booking.booking_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          location: formatFullAddress(booking),
        },
      })

      if (error) {
        console.error('Edge Function Error:', error)
        throw new Error(error.message || 'Failed to call Edge Function')
      }

      if (!data?.success) {
        console.error('Email send failed:', data)
        throw new Error(data?.error || 'Failed to send reminder')
      }

      toast({
        title: 'Reminder Sent!',
        description: `Email sent to ${booking.customers.email}`,
      })
    } catch (error) {
      toast({
        title: 'Failed to Send Reminder',
        description: error instanceof Error ? error.message : 'An error occurred while sending the email',
        variant: 'destructive',
      })
    } finally {
      setSendingReminder(false)
    }
  }

  if (!booking) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
          <DialogDescription>
            View and manage booking information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-tinedy-blue" />
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{booking.customers?.full_name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {booking.customers?.email || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Service Info */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold text-lg">Service Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Service Package</Label>
                <p className="font-medium">{booking.service_packages?.name || 'N/A'}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Service Type</Label>
                <Badge variant="outline" className="w-fit">{booking.service_packages?.service_type || 'N/A'}</Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Price</Label>
                <p className="font-semibold text-tinedy-blue text-lg">
                  {formatCurrency(Number(booking.total_price))}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">{getStatusBadge(booking.status)}</div>
              </div>
            </div>
          </div>

          {/* Schedule Info */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-tinedy-blue" />
              Schedule
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Date</Label>
                <p className="font-medium">{formatDate(booking.booking_date)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Time</Label>
                <p className="font-medium">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </p>
              </div>
            </div>
          </div>

          {/* Location Info */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-tinedy-blue" />
              Location
            </h3>
            <p className="text-sm break-words">{formatFullAddress(booking)}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const fullAddress = formatFullAddress(booking)
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
                  '_blank'
                )
              }}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Open in Google Maps
            </Button>
          </div>

          {/* Assignment Info & Rating */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-b pb-4">
            {/* Assignment Section */}
            {(booking.profiles || booking.teams) && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Assignment</h3>
                <div className="space-y-3">
                  {booking.profiles && (
                    <div>
                      <Label className="text-muted-foreground">Assigned Staff</Label>
                      <p className="font-medium flex items-center gap-1">
                        <User className="h-3 w-3 text-tinedy-blue" />
                        {booking.profiles.full_name}
                      </p>
                    </div>
                  )}
                  {booking.teams && (
                    <div>
                      <Label className="text-muted-foreground">Assigned Team</Label>
                      <p className="font-medium flex items-center gap-1">
                        <Users className="h-3 w-3 text-tinedy-green" />
                        {booking.teams.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rating Section */}
            {(booking.staff_id || booking.team_id) && booking.status === 'completed' && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Service Rating
                </h3>
                <div className="space-y-3">
                  {/* Star Rating */}
                  <div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="focus:outline-none transition-transform hover:scale-110"
                          aria-label={`Rate ${star} stars`}
                          title={`Rate ${star} stars`}
                        >
                          <Star
                            className={`h-6 w-6 ${
                              star <= (hoverRating || rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                      {rating > 0 && (
                        <span className="ml-2 text-sm font-medium text-muted-foreground">
                          {rating}/5
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  {rating > 0 && (
                    <Button
                      onClick={handleSaveReview}
                      disabled={savingReview}
                      className="w-full"
                      size="sm"
                    >
                      {savingReview ? 'Saving...' : review ? 'Update Review' : 'Save Review'}
                    </Button>
                  )}

                  {/* Existing Review Display */}
                  {review && (
                    <div className="text-xs text-muted-foreground">
                      Last updated: {formatDate(review.created_at)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment Info */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-tinedy-blue" />
              Payment Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Payment Status</Label>
                <div className="mt-1">{getPaymentStatusBadge(booking.payment_status)}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Amount Paid</Label>
                <p className="font-semibold text-green-600 text-lg">
                  {formatCurrency(Number(booking.amount_paid || 0))}
                </p>
              </div>
              {booking.payment_method && (
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-medium capitalize">{booking.payment_method.replace('_', ' ')}</p>
                </div>
              )}
              {booking.payment_date && (
                <div>
                  <Label className="text-muted-foreground">Payment Date</Label>
                  <p className="font-medium">{formatDate(booking.payment_date)}</p>
                </div>
              )}
            </div>
            {booking.payment_status !== 'paid' && (
              <div className="mt-3">
                <Select onValueChange={(method) => onMarkAsPaid(booking.id, method)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Mark as Paid" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="line_pay">LINE Pay</SelectItem>
                    <SelectItem value="promptpay">PromptPay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <Button
                variant="outline"
                onClick={() => onEdit(booking)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleSendReminder}
                disabled={sendingReminder || !booking.customers?.email}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingReminder ? 'Sending...' : 'Reminder'}
              </Button>
              <Select
                value={booking.status}
                onValueChange={(value) => {
                  onStatusChange(booking.id, booking.status, value)
                }}
              >
                <SelectTrigger>
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
                variant="destructive"
                onClick={() => {
                  onDelete(booking.id)
                  onClose()
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
