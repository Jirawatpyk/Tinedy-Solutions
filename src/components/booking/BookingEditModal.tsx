/**
 * BookingEditModal — Edit existing booking inside AppSheet
 *
 * V2 update: wraps edit form with AppSheet + adds end_date, job_name,
 * custom_price, price_override fields. Uses SmartPriceField and DateRangePicker.
 * Staff/Teams/Packages fetched internally via TanStack Query (no prop-drilling).
 *
 * Edit always uses Quick Mode layout (spec T3.7).
 * Conflict detection preserved from original.
 *
 * FM1-E: initialState fallbacks ensure all V2 fields have explicit defaults.
 */

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { packageQueryOptions } from '@/lib/queries/package-queries'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/error-utils'
import { AppSheet } from '@/components/ui/app-sheet'
import { DashboardErrorBoundary } from '@/components/error/DashboardErrorBoundary'
import { useBookingWizard, validateFullState } from '@/hooks/use-booking-wizard'
import { useConflictDetection } from '@/hooks/use-conflict-detection'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { SmartPriceField, SmartPriceFieldSkeleton } from './BookingWizard/SmartPriceField'
import { DateRangePicker } from './BookingWizard/DateRangePicker'
import { Step3Assignment } from './BookingWizard/Step3Assignment'
import { PriceMode, BookingStatus } from '@/types/booking'
import type { Booking } from '@/types/booking'

interface BookingEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: Booking | null
  onSuccess?: () => void
}

// Build initialState from existing booking (FM1-E fix)
function buildInitialState(booking: Booking) {
  const priceMode: typeof PriceMode[keyof typeof PriceMode] = booking.price_override
    ? PriceMode.Override
    : booking.job_name
    ? PriceMode.Custom
    : PriceMode.Package

  const assignmentType: 'staff' | 'team' | 'none' = booking.staff_id
    ? 'staff'
    : booking.team_id
    ? 'team'
    : 'none'

  return {
    booking_date: booking.booking_date ?? '',
    end_date: booking.end_date ?? null,
    isMultiDay: !!booking.end_date,
    start_time: booking.start_time?.split(':').slice(0, 2).join(':') ?? '',
    end_time: booking.end_time?.split(':').slice(0, 2).join(':') ?? '',
    endTimeManuallySet: true, // always treat edit end_time as manual (spec FM1-E)
    package_v2_id: booking.package_v2_id ?? null,
    price_mode: priceMode,
    total_price: booking.total_price ?? 0,
    custom_price: booking.custom_price ?? null,
    price_override: booking.price_override ?? false,
    job_name: booking.job_name ?? '',
    area_sqm: booking.area_sqm ?? null,
    frequency: (booking.frequency ?? null) as 1 | 2 | 4 | 8 | null,
    assignmentType,
    staff_id: booking.staff_id ?? null,
    team_id: booking.team_id ?? null,
    address: booking.address ?? '',
    city: booking.city ?? '',
    state: booking.state ?? '',
    zip_code: booking.zip_code ?? '',
    notes: booking.notes ?? '',
    useCustomerAddress: false,
  }
}

export function BookingEditModal({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: BookingEditModalProps) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<string>(BookingStatus.Pending)
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<Record<string, unknown> | null>(null)

  const { checkConflicts, clearConflicts } = useConflictDetection()

  // Seed wizard with booking data (FM1-E fallbacks)
  const initialState = booking ? buildInitialState(booking) : undefined
  const { state, dispatch } = useBookingWizard({ initialState })

  // Sync status from booking when it changes
  useEffect(() => {
    if (booking?.status) {
      setStatus(booking.status)
    }
  }, [booking?.status])

  const { data: packagesV2 = [], isLoading: packagesLoading } = useQuery(packageQueryOptions.v2)

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updateData: Record<string, unknown>) => {
      if (!booking?.id) throw new Error('ไม่พบ ID การจอง')
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id)

      if (error) throw new Error(`ไม่สามารถแก้ไขการจองได้: ${getErrorMessage(error)}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
      toast.success('แก้ไขการจองสำเร็จ')
      onOpenChange(false)
      clearConflicts()
      onSuccess?.()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'ไม่สามารถแก้ไขการจองได้')
    },
  })

  async function handleSubmit() {
    const errors = validateFullState(state)
    if (Object.keys(errors).length > 0) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    const updateData: Record<string, unknown> = {
      booking_date: state.booking_date,
      end_date: state.end_date,
      start_time: state.start_time,
      end_time: state.end_time || null,
      package_v2_id: state.package_v2_id,
      price_mode: state.price_mode,
      total_price: state.price_mode === 'package' ? state.total_price : state.custom_price ?? 0,
      custom_price: state.custom_price,
      price_override: state.price_mode === 'override',
      job_name: state.job_name || null,
      area_sqm: state.area_sqm,
      frequency: state.frequency,
      staff_id: state.staff_id,
      team_id: state.team_id,
      address: state.address,
      city: state.city,
      state: state.state,
      zip_code: state.zip_code,
      notes: state.notes || null,
      status,
    }

    // Check conflicts (excludes self)
    const conflicts = await checkConflicts({
      staffId: state.staff_id,
      teamId: state.team_id,
      bookingDate: state.booking_date,
      startTime: state.start_time,
      endTime: state.end_time,
      excludeBookingId: booking?.id,
    })

    if (conflicts.length > 0) {
      setPendingUpdate(updateData)
      setShowConflictDialog(true)
      return
    }

    updateMutation.mutate(updateData)
  }

  function handleClose() {
    onOpenChange(false)
    clearConflicts()
    setPendingUpdate(null)
  }

  const endBeforeStart =
    !state.isMultiDay && state.start_time && state.end_time && state.end_time < state.start_time

  return (
    <AppSheet
      open={open}
      onOpenChange={handleClose}
      title="แก้ไขการจอง"
      size="md"
    >
      <DashboardErrorBoundary
        fallback={
          <div className="flex items-center justify-center h-full p-6 text-center">
            <p className="text-sm text-muted-foreground">เกิดข้อผิดพลาด กรุณาปิดและลองใหม่</p>
          </div>
        }
      >
        <div className="flex flex-col h-full">
          {/* Scrollable form */}
          <div className="flex-1 overflow-y-auto space-y-5 px-4 py-4 pb-20">
            {/* Pricing */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">บริการและราคา</p>
              {packagesLoading ? (
                <SmartPriceFieldSkeleton />
              ) : (
                <SmartPriceField
                  state={state}
                  dispatch={dispatch}
                  packages={packagesV2}
                  packagesLoading={packagesLoading}
                />
              )}
            </div>

            <Separator />

            {/* Date & Time */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">วันและเวลา</p>
              <DateRangePicker state={state} dispatch={dispatch} />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-start" className="text-xs text-muted-foreground">
                    เวลาเริ่มต้น <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-start"
                    type="time"
                    value={state.start_time}
                    onChange={(e) =>
                      dispatch({ type: 'SET_START_TIME', time: e.target.value })
                    }
                    className={state.validationErrors.start_time ? 'border-destructive' : undefined}
                  />
                  {state.validationErrors.start_time && (
                    <p className="text-xs text-destructive">{state.validationErrors.start_time}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-end" className="text-xs text-muted-foreground">
                    เวลาสิ้นสุด
                  </Label>
                  <Input
                    id="edit-end"
                    type="time"
                    value={state.end_time}
                    onChange={(e) =>
                      dispatch({ type: 'SET_END_TIME', time: e.target.value, manual: true })
                    }
                    className={endBeforeStart ? 'border-yellow-400' : undefined}
                  />
                  {endBeforeStart && (
                    <p className="text-xs text-yellow-600">⚠️ เวลาสิ้นสุดน้อยกว่าเวลาเริ่มต้น</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">สถานะ</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BookingStatus.Pending}>รอดำเนินการ</SelectItem>
                  <SelectItem value={BookingStatus.Confirmed}>ยืนยันแล้ว</SelectItem>
                  <SelectItem value={BookingStatus.InProgress}>กำลังดำเนินการ</SelectItem>
                  <SelectItem value={BookingStatus.Completed}>เสร็จสิ้น</SelectItem>
                  <SelectItem value={BookingStatus.Cancelled}>ยกเลิก</SelectItem>
                  <SelectItem value={BookingStatus.NoShow}>ไม่มาตามนัด</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Assignment & Address */}
            <Step3Assignment state={state} dispatch={dispatch} />
          </div>

          {/* EC-S3: Sticky footer */}
          <div className="sticky bottom-0 bg-background border-t px-4 pt-4 pb-4 flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={updateMutation.isPending}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateMutation.isPending}
              className="flex-1 bg-tinedy-blue hover:bg-tinedy-blue/90"
            >
              {updateMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </Button>
          </div>
        </div>

        {/* Conflict dialog */}
        <ConfirmDialog
          open={showConflictDialog}
          onOpenChange={setShowConflictDialog}
          title="พบตารางงานที่ขัดแย้ง"
          description="การจองนี้ขัดแย้งกับงานที่มีอยู่ ต้องการบันทึกต่อหรือไม่?"
          confirmLabel="บันทึกต่อ"
          cancelLabel="ยกเลิก"
          onConfirm={() => {
            if (pendingUpdate) {
              updateMutation.mutate(pendingUpdate)
            }
            setShowConflictDialog(false)
            setPendingUpdate(null)
          }}
        />
      </DashboardErrorBoundary>
    </AppSheet>
  )
}
