/**
 * MobileBookingCard Component
 *
 * Booking card for Mobile Calendar view
 * - Touch-friendly UI
 * - Tap to change status
 * - Compact display
 */

import React, { useState, useRef, useEffect } from 'react'
import { Clock, User, Package, AlertTriangle, ChevronRight, Check, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Booking } from '@/types/booking'
import { STATUS_LABELS, STATUS_COLORS } from '@/constants/booking-status'
import { formatTime } from '@/lib/booking-utils'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface MobileBookingCardProps {
  booking: Booking
  onClick: (booking: Booking) => void
  hasConflict?: boolean
  onStatusChange?: (bookingId: string, newStatus: string) => Promise<void>
  availableStatuses?: string[]
  /** Hide payment status badge (for staff view) */
  hidePaymentStatus?: boolean
}

const MobileBookingCardComponent: React.FC<MobileBookingCardProps> = ({
  booking,
  onClick,
  hasConflict = false,
  onStatusChange,
  availableStatuses = [],
  hidePaymentStatus = false,
}) => {
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const isMountedRef = useRef(true)
  const { toast } = useToast()

  // Cleanup on unmount to prevent state updates after unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const statusColor = STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'
  const statusLabel = STATUS_LABELS[booking.status as keyof typeof STATUS_LABELS] || booking.status

  // Memoize callbacks to prevent re-creation on every render
  const handleCardClick = React.useCallback(() => {
    onClick(booking)
  }, [onClick, booking])

  const handleStatusChange = React.useCallback(async (newStatus: string) => {
    if (!onStatusChange) return

    setIsChangingStatus(true)
    try {
      await onStatusChange(booking.id, newStatus)
    } catch (error) {
      // Show error toast when status change fails
      toast({
        title: 'Failed to update status',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      })
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsChangingStatus(false)
      }
    }
  }, [onStatusChange, booking.id, toast])

  const handleDropdownClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200 active:scale-[0.98]',
        hasConflict && 'ring-2 ring-red-400 ring-offset-1'
      )}
    >
      <CardContent className="p-0">
        <div
          className="flex items-stretch cursor-pointer"
          onClick={handleCardClick}
        >
          {/* Status Color Bar */}
          <div className={cn('w-1.5 flex-shrink-0', statusColor.split(' ')[0])} />

          {/* Main Content */}
          <div className="flex-1 p-3">
            {/* Header: Time & Status */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold text-sm">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </span>
              </div>

              {/* Status Badge with Dropdown */}
              {onStatusChange && availableStatuses.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={handleDropdownClick}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-0"
                      disabled={isChangingStatus}
                    >
                      <Badge className={cn('text-[10px]', statusColor, isChangingStatus && 'opacity-70')}>
                        {isChangingStatus ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            {statusLabel}
                          </span>
                        ) : statusLabel}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[140px]">
                    {availableStatuses.map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStatusChange(status)
                        }}
                        className="flex items-center gap-2"
                      >
                        {status === booking.status && <Check className="h-3 w-3" />}
                        <Badge className={cn(
                          'text-[10px]',
                          STATUS_COLORS[status as keyof typeof STATUS_COLORS]
                        )}>
                          {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Badge className={cn('text-[10px]', statusColor)}>
                  {statusLabel}
                </Badge>
              )}
            </div>

            {/* Customer Info */}
            <div className="flex items-center gap-2 mb-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate">
                {booking.customers?.full_name || 'No Customer'}
              </span>
            </div>

            {/* Service Package */}
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {booking.service_packages?.name || 'No Service'}
              </span>
            </div>

            {/* Payment Status - Hidden for staff view */}
            {!hidePaymentStatus && booking.payment_status && (
              <div className="flex items-center gap-2 mt-1.5">
                {booking.payment_status === 'paid' ? (
                  <Badge className="text-[10px] font-medium bg-emerald-100 text-emerald-800 border-emerald-300">
                    Paid
                  </Badge>
                ) : booking.payment_status === 'pending_verification' ? (
                  <Badge className="text-[10px] font-medium bg-yellow-100 text-yellow-800 border-yellow-300">
                    Verifying
                  </Badge>
                ) : booking.payment_status === 'unpaid' ? (
                  <Badge className="text-[10px] font-medium bg-orange-100 text-orange-800 border-orange-300">
                    Unpaid
                  </Badge>
                ) : booking.payment_status === 'partial' ? (
                  <Badge className="text-[10px] font-medium bg-amber-100 text-amber-800 border-amber-300">
                    Partial
                  </Badge>
                ) : null}
              </div>
            )}

            {/* Conflict Warning */}
            {hasConflict && (
              <div className="flex items-center gap-1.5 mt-2 text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Booking Conflict</span>
              </div>
            )}
          </div>

          {/* Arrow Indicator */}
          <div className="flex items-center pr-2 text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const MobileBookingCard = React.memo(MobileBookingCardComponent)

MobileBookingCard.displayName = 'MobileBookingCard'
