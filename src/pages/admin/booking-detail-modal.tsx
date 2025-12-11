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
import { User, Users, Mail, MapPin, Clock, Edit, Send, CreditCard, Star, Copy, Link2, Check, Package, Crown, FileText } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { formatTime, formatFullAddress } from '@/lib/booking-utils'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { CollapsibleSection } from '@/components/common/CollapsibleSection'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { getFrequencyLabel } from '@/types/service-package-v2'

// Status transition messages
const getStatusTransitionMessage = (currentStatus: string, newStatus: string): string => {
  const messages: Record<string, Record<string, string>> = {
    pending: {
      confirmed: 'Confirm this booking?',
      cancelled: 'Cancel this booking? This action cannot be undone.',
    },
    confirmed: {
      in_progress: 'Mark this booking as in progress?',
      cancelled: 'Cancel this booking? This action cannot be undone.',
      no_show: 'Mark this booking as no-show? This action cannot be undone.',
    },
    in_progress: {
      completed: 'Mark this booking as completed?',
      cancelled: 'Cancel this booking? This action cannot be undone.',
    },
  }
  return messages[currentStatus]?.[newStatus] || `Change status from "${currentStatus}" to "${newStatus}"?`
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
  onEdit?: (booking: Booking) => void
  onDelete: (bookingId: string) => void
  onCancel?: (bookingId: string) => void
  onStatusChange: (bookingId: string, currentStatus: string, newStatus: string) => void
  onMarkAsPaid: (bookingId: string, method: string) => void
  onVerifyPayment?: (bookingId: string) => void
  onRequestRefund?: (bookingId: string) => void
  onCompleteRefund?: (bookingId: string) => void
  onCancelRefund?: (bookingId: string) => void
  getStatusBadge: (status: string) => React.ReactNode
  getPaymentStatusBadge: (status?: string) => React.ReactNode
  getAvailableStatuses: (currentStatus: string) => string[]
  getStatusLabel: (status: string) => string
  isUpdatingStatus?: boolean
  isUpdatingPayment?: boolean
  isDeleting?: boolean
  actionLoading?: {
    statusChange?: boolean
    delete?: boolean
    markAsPaid?: boolean
    refund?: boolean
  }
}

export function BookingDetailModal({
  booking,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onCancel,
  onStatusChange,
  onMarkAsPaid,
  onVerifyPayment,
  onRequestRefund,
  onCompleteRefund,
  onCancelRefund,
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
  // Status change confirmation
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
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
      toast({
        title: 'Error',
        description: 'Failed to load review data',
        variant: 'destructive',
      })
    }
  }, [booking, resetReview, toast])

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

    // ✅ ใช้ parent_booking_id ถ้ามี ไม่งั้นใช้ booking.id
    const paymentLink = `${window.location.origin}/payment/${booking.parent_booking_id || booking.id}`

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

  // Status change handlers
  const handleStatusChangeRequest = (newStatus: string) => {
    if (!booking || newStatus === booking.status) return
    setPendingStatus(newStatus)
    setShowStatusConfirm(true)
  }

  const confirmStatusChange = () => {
    if (!booking || !pendingStatus) return
    onStatusChange(booking.id, booking.status, pendingStatus)
    setShowStatusConfirm(false)
    setPendingStatus(null)
  }

  const cancelStatusChange = () => {
    setShowStatusConfirm(false)
    setPendingStatus(null)
  }

  const handleSendReminder = async () => {
    if (!booking || !booking.customers) return

    setSendingReminder(true)

    try {
      // Call Edge Function to send email (Edge Function will query booking data)
      const { data, error } = await supabase.functions.invoke('send-booking-reminder', {
        body: {
          bookingId: booking.id,
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
          <CollapsibleSection
            title={
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-tinedy-blue" />
                Customer Information
              </h3>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </CollapsibleSection>

          {/* Service Info */}
          <CollapsibleSection
            title={
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-tinedy-blue" />
                Service Details
              </h3>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Service Package</Label>
                <p className="font-medium">{booking.service_packages?.name || booking.service_packages_v2?.name || 'N/A'}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Service Type</Label>
                <Badge variant="outline" className="w-fit">{booking.service_packages?.service_type || booking.service_packages_v2?.service_type || 'N/A'}</Badge>
              </div>

              {/* Show area and frequency (for Tiered Pricing) */}
              {booking.area_sqm && booking.area_sqm > 0 && (
                <div>
                  <Label className="text-muted-foreground">Area</Label>
                  <p className="font-medium">{booking.area_sqm} sqm</p>
                </div>
              )}
              {booking.frequency && (
                <div>
                  <Label className="text-muted-foreground">Frequency</Label>
                  <p className="font-medium">
                    {booking.is_recurring && booking.recurring_sequence && booking.recurring_total
                      ? `${booking.recurring_sequence}/${booking.recurring_total} (${getFrequencyLabel(booking.frequency)})`
                      : getFrequencyLabel(booking.frequency)}
                  </p>
                </div>
              )}

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
          </CollapsibleSection>

          {/* Schedule Info */}
          <CollapsibleSection
            title={
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-tinedy-blue" />
                Schedule
              </h3>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </CollapsibleSection>

          {/* Location Info */}
          <CollapsibleSection
            title={
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-tinedy-blue" />
                Location
              </h3>
            }
          >
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
          </CollapsibleSection>

          {/* Assignment Section */}
          {(booking.profiles || booking.teams) && (
            <CollapsibleSection
              title={<h3 className="font-semibold text-lg">Assignment</h3>}
            >

              {/* Assigned Staff (if exists) */}
              {booking.profiles && (
                <div>
                  <Label className="text-muted-foreground">Assigned Staff</Label>
                  <p className="font-medium flex items-center gap-1">
                    <User className="h-3 w-3 text-tinedy-blue" />
                    {booking.profiles.full_name}
                  </p>
                </div>
              )}

              {/* Assigned Team with Team Lead (2 columns) */}
              {booking.teams && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Assigned Team</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Users className="h-3 w-3 text-tinedy-green" />
                      {booking.teams.name}
                    </p>
                  </div>
                  {booking.teams.team_lead && (
                    <div>
                      <Label className="text-muted-foreground">Team Lead</Label>
                      <p className="font-medium flex items-center gap-1">
                        <Crown className="h-3 w-3 text-amber-600" />
                        {booking.teams.team_lead.full_name}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* Notes Section */}
          {booking.notes && (
            <CollapsibleSection
              title={
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-tinedy-blue" />
                  Notes
                </h3>
              }
            >
              <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
            </CollapsibleSection>
          )}

          {/* Rating Section */}
          {(booking.staff_id || booking.team_id) && booking.status === 'completed' && (
            <CollapsibleSection
              title={
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Service Rating
                </h3>
              }
            >
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
            </CollapsibleSection>
          )}

          {/* Payment Info */}
          <CollapsibleSection
            title={
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-tinedy-blue" />
                Payment Information
              </h3>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Payment Status</Label>
                <div className="mt-1">{getPaymentStatusBadge(booking.payment_status)}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Amount</Label>
                <p className="font-semibold text-green-600 text-lg">
                  {formatCurrency(
                    booking.is_recurring && booking.recurring_total
                      ? Number(booking.total_price || 0) * booking.recurring_total
                      : Number(booking.total_price || 0)
                  )}
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
                    View Slip
                  </a>
                </div>
              )}
            </div>

            {/* Payment Actions */}
            {booking.payment_status !== 'refunded' && (
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                {/* Verify button - for pending_verification status with slip */}
                {booking.payment_status === 'pending_verification' && booking.payment_slip_url && onVerifyPayment && (
                  <Button
                    onClick={() => onVerifyPayment(booking.id)}
                    disabled={actionLoading?.markAsPaid}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {actionLoading?.markAsPaid ? "Verifying..." : "Verify Payment"}
                  </Button>
                )}
                {/* Mark as Paid dropdown - for unpaid */}
                {booking.payment_status === 'unpaid' && (
                  <Select onValueChange={(method) => onMarkAsPaid(booking.id, method)} disabled={actionLoading?.markAsPaid}>
                    <SelectTrigger className="w-full sm:w-40">
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
                )}
                {/* Request Refund - for paid status */}
                {booking.payment_status === 'paid' && onRequestRefund && (
                  <Button
                    onClick={() => onRequestRefund(booking.id)}
                    disabled={actionLoading?.refund}
                    size="sm"
                    variant="outline"
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    {actionLoading?.refund ? "Processing..." : "Request Refund"}
                  </Button>
                )}
                {/* Refund Actions - for refund_pending status */}
                {booking.payment_status === 'refund_pending' && (
                  <>
                    {onCompleteRefund && (
                      <Button
                        onClick={() => onCompleteRefund(booking.id)}
                        disabled={actionLoading?.refund}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {actionLoading?.refund ? "Processing..." : "Complete Refund"}
                      </Button>
                    )}
                    {onCancelRefund && (
                      <Button
                        onClick={() => onCancelRefund(booking.id)}
                        disabled={actionLoading?.refund}
                        size="sm"
                        variant="outline"
                      >
                        Cancel Refund
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </CollapsibleSection>

          {/* Payment Link - Show only if unpaid */}
          {booking.payment_status === 'unpaid' && (
            <CollapsibleSection
              title={
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-tinedy-blue" />
                  Payment Link
                </h3>
              }
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/payment/${booking.parent_booking_id || booking.id}`}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm bg-gray-50 font-mono"
                  onClick={(e) => e.currentTarget.select()}
                  aria-label="Payment link URL"
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
            </CollapsibleSection>
          )}

          {/* Quick Actions */}
          <div className="space-y-3 pt-2">
            <h3 className="font-semibold text-lg">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  onClick={() => onEdit(booking)}
                  disabled={['completed', 'cancelled', 'no_show'].includes(booking.status)}
                  title={['completed', 'cancelled', 'no_show'].includes(booking.status) ? 'Cannot edit completed, cancelled, or no-show bookings' : undefined}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
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
                onValueChange={handleStatusChangeRequest}
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
              <PermissionAwareDeleteButton
                resource="bookings"
                itemName={`Booking for ${booking.customers?.full_name || 'customer'} on ${formatDate(booking.booking_date)}`}
                onDelete={() => {
                  onDelete(booking.id)
                  onClose()
                }}
                onCancel={onCancel ? () => {
                  onCancel(booking.id)
                  onClose()
                } : undefined}
                variant="default"
                size="default"
                buttonVariant="outline"
                cancelText="Archive"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      {/* Status Change Confirmation Dialog */}
      {booking && pendingStatus && (
        <ConfirmDialog
          open={showStatusConfirm}
          onOpenChange={(open) => !open && cancelStatusChange()}
          title="Confirm Status Change"
          description={getStatusTransitionMessage(booking.status, pendingStatus)}
          confirmText="Confirm"
          cancelText="Cancel"
          onConfirm={confirmStatusChange}
          variant={['cancelled', 'no_show'].includes(pendingStatus) ? 'destructive' : 'default'}
        />
      )}
    </>
  )
}
