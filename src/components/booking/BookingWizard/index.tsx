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
import { useCreateBookingMutation } from '@/hooks/use-create-booking-mutation'
import type { BookingInsertData } from '@/hooks/use-create-booking-mutation'
import { useQuery } from '@tanstack/react-query'
import { staffQueryOptions } from '@/lib/queries/staff-queries'
import { teamQueryOptions } from '@/lib/queries/team-queries'
import { useConflictDetection } from '@/hooks/use-conflict-detection'
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
}

export function BookingWizard({ userId, onSuccess, onCancel, onSwitchToQuick }: BookingWizardProps) {
  const { state, dispatch } = useBookingWizard({ userId })
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
    // RT7: Full re-validate before submit
    const errors = validateFullState(state)
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'GOTO_STEP', step: 1 })
      toast.error('Please fill in all required fields')
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
    const conflicts = await checkConflicts({
      staffId: state.staff_id,
      teamId: state.team_id,
      bookingDate: state.booking_date,
      endDate: state.end_date,
      startTime: state.start_time,
      endTime: state.end_time,
    })

    if (conflicts.length > 0) {
      setPendingSubmitData(bookingData)
      setShowConflictDialog(true)
      return
    }

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

      {/* FM1-C: Schedule conflict warning — non-blocking, user can proceed */}
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
          if (pendingSubmitData) {
            await doSubmit(pendingSubmitData)
          }
          setShowConflictDialog(false)
          setPendingSubmitData(null)
        }}
      />
    </div>
  )
}
