/**
 * BookingQuickForm — All-in-one booking form (same wizard state, single-page layout)
 *
 * Same useBookingWizard state as BookingWizard — just a different layout.
 * Suitable for experienced users who want all fields on one page.
 *
 * Features:
 * - EC-S3: Sticky submit button at bottom
 * - Header: "⚡ Quick Mode" + "[🧭 Guided]" toggle (with tooltip)
 * - RT7: validateFullState before submit
 * - Toast messages: Thai language
 *
 * Used for EDIT (always quick mode regardless of localStorage preference).
 */

import { toast } from 'sonner'
import { Zap, Map } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useQuery } from '@tanstack/react-query'
import { packageQueryOptions } from '@/lib/queries/package-queries'
import { useBookingWizard, validateFullState } from '@/hooks/use-booking-wizard'
import { useCreateBookingMutation } from '@/hooks/use-create-booking-mutation'
import type { WizardState } from '@/hooks/use-booking-wizard'
import { Step1Customer } from './BookingWizard/Step1Customer'
import { SmartPriceField, SmartPriceFieldSkeleton } from './BookingWizard/SmartPriceField'
import { DateRangePicker } from './BookingWizard/DateRangePicker'
import { Step3Assignment } from './BookingWizard/Step3Assignment'

interface BookingQuickFormProps {
  userId?: string
  /** Pre-seed state for Edit mode */
  initialState?: Partial<WizardState>
  /** Pre-seed customer (e.g. when opening from Customer Detail page) */
  initialCustomer?: import('@/hooks/use-customer-search').CustomerSearchResult
  onSuccess?: () => void
  onCancel?: () => void
  /** If true, hide mode toggle (edit always stays in quick mode) */
  hideToggle?: boolean
  onSwitchToWizard?: () => void
}

export function BookingQuickForm({
  userId,
  initialState,
  initialCustomer,
  onSuccess,
  onCancel,
  hideToggle,
  onSwitchToWizard,
}: BookingQuickFormProps) {
  const { state, dispatch } = useBookingWizard({ userId, initialState, initialCustomer })
  const mutation = useCreateBookingMutation()

  const { data: packagesV2 = [], isLoading: packagesLoading } = useQuery(
    packageQueryOptions.v2
  )

  // End-before-start warning
  const endBeforeStart =
    state.start_time && state.end_time && state.end_time < state.start_time

  async function handleSubmit() {
    // RT7: Full re-validate — dispatch errors so inline field errors appear (H2 fix)
    const errors = validateFullState(state)
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_VALIDATION_ERRORS', errors })
      toast.error('Please fill in all required fields')
      return
    }

    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true })
    try {
      await mutation.mutateAsync({
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
          state.price_mode === 'package' ? state.total_price : state.custom_price ?? 0,
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
        notes: state.notes || undefined,
      })

      toast.success('Booking created successfully')
      dispatch({ type: 'RESET' })
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create booking'
      toast.error(message)
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header: Quick Mode label + Guided toggle */}
      {!hideToggle && (
        <div className="flex items-center justify-between px-6 pb-3 border-b mb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-tinedy-yellow" />
            <span className="font-semibold text-sm">Quick Mode</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={onSwitchToWizard}
                >
                  <Map className="h-3 w-3" />
                  Guided
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Step-by-step guided mode for new users
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Scrollable form content */}
      <div className="flex-1 overflow-y-auto px-6 space-y-5 pb-20">
        {/* Step 1: Customer */}
        <Step1Customer state={state} dispatch={dispatch} />

        <Separator />

        {/* Step 2: Service & pricing */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Service & Pricing</p>
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

        {/* Date & Time */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Date & Time</p>
          <DateRangePicker state={state} dispatch={dispatch} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="qs-start" className="text-xs text-muted-foreground">
                Start Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="qs-start"
                type="time"
                value={state.start_time}
                onChange={(e) => dispatch({ type: 'SET_START_TIME', time: e.target.value })}
                className={state.validationErrors.start_time ? 'border-destructive' : undefined}
              />
              {state.validationErrors.start_time && (
                <p className="text-xs text-destructive">{state.validationErrors.start_time}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="qs-end" className="text-xs text-muted-foreground">
                End Time
              </Label>
              <Input
                id="qs-end"
                type="time"
                value={state.end_time}
                onChange={(e) =>
                  dispatch({ type: 'SET_END_TIME', time: e.target.value, manual: true })
                }
                className={endBeforeStart ? 'border-yellow-400' : undefined}
              />
              {endBeforeStart && (
                <p className="text-xs text-yellow-600">⚠️ End time is before start time</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Step 3: Assignment & Address */}
        <Step3Assignment state={state} dispatch={dispatch} />
      </div>

      {/* EC-S3: Sticky submit button */}
      <div className="sticky bottom-0 bg-background border-t pt-4 pb-6 flex gap-2 px-6">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={state.isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={state.isSubmitting}
          className="flex-1 bg-tinedy-blue hover:bg-tinedy-blue/90"
        >
          {state.isSubmitting ? 'Saving...' : 'Create Booking'}
        </Button>
      </div>
    </div>
  )
}
