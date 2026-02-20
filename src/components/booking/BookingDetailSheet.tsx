/**
 * BookingDetailSheet — Slide-over booking detail view
 *
 * Replaces BookingDetailModal (Dialog) with AppSheet (responsive slide-over).
 * 3-zone layout: Hero Band (sticky) → Body (scrollable) → Sticky Footer
 *
 * T4.0 spec: keep ALL logic unchanged — only layout restructured.
 *
 * WARNING: Do NOT render inside another AppSheet — nested sheets cause
 * z-index and scroll-lock conflicts. Pattern for Edit: close this sheet first,
 * then open edit sheet with 150ms delay.
 */

import type { Booking } from '@/types'
import { BookingStatus, PaymentStatus, PaymentMethod, PriceMode } from '@/types/booking'
import { PAYMENT_METHOD_LABELS } from '@/constants/booking-status'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AppSheet } from '@/components/ui/app-sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  Users,
  Mail,
  MapPin,
  Clock,
  Edit,
  Send,
  CreditCard,
  Star,
  Copy,
  Link2,
  Check,
  Package,
  Crown,
  FileText,
  ChevronDown,
  Loader2,
  Phone,
} from 'lucide-react'
import { formatCurrency, formatDate, formatBookingId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { sendBookingReminder } from '@/lib/email'
import { toast } from 'sonner'
import { formatTime, formatFullAddress } from '@/lib/booking-utils'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { getFrequencyLabel } from '@/types/service-package-v2'
import { formatDateRange, bookingDurationDays } from '@/lib/date-range-utils'

/** ms to show clipboard feedback before reverting the button label */
const CLIPBOARD_FEEDBACK_MS = 2000

/** Maximum booking duration that shows no warning (>90 days shows a notice in DateRangePicker) */
const GOOGLE_MAPS_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query='

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
}

// Same props interface as BookingDetailModal for backwards compatibility
interface BookingDetailSheetProps {
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

export function BookingDetailSheet({
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
}: BookingDetailSheetProps) {
  const [sendingReminder, setSendingReminder] = useState(false)
  const [review, setReview] = useState<Review | null>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [savingReview, setSavingReview] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showTeamMembers, setShowTeamMembers] = useState(false)
  const [teamMembers, setTeamMembers] = useState<
    Array<{ id: string; full_name: string; avatar_url: string | null }>
  >([])
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false)

  const resetReview = useCallback(() => {
    setReview(null)
    setRating(0)
  }, [])

  // Fetch team members when expanded
  const fetchTeamMembers = useCallback(async () => {
    if (!booking?.team_id) return
    if (!booking?.created_at) {
      console.warn('[BookingDetailSheet] Cannot fetch team members: booking.created_at is undefined', { bookingId: booking?.id })
      return
    }

    setLoadingTeamMembers(true)
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('profiles:staff_id(id, full_name, avatar_url)')
        .eq('team_id', booking.team_id)
        .lte('joined_at', booking.created_at)
        .or(`left_at.is.null,left_at.gt.${booking.created_at}`)

      if (error) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const members = (data || []).map((m: any) => m.profiles).filter(Boolean)
      setTeamMembers(members)
    } catch (error) {
      console.error('Error fetching team members:', error)
    } finally {
      setLoadingTeamMembers(false)
    }
  }, [booking?.team_id, booking?.created_at])

  const toggleTeamMembers = useCallback(() => {
    if (!showTeamMembers && teamMembers.length === 0) {
      fetchTeamMembers()
    }
    setShowTeamMembers((prev) => !prev)
  }, [showTeamMembers, teamMembers.length, fetchTeamMembers])

  // Reset team members state when booking changes
  useEffect(() => {
    setShowTeamMembers(false)
    setTeamMembers([])
  }, [booking?.id])

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
      toast.error('Failed to load review data')
    }
  }, [booking, resetReview, toast])

  useEffect(() => {
    if (booking?.id) {
      fetchReview()
    } else {
      resetReview()
    }
  }, [booking?.id, fetchReview, resetReview])

  const handleSaveReview = async () => {
    if (
      !booking?.id ||
      (!booking?.staff_id && !booking?.team_id) ||
      !booking?.customers?.id ||
      rating === 0
    ) {
      toast.error('Cannot save review', { description: 'Please select a rating and ensure booking has assigned staff or team' })
      return
    }

    setSavingReview(true)

    try {
      if (review) {
        const { error } = await supabase
          .from('reviews')
          .update({ rating })
          .eq('id', review.id)

        if (error) throw error

        toast.success('The review has been updated successfully')
      } else {
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

        if (booking.staff_id) {
          reviewData.staff_id = booking.staff_id
        } else if (booking.team_id) {
          reviewData.team_id = booking.team_id
        }

        const { error } = await supabase.from('reviews').insert(reviewData)

        if (error) throw error

        toast.success('The review has been saved successfully')
      }

      await fetchReview()
    } catch (error) {
      console.error('Error saving review:', error)
      toast.error('Failed to save review')
    } finally {
      setSavingReview(false)
    }
  }

  const handleCopyPaymentLink = useCallback(() => {
    if (!booking) return

    const paymentLink = `${window.location.origin}/payment/${booking.parent_booking_id || booking.id}`

    navigator.clipboard
      .writeText(paymentLink)
      .then(() => {
        setCopiedLink(true)
        toast.success('Payment link copied to clipboard')
        setTimeout(() => setCopiedLink(false), CLIPBOARD_FEEDBACK_MS)
      })
      .catch(() => {
        toast.error('Failed to copy link')
      })
  }, [booking, toast])

  const handleSendReminder = async () => {
    if (!booking || !booking.customers) return

    setSendingReminder(true)

    try {
      const result = await sendBookingReminder({ bookingId: booking.id })

      if (!result.success) {
        throw new Error(result.error || 'Failed to send reminder')
      }

      toast.success('Reminder Sent!', { description: `Email sent to ${booking.customers.email}` })
    } catch (error) {
      toast.error('Failed to Send Reminder', {
        description: error instanceof Error ? error.message : 'An error occurred while sending the email',
      })
    } finally {
      setSendingReminder(false)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const isCustomMode = booking?.price_mode === PriceMode.Custom
  const isOverrideMode = booking?.price_mode === PriceMode.Override
  // A status is "final" when it has no further valid transitions
  const isFinalStatus = booking ? getAvailableStatuses(booking.status).length === 0 : false
  const durationDays = booking ? bookingDurationDays(booking) : 0
  const isMultiDay = durationDays > 1

  // Service name and badge per PriceMode
  const serviceType = isCustomMode
    ? null
    : booking?.service_packages_v2?.service_type ?? booking?.service_packages?.service_type
  const serviceName = isCustomMode
    ? (booking?.job_name ?? 'Custom Job')
    : (booking?.service_packages_v2?.name ?? booking?.service_packages?.name ?? booking?.job_name ?? 'N/A')

  // ── Loading Skeleton ──────────────────────────────────────────────────────
  const renderSkeleton = () => (
    <div className="flex flex-col h-full">
      {/* Hero skeleton */}
      <div className="flex-shrink-0 border-b px-4 py-3 space-y-2">
        <Skeleton className="h-4 w-48" />
        <div className="flex justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      {/* Body skeleton */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
      {/* Footer skeleton */}
      <div className="flex-shrink-0 border-t px-4 py-3 flex justify-between">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  )

  return (
    <AppSheet
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={booking ? `Booking Details ${formatBookingId(booking.id)}` : 'Booking Details'}
      size="md"
    >
      {!booking ? (
        renderSkeleton()
      ) : (
        <div className="flex flex-col h-full">
          {/* ── Zone 1: Hero Band (sticky, no scroll) ─────────────────────── */}
          <div className="flex-shrink-0 border-b bg-background px-4 py-2 max-h-[30dvh] overflow-hidden space-y-2">
            {/* Row 1: Date range + time + multi-day badge */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{formatDateRange(booking.booking_date, booking.end_date)}</span>
              <span>•</span>
              <span>
                {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
              </span>
              {isMultiDay && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {durationDays} days
                </Badge>
              )}
            </div>

            {/* Row 2: Status badge + Price */}
            <div className="flex items-center justify-between gap-3">
              <div>{getStatusBadge(booking.status)}</div>
              <div className="text-right">
                <p className="font-bold text-lg text-tinedy-dark leading-tight">
                  {formatCurrency(Number(booking.total_price))}
                </p>
                {isOverrideMode && (
                  <span className="text-xs text-muted-foreground">(Override)</span>
                )}
                {isCustomMode && (
                  <span className="text-xs text-muted-foreground">(Custom Price)</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Zone 2: Body (scrollable) ─────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto pb-6 px-4 py-4 space-y-5">

            {/* Section 1: Customer */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-tinedy-dark">
                <User className="h-4 w-4 text-tinedy-blue" />
                Customer
              </div>
              <div className="flex items-start gap-3 pl-1">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarFallback className="bg-tinedy-blue/10 text-tinedy-blue text-xs">
                    {booking.customers?.full_name?.slice(0, 2).toUpperCase() ?? 'N/A'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-0.5 min-w-0">
                  <p className="font-medium text-tinedy-dark text-sm leading-tight">
                    {booking.customers?.full_name || 'N/A'}
                  </p>
                  {booking.customers?.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      {booking.customers.email}
                    </p>
                  )}
                  {booking.customers?.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      {booking.customers.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Section 2: Service */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-tinedy-dark">
                <Package className="h-4 w-4 text-tinedy-blue" />
                Service
              </div>
              <div className="pl-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {isCustomMode ? (
                    <Badge variant="secondary" className="text-xs">Custom Job</Badge>
                  ) : serviceType ? (
                    <Badge variant="outline" className="text-xs">{serviceType}</Badge>
                  ) : null}
                  <span className="text-sm font-medium text-tinedy-dark">{serviceName}</span>
                </div>
                {booking.area_sqm != null && booking.area_sqm > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Area: {booking.area_sqm} sqm
                  </p>
                )}
                {!isCustomMode && booking.frequency && (
                  <p className="text-xs text-muted-foreground">
                    Frequency:{' '}
                    {booking.is_recurring && booking.recurring_sequence && booking.recurring_total
                      ? `${booking.recurring_sequence}/${booking.recurring_total} (${getFrequencyLabel(booking.frequency)})`
                      : getFrequencyLabel(booking.frequency)}
                  </p>
                )}
              </div>
            </div>

            {/* Section 3: Assignment (conditional + own divider) */}
            {(booking.profiles || booking.teams) && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-tinedy-dark">
                    <Users className="h-4 w-4 text-tinedy-blue" />
                    Assignee
                  </div>
                  <div className="pl-1 space-y-2">
                    {booking.profiles && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarFallback className="text-[10px] bg-tinedy-blue/10 text-tinedy-blue">
                            {booking.profiles.full_name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{booking.profiles.full_name}</span>
                      </div>
                    )}
                    {booking.teams && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-tinedy-green flex-shrink-0" />
                          <span className="text-sm font-medium">{booking.teams.name}</span>
                          {booking.team_member_count != null && booking.team_member_count > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-secondary/80"
                              onClick={toggleTeamMembers}
                            >
                              {booking.team_member_count} members
                              <ChevronDown
                                className={`h-3 w-3 ml-0.5 transition-transform ${showTeamMembers ? 'rotate-180' : ''}`}
                              />
                            </Badge>
                          )}
                        </div>
                        {booking.teams.team_lead && (
                          <div className="flex items-center gap-1.5 pl-5">
                            <Crown className="h-3 w-3 text-amber-600 flex-shrink-0" />
                            <span className="text-xs text-muted-foreground">
                              Team Lead: {booking.teams.team_lead.full_name}
                            </span>
                          </div>
                        )}
                        {showTeamMembers && (
                          <div className="pl-5 border-l-2 border-tinedy-green/30 space-y-1.5">
                            <Label className="text-muted-foreground text-xs">
                              Members (at booking time)
                            </Label>
                            {loadingTeamMembers ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading...
                              </div>
                            ) : teamMembers.length > 0 ? (
                              <div className="space-y-1">
                                {teamMembers.map((member) => (
                                  <div key={member.id} className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={member.avatar_url || undefined} />
                                      <AvatarFallback className="text-[9px] bg-tinedy-green/20 text-tinedy-green">
                                        {member.full_name?.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs">{member.full_name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No members found</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="h-px bg-border" />

            {/* Section 4: Address */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-tinedy-dark">
                <MapPin className="h-4 w-4 text-tinedy-blue" />
                Address
              </div>
              <div className="pl-1 space-y-2">
                <p className="text-sm text-muted-foreground break-words">{formatFullAddress(booking)}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const addr = formatFullAddress(booking)
                    window.open(
                      `${GOOGLE_MAPS_SEARCH_URL}${encodeURIComponent(addr)}`,
                      '_blank',
                    )
                  }}
                >
                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  Google Maps
                </Button>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Section 5: Status + reminder */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Booking status change */}
                {!isFinalStatus && (
                  <Select
                    value={booking.status}
                    onValueChange={(value) => onStatusChange(booking.id, booking.status, value)}
                    disabled={actionLoading?.statusChange}
                  >
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue>
                        {actionLoading?.statusChange
                          ? 'Updating...'
                          : getStatusLabel(booking.status)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableStatuses(booking.status).map((status) => (
                        <SelectItem key={status} value={status}>
                          {getStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {/* Send Reminder */}
                <SimpleTooltip content={!booking.customers?.email ? 'No customer email' : 'Send reminder email'}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                    onClick={handleSendReminder}
                    disabled={sendingReminder || !booking.customers?.email}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {sendingReminder ? 'Sending...' : 'Send Reminder'}
                  </Button>
                </SimpleTooltip>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Section 6: Payment */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-tinedy-dark">
                <CreditCard className="h-4 w-4 text-tinedy-blue" />
                Payment
              </div>

              {/* ── Payment info card ── */}
              <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-2">
                {/* Row 1: Status badge + Amount */}
                <div className="flex items-center justify-between gap-3">
                  <div>{getPaymentStatusBadge(booking.payment_status)}</div>
                  <p className="font-bold text-green-600 text-base leading-tight">
                    {formatCurrency(Number(booking.total_price || 0))}
                  </p>
                </div>

                {/* Row 2: Method + date (inline) */}
                {(booking.payment_method || booking.payment_date) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {booking.payment_method && (
                      <span>{PAYMENT_METHOD_LABELS[booking.payment_method] ?? booking.payment_method}</span>
                    )}
                    {booking.payment_method && booking.payment_date && (
                      <span>•</span>
                    )}
                    {booking.payment_date && (
                      <span>Paid on {formatDate(booking.payment_date)}</span>
                    )}
                  </div>
                )}

                {/* Slip link */}
                {booking.payment_slip_url && (
                  <a
                    href={booking.payment_slip_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    View Payment Slip
                  </a>
                )}
              </div>

              {/* ── Payment actions ── */}
              {booking.payment_status !== PaymentStatus.Refunded && (
                <div className="flex flex-wrap gap-2">
                  {booking.payment_status === PaymentStatus.PendingVerification &&
                    booking.payment_slip_url &&
                    onVerifyPayment && (
                      <Button
                        onClick={() => onVerifyPayment(booking.id)}
                        disabled={actionLoading?.markAsPaid}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                      >
                        {actionLoading?.markAsPaid ? 'Verifying...' : 'Verify Payment'}
                      </Button>
                    )}
                  {booking.payment_status === PaymentStatus.Unpaid && (
                    <Select
                      onValueChange={(method) => onMarkAsPaid(booking.id, method)}
                      disabled={actionLoading?.markAsPaid}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue
                          placeholder={
                            actionLoading?.markAsPaid ? 'Processing...' : 'Record Payment'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PaymentMethod.Cash}>{PAYMENT_METHOD_LABELS[PaymentMethod.Cash]}</SelectItem>
                        <SelectItem value={PaymentMethod.CreditCard}>{PAYMENT_METHOD_LABELS[PaymentMethod.CreditCard]}</SelectItem>
                        <SelectItem value={PaymentMethod.Transfer}>{PAYMENT_METHOD_LABELS[PaymentMethod.Transfer]}</SelectItem>
                        <SelectItem value={PaymentMethod.PromptPay}>{PAYMENT_METHOD_LABELS[PaymentMethod.PromptPay]}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {booking.payment_status === PaymentStatus.Paid && onRequestRefund && (
                    <Button
                      onClick={() => onRequestRefund(booking.id)}
                      disabled={actionLoading?.refund}
                      size="sm"
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50 h-8 text-xs"
                    >
                      {actionLoading?.refund ? 'Processing...' : 'Request Refund'}
                    </Button>
                  )}
                  {booking.payment_status === PaymentStatus.RefundPending && (
                    <>
                      {onCompleteRefund && (
                        <Button
                          onClick={() => onCompleteRefund(booking.id)}
                          disabled={actionLoading?.refund}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 h-8 text-xs"
                        >
                          {actionLoading?.refund ? 'Processing...' : 'Refund Complete'}
                        </Button>
                      )}
                      {onCancelRefund && (
                        <Button
                          onClick={() => onCancelRefund(booking.id)}
                          disabled={actionLoading?.refund}
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                        >
                          Cancel Refund
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Payment link (unpaid only) ── */}
              {booking.payment_status === PaymentStatus.Unpaid && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Link2 className="h-3.5 w-3.5" />
                    Payment Link
                  </span>
                  <Button
                    onClick={handleCopyPaymentLink}
                    variant={copiedLink ? 'default' : 'outline'}
                    size="sm"
                    className={`h-7 text-xs ${copiedLink ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Section 7: Notes (moved after payment) */}
            {booking.notes && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-tinedy-dark">
                    <FileText className="h-4 w-4 text-tinedy-blue" />
                    Notes
                  </div>
                  <p className="pl-1 text-sm text-muted-foreground whitespace-pre-wrap">
                    {booking.notes}
                  </p>
                </div>
              </>
            )}

            {/* Section 8: Review (completed only) */}
            {(booking.staff_id || booking.team_id) &&
              booking.status === BookingStatus.Completed && (
                <>
                  <div className="h-px bg-border" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-tinedy-dark">
                      <Star className="h-4 w-4 text-yellow-500" />
                      Service Review
                    </div>
                    <div className="pl-1 space-y-2">
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
                          >
                            <Star
                              className={`h-5 w-5 ${
                                star <= (hoverRating || rating)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-tinedy-dark/40'
                              }`}
                            />
                          </button>
                        ))}
                        {rating > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">{rating}/5</span>
                        )}
                      </div>
                      {rating > 0 && (
                        <Button
                          onClick={handleSaveReview}
                          disabled={savingReview}
                          size="sm"
                          className="h-8 text-xs w-full"
                        >
                          {savingReview ? 'Saving...' : review ? 'Update Review' : 'Save Review'}
                        </Button>
                      )}
                      {review && (
                        <p className="text-xs text-muted-foreground">
                          Last updated: {formatDate(review.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
          </div>

          {/* ── Zone 3: Sticky Footer ─────────────────────────────────────── */}
          <div className="flex-shrink-0 border-t bg-background px-4 py-3 flex items-center justify-between gap-2">
            {/* Left: Delete + Archive */}
            <PermissionAwareDeleteButton
              resource="bookings"
              itemName={`Booking for ${booking.customers?.full_name || 'Customer'} on ${formatDate(booking.booking_date)}`}
              onDelete={() => {
                onDelete(booking.id)
                onClose()
              }}
              onCancel={
                onCancel
                  ? () => {
                      onCancel(booking.id)
                      onClose()
                    }
                  : undefined
              }
              variant="default"
              size="default"
              buttonVariant="outline"
              cancelText="Archive"
              className="h-9 text-xs"
            />

            {/* Right: Edit */}
            {onEdit && (
              <Button
                onClick={() => onEdit(booking)}
                disabled={isFinalStatus}
                title={
                  isFinalStatus
                    ? 'Cannot edit completed or cancelled bookings'
                    : undefined
                }
                size="sm"
                className="h-9 text-xs"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Edit →
              </Button>
            )}
          </div>
        </div>
      )}
    </AppSheet>
  )
}
