/**
 * Step4Confirm — Read-only summary + RT7 re-validate before submit
 *
 * Shows all collected fields in sections.
 * Each section has an [แก้ไข] link that uses GOTO_STEP (no validation).
 * Submit button calls validateFullState before mutation.
 */

import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { User, Package, Calendar, MapPin, StickyNote, Pencil, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { formatDateRange } from '@/lib/date-range-utils'
import { PriceMode } from '@/types/booking'
import { getRecurringDateCount, type WizardState, type WizardAction } from '@/hooks/use-booking-wizard'

interface Step4ConfirmProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  staffName?: string
  teamName?: string
}

function SectionHeader({
  icon,
  title,
  onEdit,
  step,
  dispatch,
}: {
  icon: React.ReactNode
  title: string
  onEdit?: boolean
  step: 1 | 2 | 3 | 4
  dispatch: React.Dispatch<WizardAction>
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      {onEdit && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 text-tinedy-blue"
          onClick={() => dispatch({ type: 'GOTO_STEP', step })}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      )}
    </div>
  )
}

export function Step4Confirm({ state, dispatch, staffName, teamName }: Step4ConfirmProps) {
  const {
    customer,
    isNewCustomer,
    newCustomerData,
    price_mode,
    selectedPackage,
    job_name,
    total_price,
    custom_price,
    booking_date,
    end_date,
    start_time,
    end_time,
    assignmentType,
    staff_id,
    team_id,
    address,
    city,
    state: stateField,
    zip_code,
    notes,
    area_sqm,
    frequency,
    isRecurring,
    recurringDates,
    recurringPattern,
  } = state

  const rawPrice =
    price_mode === PriceMode.Package
      ? total_price
      : custom_price ?? 0

  // For recurring: split price per booking (package price is total for all sessions)
  const recurringCount = getRecurringDateCount(state)
  const displayPrice = recurringCount > 1
    ? Math.round(rawPrice / recurringCount)
    : rawPrice

  const addressParts = [address, city, stateField, zip_code].filter(Boolean).join(', ')
  const dateDisplay = formatDateRange(booking_date, end_date)
  const timeDisplay = [start_time, end_time].filter(Boolean).join(' – ')

  const assignmentDisplay =
    assignmentType === 'none'
      ? 'Unassigned'
      : assignmentType === 'staff'
      ? staffName ?? staff_id ?? '-'
      : teamName ?? team_id ?? '-'

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold" tabIndex={-1}>Step 4: Confirm Booking</h2>

      {/* Customer section */}
      <div className="space-y-2">
        <SectionHeader
          icon={<User className="h-3.5 w-3.5" />}
          title="Customer"
          onEdit
          step={1}
          dispatch={dispatch}
        />
        <div className="pl-5 text-sm">
          {isNewCustomer ? (
            <div>
              <span className="font-medium">{newCustomerData.full_name} <Badge variant="secondary" className="text-xs ml-1">New</Badge></span>
              <p className="text-muted-foreground">{newCustomerData.phone}</p>
              {newCustomerData.email && (
                <p className="text-muted-foreground">{newCustomerData.email}</p>
              )}
            </div>
          ) : customer ? (
            <div>
              <p className="font-medium">{customer.full_name}</p>
              <p className="text-muted-foreground">{customer.phone}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">Not selected</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Service & Schedule section */}
      <div className="space-y-2">
        <SectionHeader
          icon={<Package className="h-3.5 w-3.5" />}
          title="Service"
          onEdit
          step={2}
          dispatch={dispatch}
        />
        <div className="pl-5 space-y-1 text-sm">
          {price_mode === PriceMode.Custom ? (
            <span className="font-medium">{job_name || '-'} <Badge variant="outline" className="text-xs ml-1">Custom</Badge></span>
          ) : selectedPackage ? (
            <p className="font-medium">{selectedPackage.name}</p>
          ) : (
            <p className="text-muted-foreground">Not selected</p>
          )}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-tinedy-blue">{formatCurrency(displayPrice)}</span>
            {recurringCount > 1 && (
              <span className="text-xs text-muted-foreground">× {recurringCount} = {formatCurrency(rawPrice)}</span>
            )}
            {price_mode === PriceMode.Override && (
              <Badge variant="secondary" className="text-xs">Override</Badge>
            )}
          </div>
          {area_sqm && <p className="text-xs text-muted-foreground">{area_sqm} sqm</p>}
          {frequency && <p className="text-xs text-muted-foreground">{frequency} time(s)</p>}
        </div>
      </div>

      <Separator />

      {/* Date & Time section */}
      <div className="space-y-2">
        <SectionHeader
          icon={<Calendar className="h-3.5 w-3.5" />}
          title="Date & Time"
          onEdit
          step={2}
          dispatch={dispatch}
        />
        <div className="pl-5 text-sm">
          {/* Manual recurring: show only the manually picked dates as primary */}
          {isRecurring && recurringPattern === 'custom' && recurringDates.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Repeat className="h-3 w-3" />
                <span>Recurring · {recurringDates.length} dates (manual)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recurringDates.map((date) => (
                  <Badge key={date} variant="secondary" className="text-xs font-normal">
                    {format(new Date(`${date}T00:00:00`), 'd MMM yyyy', { locale: enUS })}
                  </Badge>
                ))}
              </div>
              {timeDisplay && <p className="text-muted-foreground mt-1">{timeDisplay}</p>}
            </div>
          ) : (
            <>
              <p className="font-medium">{dateDisplay || '-'}</p>
              {timeDisplay && <p className="text-muted-foreground">{timeDisplay}</p>}

              {/* Auto monthly recurring dates */}
              {isRecurring && recurringDates.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Repeat className="h-3 w-3" />
                    <span>
                      + {recurringDates.length} recurring dates (monthly)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recurringDates.map((date) => (
                      <Badge key={date} variant="secondary" className="text-xs font-normal">
                        {format(new Date(`${date}T00:00:00`), 'd MMM yyyy', { locale: enUS })}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Assignment & Address section */}
      <div className="space-y-2">
        <SectionHeader
          icon={<MapPin className="h-3.5 w-3.5" />}
          title="Assignment"
          onEdit
          step={3}
          dispatch={dispatch}
        />
        <div className="pl-5 space-y-1 text-sm">
          <p className="font-medium">{assignmentDisplay}</p>
          <p className="text-muted-foreground">{addressParts || '-'}</p>
        </div>
      </div>

      {/* Notes section (only if not empty) */}
      {notes && (
        <>
          <Separator />
          <div className="space-y-2">
            <SectionHeader
              icon={<StickyNote className="h-3.5 w-3.5" />}
              title="Notes"
              onEdit
              step={3}
              dispatch={dispatch}
            />
            <p className="pl-5 text-sm text-muted-foreground">{notes}</p>
          </div>
        </>
      )}
    </div>
  )
}
