import type { Booking } from '@/types'
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
import { User, Users, Mail, MapPin, Clock, Edit, Send, Trash2, CreditCard, Star, Copy, Link2, Check } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { formatTime, formatFullAddress } from '@/lib/booking-utils'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

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
  actionLoading?: {
    statusChange: boolean
    delete: boolean
    markAsPaid: boolean
  }
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
  actionLoading,
}: BookingDetailModalProps) {
  const [sendingReminder, setSendingReminder] = useState(false)
  const [review, setReview] = useState<Review | null>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [savingReview, setSavingReview] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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

  const handleCopyPaymentLink = useCallback(() => {
    if (!booking) return

    const paymentLink = `${window.location.origin}/payment/${booking.id}`

    navigator.clipboard.writeText(paymentLink).then(() => {
      setCopiedLink(true)
      toast({
        title: 'Copied!',
        description: 'Payment link copied to clipboard',
      })

      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedLink(false)
      }, 2000)
    }).catch(() => {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      })
    })
  }, [booking, toast])

  const handleSendReminder = async () => {
    if (!booking || !booking.customers) return

    setSendingReminder(true)

    try {
      // Call Edge Function to send email (Edge Function will fetch settings from database)
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
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Booking Details - #{booking.id.slice(0, 8)}</DialogTitle>
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
                  {formatCurrency(Number(booking.total_price || 0))}
                </p>
                {booking.payment_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Paid on {formatDate(booking.payment_date)}
                  </p>
                )}
              </div>
              {booking.payment_method && (
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-medium capitalize">{booking.payment_method.replace('_', ' ')}</p>
                </div>
              )}
              {booking.payment_slip_url && (
                <div>
                  <Label className="text-muted-foreground">Payment Slip</Label>
                  <a
                    href={booking.payment_slip_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline mt-1"
                  >
                    <Link2 className="h-4 w-4" />
                    View Payment Slip
                  </a>
                </div>
              )}
            </div>
            {booking.payment_status !== 'paid' && (
              <div className="mt-3">
                <Select onValueChange={(method) => onMarkAsPaid(booking.id, method)} disabled={actionLoading?.markAsPaid}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={actionLoading?.markAsPaid ? "Processing..." : "Mark as Paid"} />
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

          {/* Payment Link - Show only if unpaid */}
          {booking.payment_status !== 'paid' && (
            <div className="space-y-3 border-b pb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5 text-tinedy-blue" />
                Payment Link
              </h3>
              <p className="text-sm text-muted-foreground">
                Copy and share this link with customer via LINE, WhatsApp, or SMS
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/payment/${booking.id}`}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm bg-gray-50 font-mono"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  onClick={handleCopyPaymentLink}
                  variant={copiedLink ? "default" : "outline"}
                  className={copiedLink ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = `${window.location.origin}/payment/${booking.id}`
                    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(`กรุณาชำระเงิน ฿${booking.total_price}\n${link}`)}`, '_blank')
                  }}
                  className="text-green-600 hover:bg-green-50"
                >
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                  LINE
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = `${window.location.origin}/payment/${booking.id}`
                    window.open(`https://wa.me/?text=${encodeURIComponent(`กรุณาชำระเงิน ฿${booking.total_price}\n${link}`)}`, '_blank')
                  }}
                  className="text-green-600 hover:bg-green-50"
                >
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = `${window.location.origin}/payment/${booking.id}`
                    window.open(`sms:${booking.customers?.phone || ''}?body=${encodeURIComponent(`กรุณาชำระเงิน ฿${booking.total_price}\n${link}`)}`, '_blank')
                  }}
                  className="text-blue-600 hover:bg-blue-50"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  SMS
                </Button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <Button
                variant="outline"
                onClick={() => onEdit(booking)}
                disabled={['completed', 'cancelled', 'no_show'].includes(booking.status)}
                title={['completed', 'cancelled', 'no_show'].includes(booking.status) ? 'Cannot edit completed, cancelled, or no-show bookings' : undefined}
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
                disabled={actionLoading?.statusChange}
              >
                <SelectTrigger>
                  <SelectValue>{actionLoading?.statusChange ? 'Updating...' : getStatusLabel(booking.status)}</SelectValue>
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
                onClick={() => setShowDeleteConfirm(true)}
                disabled={actionLoading?.delete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {actionLoading?.delete ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={showDeleteConfirm}
      onOpenChange={setShowDeleteConfirm}
      onConfirm={() => {
        onDelete(booking.id)
        setShowDeleteConfirm(false)
        onClose()
      }}
      title="Delete Booking"
      description={`Are you sure you want to delete the booking for ${booking.customers?.full_name || 'customer'} on ${formatDate(booking.booking_date)} at ${formatTime(booking.start_time)}? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="destructive"
    />
  </>
  )
}
