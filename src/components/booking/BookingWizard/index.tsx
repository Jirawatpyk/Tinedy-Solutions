/**
 * BookingWizard — 4-step booking creation wizard
 *
 * Container component that:
 * - Renders StepIndicator + current step component
 * - Handles Back/Next/Submit navigation
 * - Calls validateFullState before final submit (RT7)
 * - Shows toast success/error messages
 * - A2: Wrapped in ErrorBoundary by BookingFormContainer
 * - FM1-C: Conflict detection at submit (Step 4). Recurring: primary date
 *   only, non-blocking warn. Unassigned bookings skip check (EC-C4).
 *
 * Props:
 * - userId: for localStorage mode preference (R5)
 * - onSuccess: callback after booking created
 * - onCancel: callback to close sheet
 */

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useBookingWizard, validateFullState } from '@/hooks/use-booking-wizard'
import type { WizardState } from '@/hooks/use-booking-wizard'
import type { CustomerSearchResult } from '@/hooks/use-customer-search'
import { useCreateBookingMutation } from '@/hooks/use-create-booking-mutation'
import type { BookingInsertData } from '@/hooks/use-create-booking-mutation'
import { useQuery } from '@tanstack/react-query'
import { staffQueryOptions } from '@/lib/queries/staff-queries'
import { teamQueryOptions } from '@/lib/queries/team-queries'
import { useConflictDetection } from '@/hooks/use-conflict-detection'
import type { BookingConflict } from '@/hooks/use-conflict-detection'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { PriceMode } from '@/types/booking'
import { StepIndicator } from './StepIndicator'
import { Step1Customer } from './Step1Customer'
import { Step2ServiceSchedule } from './Step2ServiceSchedule'
import { Step3Assignment } from './Step3Assignment'
import { Step4Confirm } from './Step4Confirm'

interface BookingWizardProps {
  userId?: string
  onSuccess?: () => void
  onCancel?: () => void
  onSwitchToQuick?: () => void
  /** Pre-seed customer — wizard starts at Step 2 */
  initialCustomer?: CustomerSearchResult
  /** Pre-seed wizard state (e.g. from AvailabilityCheckSheet after-select) */
  initialState?: Partial<WizardState>
}

export function BookingWizard({ userId, onSuccess, onCancel, onSwitchToQuick, initialCustomer, initialState }: BookingWizardProps) {
  const { state, dispatch } = useBookingWizard({ userId, initialCustomer, initialState })
  const mutation = useCreateBookingMutation()
  const { checkConflicts, clearConflicts } = useConflictDetection()

  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [pendingSubmitData, setPendingSubmitData] = useState<BookingInsertData | null>(null)

  // Ref for step heading focus (accessibility: focus moves to h2 on step change)
  const stepHeadingRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    stepHeadingRef.current
      ?.querySelector('h2')
      ?.focus()
  }, [state.step])

  // Fetch names for Step 4 display
  const { data: staffList = [] } = useQuery(staffQueryOptions.listSimple('staff'))
  const { data: teams = [] } = useQuery(teamQueryOptions.listSimple())

  const staffName = staffList.find((s) => s.id === state.staff_id)?.full_name
  const teamName = teams.find((t) => t.id === state.team_id)?.name

  // Executes the booking mutation after validation and conflict checks pass.
  async function doSubmit(bookingData: BookingInsertData) {
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true })
    try {
      await mutation.mutateAsync(bookingData)
      toast.success('Booking created successfully')
      dispatch({ type: 'RESET' })
      clearConflicts()
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create booking'
      toast.error(message)
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false })
    }
  }

  async function handleSubmit() {
    // H1: Lock button immediately — prevents double-submit during async conflict check
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true })

    // RT7: Full re-validate before submit
    const errors = validateFullState(state)
    if (Object.keys(errors).length > 0) {
      // M4 fix: jump to the first step that actually has errors
      const step1Keys = ['customer', 'new_customer_name', 'new_customer_phone']
      const step2Keys = ['booking_date', 'end_date', 'start_time', 'job_name', 'custom_price', 'package_v2_id', 'recurringDates', 'frequency']
      if (step1Keys.some((k) => errors[k])) {
        dispatch({ type: 'GOTO_STEP', step: 1 })
      } else if (step2Keys.some((k) => errors[k])) {
        dispatch({ type: 'GOTO_STEP', step: 2 })
      } else {
        dispatch({ type: 'GOTO_STEP', step: 3 })
      }
      toast.error('Please fill in all required fields')
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false })
      return
    }

    const bookingData: BookingInsertData = {
      customer_id: state.customer?.id,
      isNewCustomer: state.isNewCustomer,
      newCustomerData: state.isNewCustomer
        ? {
            full_name: state.newCustomerData.full_name,
            phone: state.newCustomerData.phone,
            email: state.newCustomerData.email || undefined,
          }
        : undefined,
      booking_date: state.booking_date,
      end_date: state.end_date,
      start_time: state.start_time,
      end_time: state.end_time || undefined,
      package_v2_id: state.package_v2_id,
      price_mode: state.price_mode,
      total_price:
        state.price_mode === PriceMode.Package ? state.total_price : state.custom_price ?? 0,
      custom_price: state.custom_price,
      price_override: state.price_mode === PriceMode.Override,
      job_name: state.job_name || null,
      area_sqm: state.area_sqm,
      frequency: state.frequency,
      staff_id: state.staff_id,
      team_id: state.team_id,
      address: state.address,
      city: state.city,
      state: state.state,
      zip_code: state.zip_code,
      notes: state.notes || undefined,
      recurring_dates:
        state.isRecurring && state.recurringDates.length > 0
          ? state.recurringDates
          : undefined,
      recurring_pattern: state.isRecurring ? state.recurringPattern : undefined,
    }

    // FM1-C: Conflict check at submit time. Recurring → primary date only (non-blocking warn).
    // EC-C4: Unassigned bookings skip this check inside useConflictDetection.
    let conflicts: BookingConflict[] = []
    try {
      conflicts = await checkConflicts({
        staffId: state.staff_id,
        teamId: state.team_id,
        bookingDate: state.booking_date,
        endDate: state.end_date,
        startTime: state.start_time,
        endTime: state.end_time,
      })
    } catch {
      // M3: Query failed — block submit rather than silently proceeding
      toast.error('Could not verify schedule availability. Please try again.')
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false })
      return
    }

    if (conflicts.length > 0) {
      // Exact duplicate: same booking_date + start_time → DB unique constraint blocks it.
      // Show toast instead of dialog — no override is possible.
      const isExact = conflicts.some(
        (c) =>
          c.booking.booking_date === state.booking_date &&
          c.booking.start_time?.slice(0, 5) === state.start_time
      )
      if (isExact) {
        toast.error('This staff already has a booking at this exact start time. Please choose a different time or staff.')
        dispatch({ type: 'SET_SUBMITTING', isSubmitting: false })
        return
      }
      setPendingSubmitData(bookingData)
      setShowConflictDialog(true)
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false })
      return
    }

    // No conflicts — doSubmit manages isSubmitting from here (also used by dialog confirm path)
    await doSubmit(bookingData)
  }

  function handleConflictDialogOpenChange(open: boolean) {
    if (!open) {
      setShowConflictDialog(false)
      setPendingSubmitData(null)
      clearConflicts()
    }
  }

  const isLastStep = state.step === 4

  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <StepIndicator currentStep={state.step} />

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 pb-4" ref={stepHeadingRef}>
        {state.step === 1 && <Step1Customer state={state} dispatch={dispatch} />}
        {state.step === 2 && <Step2ServiceSchedule state={state} dispatch={dispatch} />}
        {state.step === 3 && <Step3Assignment state={state} dispatch={dispatch} />}
        {state.step === 4 && (
          <Step4Confirm
            state={state}
            dispatch={dispatch}
            staffName={staffName}
            teamName={teamName}
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-3 px-6 pt-4 pb-6 border-t">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (state.step === 1) {
                onCancel?.()
              } else {
                dispatch({ type: 'PREV_STEP' })
              }
            }}
            disabled={state.isSubmitting}
          >
            {state.step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {onSwitchToQuick && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSwitchToQuick}
                    disabled={state.isSubmitting}
                    className="text-muted-foreground"
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Quick
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Switch to Quick Mode</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {isLastStep ? (
          <Button
            onClick={handleSubmit}
            disabled={state.isSubmitting}
            className="bg-tinedy-blue hover:bg-tinedy-blue/90"
          >
            {state.isSubmitting ? 'Saving...' : 'Create Booking'}
          </Button>
        ) : (
          <Button
            onClick={() => dispatch({ type: 'NEXT_STEP' })}
            className="bg-tinedy-blue hover:bg-tinedy-blue/90"
          >
            Next
          </Button>
        )}
      </div>

      {/* FM1-C: Schedule conflict warning — non-blocking overlap only */}
      <ConfirmDialog
        open={showConflictDialog}
        onOpenChange={handleConflictDialogOpenChange}
        title="Schedule Conflict Detected"
        description="A schedule conflict was detected for the selected staff or team."
        warningMessage={
          state.isRecurring
            ? 'Note: Only the first occurrence date was checked — other dates may also have conflicts.'
            : undefined
        }
        variant="warning"
        confirmLabel="Create Anyway"
        cancelLabel="Cancel"
        onConfirm={async () => {
          // M6 fix: clear dialog state BEFORE doSubmit to avoid setState-on-unmount
          // (onSuccess may close the sheet and unmount this component)
          const data = pendingSubmitData
          setShowConflictDialog(false)
          setPendingSubmitData(null)
          if (data) {
            await doSubmit(data)
          }
        }}
      />
    </div>
  )
}
