/**
 * AvailabilityCheckSheet — Quick Availability Check redesigned as AppSheet
 *
 * Replaces QuickAvailabilityCheck (Dialog) with a single AppSheet size="lg".
 * 2-step flow in one sheet — no nested Dialog/Sheet conflicts:
 *   Step 1 (input): Service, date, time, assignment type, multi-day option
 *   Step 2 (results): StaffAvailabilityModal rendered inline
 *
 * After staff/team selection:
 *   - Navigates to /admin/bookings
 *   - Passes Partial<WizardState> as location.state.initialState
 *   - useBookingsPage handles it with SET_CREATE_INITIAL_STATE
 *
 * Multi-day support:
 *   - Checkbox to enable multi-day mode
 *   - Shows end_date field when enabled
 *   - Passes end_date + isMultiDay to WizardState
 *
 * Out of Scope:
 *   - useStaffAvailabilityCheck, useMultiDateAvailabilityCheck (not touched)
 *   - Card components (not touched)
 *   - Custom price in QAC (user sets this in BookingForm)
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck, ChevronLeft, Plus, X } from 'lucide-react'
import { AppSheet } from '@/components/ui/app-sheet'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StaffAvailabilityModal } from './staff-availability-modal'
import { useServicePackages, type UnifiedServicePackage } from '@/hooks/use-service-packages'
import { calculatePricing } from '@/lib/pricing-utils'
import { format, addMonths, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import type { WizardState } from '@/hooks/use-booking-wizard'
import type { RecurringPattern } from '@/types/recurring-booking'
import { RecurringPattern as Pattern } from '@/types/recurring-booking'
import type { BookingFrequency } from '@/types/service-package-v2'

export function AvailabilityCheckSheet() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'input' | 'results'>('input')

  // --- Form state ---
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState('')
  const [isMultiDay, setIsMultiDay] = useState(false)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('11:00')
  const [servicePackageId, setServicePackageId] = useState('')
  const [assignmentType, setAssignmentType] = useState<'individual' | 'team'>('individual')
  const [areaSqm, setAreaSqm] = useState<number | null>(null)
  const [frequency, setFrequency] = useState<number>(1)
  const [recurringDates, setRecurringDates] = useState<string[]>([])
  const [recurringPattern, setRecurringPattern] = useState<RecurringPattern>(Pattern.AutoMonthly)
  const [newDateInput, setNewDateInput] = useState('')

  const { packages } = useServicePackages()
  const selectedService = packages.find((s: UnifiedServicePackage) => s.id === servicePackageId)

  // --- Auto-generate monthly recurring dates from start date (matching Wizard Step2) ---
  useEffect(() => {
    if (frequency <= 1 || recurringPattern !== Pattern.AutoMonthly || !date) return
    const base = parseISO(date)
    // ALL frequency dates: [date, date+1m, date+2m, ...] — index 0 = booking_date
    const allDates = Array.from({ length: frequency }, (_, i) =>
      format(addMonths(base, i), 'yyyy-MM-dd')
    )
    setRecurringDates(allDates)
  }, [recurringPattern, date, frequency])

  // --- Auto-calculate end time from service duration ---
  useEffect(() => {
    if (!startTime) return

    const calcEndTime = (start: string, durationMinutes: number): string => {
      const [hours, minutes] = start.split(':').map(Number)
      const total = hours * 60 + minutes + durationMinutes
      const h = Math.floor(total / 60) % 24
      const m = total % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    if (selectedService?.duration_minutes) {
      setEndTime(calcEndTime(startTime, selectedService.duration_minutes))
      return
    }

    if (selectedService?.pricing_model === 'tiered' && areaSqm && areaSqm > 0) {
      calculatePricing(selectedService.id, areaSqm, frequency)
        .then((result) => {
          if (result.found && result.estimated_hours) {
            setEndTime(calcEndTime(startTime, result.estimated_hours * 60))
          }
        })
        .catch(() => { logger.debug('calculatePricing failed — end time not auto-calculated', {}, { context: 'AvailabilityCheckSheet' }) })
    }
  }, [selectedService, startTime, areaSqm, frequency])

  // --- Custom date list management (matching Wizard Step2 custom mode) ---
  function handleAddDate() {
    if (!newDateInput || recurringDates.includes(newDateInput)) return
    if (recurringDates.length >= frequency) return
    const allDates = [...recurringDates, newDateInput].sort()
    setRecurringDates(allDates)
    setDate(allDates[0]) // sync start date to earliest custom date
    setNewDateInput('')
  }

  function handleRemoveDate(dateStr: string) {
    const remaining = recurringDates.filter((d) => d !== dateStr)
    setRecurringDates(remaining)
    if (remaining.length > 0) setDate(remaining[0])
  }

  // --- Reset form ---
  const resetForm = useCallback(() => {
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setEndDate('')
    setIsMultiDay(false)
    setStartTime('09:00')
    setEndTime('11:00')
    setServicePackageId('')
    setAssignmentType('individual')
    setAreaSqm(null)
    setFrequency(1)
    setRecurringDates([])
    setRecurringPattern(Pattern.AutoMonthly)
    setNewDateInput('')
    setStep('input')
  }, [])

  // Reset frequency to 1 when package changes — prevents stale freq from previous package
  // causing wrong isRecurring state, wrong end-time calc, and wrong freq in wizard seed
  useEffect(() => {
    setFrequency(1)
    setRecurringDates([])
  }, [servicePackageId])

  function handleOpenChange(open: boolean) {
    if (!open) resetForm()
    setIsOpen(open)
  }

  // --- Step 1: Validate and proceed to results ---
  function handleCheckAvailability() {
    if (!servicePackageId || !startTime || !endTime) return
    const isRecurring = frequency > 1
    if (isRecurring && recurringDates.length === 0) {
      toast.error('Please select at least one date for recurring booking')
      return
    }
    if (!isRecurring && !date) return
    if (isMultiDay && endDate && endDate < date) {
      toast.error('End date must be on or after start date')
      return
    }
    setStep('results')
  }

  // --- Build WizardState partial for navigation ---
  function buildInitialState(staffId: string | null, teamId: string | null): Partial<WizardState> {
    const isRecurring = frequency > 1
    return {
      // booking_date = first occurrence (index 0 for custom, `date` for auto-monthly)
      booking_date: isRecurring ? (recurringDates[0] ?? date) : date,
      end_date: isMultiDay && !isRecurring ? (endDate || null) : null,
      isMultiDay: isMultiDay && !isRecurring,
      start_time: startTime,
      end_time: endTime,
      package_v2_id: servicePackageId,
      staff_id: staffId,
      team_id: teamId,
      assignmentType: staffId ? 'staff' : teamId ? 'team' : 'none',
      area_sqm: selectedService?.pricing_model === 'tiered' ? areaSqm : null,
      frequency: selectedService?.pricing_model === 'tiered' ? (frequency as BookingFrequency) : null,
      isRecurring,
      // Wizard expects future dates only (slice off index 0 = booking_date)
      recurringDates: isRecurring ? recurringDates.slice(1) : [],
      recurringPattern: isRecurring ? recurringPattern : Pattern.AutoMonthly,
    }
  }

  function handleSelectStaff(staffId: string) {
    toast('Staff Selected', { description: 'Redirecting to create booking...' })
    navigate('/admin/bookings', {
      state: {
        createBooking: true,
        initialState: buildInitialState(staffId, null),
      },
    })
    setIsOpen(false)
    resetForm()
  }

  function handleSelectTeam(teamId: string) {
    toast('Team Selected', { description: 'Redirecting to create booking...' })
    navigate('/admin/bookings', {
      state: {
        createBooking: true,
        initialState: buildInitialState(null, teamId),
      },
    })
    setIsOpen(false)
    resetForm()
  }

  const isRecurring = frequency > 1
  const isCheckDisabled =
    !servicePackageId ||
    (!isRecurring && !date) ||
    (isRecurring && recurringDates.length === 0) ||
    !startTime ||
    !endTime ||
    (selectedService?.pricing_model === 'tiered' && (!areaSqm || !frequency))

  return (
    <>
      {/* Trigger: icon on mobile, full button on tablet+ */}
      <SimpleTooltip content="Check Availability">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="md:hidden"
        >
          <CalendarCheck className="h-4 w-4" />
        </Button>
      </SimpleTooltip>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="hidden md:flex gap-2"
      >
        <CalendarCheck className="h-4 w-4" />
        <span>Check Availability</span>
      </Button>

      <AppSheet
        open={isOpen}
        onOpenChange={handleOpenChange}
        title={step === 'input' ? 'Check Availability' : 'Select Staff / Team'}
        size="lg"
      >
        {step === 'input' ? (
          /* ── Step 1: Input Form ── */
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">

              {/* Service Package */}
              <div className="space-y-2">
                <Label htmlFor="qac-service">Service Package</Label>
                <Select value={servicePackageId} onValueChange={setServicePackageId}>
                  <SelectTrigger id="qac-service">
                    <SelectValue placeholder="Select a service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((service: UnifiedServicePackage) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tiered Pricing Inputs */}
              {selectedService?.pricing_model === 'tiered' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="qac-area">Area (sqm) *</Label>
                    <Input
                      id="qac-area"
                      type="number"
                      min="1"
                      value={areaSqm || ''}
                      onChange={(e) => setAreaSqm(e.target.value ? Number(e.target.value) : null)}
                      placeholder="Enter area"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qac-frequency">Frequency *</Label>
                    <Select
                      value={String(frequency)}
                      onValueChange={(v) => setFrequency(Number(v))}
                    >
                      <SelectTrigger id="qac-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(selectedService?.pricing_model === 'tiered' && selectedService.tiers && selectedService.tiers.length > 0
                          ? [...new Set(
                              selectedService.tiers.flatMap((t) =>
                                t.frequency_prices && t.frequency_prices.length > 0
                                  ? t.frequency_prices.map((fp: { times: number; price: number }) => fp.times)
                                  : [1, t.price_2_times != null ? 2 : null, t.price_4_times != null ? 4 : null, t.price_8_times != null ? 8 : null].filter((x): x is number => x !== null)
                              )
                            )].sort((a, b) => a - b)
                          : [1, 2, 4, 8]
                        ).map((f) => (
                          <SelectItem key={f} value={String(f)}>
                            {f} {f === 1 ? 'time' : 'times'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Date input — hidden only in custom recurring (user picks all dates from list) */}
              {!(isRecurring && recurringPattern === Pattern.Custom) && (
                isMultiDay && !isRecurring ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qac-date-start">Start Date *</Label>
                      <Input
                        id="qac-date-start"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qac-date-end">End Date</Label>
                      <Input
                        id="qac-date-end"
                        type="date"
                        value={endDate}
                        min={date}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="qac-date">{isRecurring ? 'Start Date *' : 'Date *'}</Label>
                    <Input
                      id="qac-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                )
              )}

              {/* Multi-day toggle — only in non-recurring mode */}
              {!isRecurring && (
                <div className="flex items-center gap-3">
                  <input
                    id="qac-multiday"
                    type="checkbox"
                    checked={isMultiDay}
                    onChange={(e) => {
                      setIsMultiDay(e.target.checked)
                      if (!e.target.checked) setEndDate('')
                    }}
                    className="h-4 w-4 rounded border-gray-300 accent-tinedy-blue"
                  />
                  <Label htmlFor="qac-multiday" className="font-normal cursor-pointer">
                    Multi-day booking
                  </Label>
                </div>
              )}

              {/* Recurring detail — matching Wizard Step2 style */}
              {servicePackageId && isRecurring && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  {/* Pattern selector */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Repeat Pattern</Label>
                    <RadioGroup
                      value={recurringPattern}
                      onValueChange={(v) => {
                        setRecurringPattern(v as RecurringPattern)
                        setRecurringDates([])
                        setNewDateInput('')
                      }}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value={Pattern.AutoMonthly} id="rp-auto" />
                        <Label htmlFor="rp-auto" className="cursor-pointer text-sm">
                          Monthly (auto)
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value={Pattern.Custom} id="rp-manual" />
                        <Label htmlFor="rp-manual" className="cursor-pointer text-sm">
                          Pick dates manually
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Auto-monthly: preview generated future dates */}
                  {recurringPattern === Pattern.AutoMonthly && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {frequency} bookings total (start date + {frequency - 1} monthly)
                      </p>
                      {!date ? (
                        <p className="text-xs text-muted-foreground">Select a start date to preview</p>
                      ) : recurringDates.length > 1 && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">
                            Future dates ({recurringDates.length - 1})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {recurringDates.slice(1).map((d) => (
                              <Badge key={d} variant="secondary" className="text-xs">
                                {format(parseISO(d), 'dd/MM/yyyy')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom: manual date picker with removable list */}
                  {recurringPattern === Pattern.Custom && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Add Date ({recurringDates.length}/{frequency})
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={newDateInput}
                          onChange={(e) => setNewDateInput(e.target.value)}
                          className="h-9 flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleAddDate}
                          disabled={!newDateInput || recurringDates.length >= frequency}
                          className="h-9 px-3"
                          aria-label="Add date"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {recurringDates.length > 0 ? (
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">
                            Selected dates ({recurringDates.length}/{frequency})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {recurringDates.map((d) => (
                              <Badge key={d} variant="secondary" className="text-xs flex items-center gap-1 pr-1">
                                {format(parseISO(d), 'dd/MM/yyyy')}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDate(d)}
                                  className="hover:text-destructive transition-colors ml-0.5"
                                  aria-label={`Remove date ${d}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No dates selected yet</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Time inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qac-start">Start Time *</Label>
                  <Input
                    id="qac-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qac-end">End Time</Label>
                  <Input
                    id="qac-end"
                    type="time"
                    value={endTime}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Assignment Type */}
              <div className="space-y-2">
                <Label htmlFor="qac-type">Assignment Type</Label>
                <Select
                  value={assignmentType}
                  onValueChange={(v) => setAssignmentType(v as 'individual' | 'team')}
                >
                  <SelectTrigger id="qac-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual Staff</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-background border-t px-6 pt-4 pb-6 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCheckAvailability}
                disabled={isCheckDisabled}
                className="flex-1 bg-tinedy-blue hover:bg-tinedy-blue/90"
              >
                Check Now
              </Button>
            </div>
          </div>
        ) : (
          /* ── Step 2: Results (StaffAvailabilityModal inline) ── */
          <div className="flex flex-col h-full">
            {/* Back button */}
            <div className="flex items-center gap-2 px-6 pb-3 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('input')}
                className="gap-1 -ml-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <span className="text-sm text-muted-foreground">
                {assignmentType === 'individual' ? 'Select Staff' : 'Select Team'}
              </span>
            </div>

            {/* Inline results */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {servicePackageId && (
                <StaffAvailabilityModal
                  inline
                  onClose={() => {}}
                  assignmentType={assignmentType}
                  onSelectStaff={handleSelectStaff}
                  onSelectTeam={handleSelectTeam}
                  date={!isRecurring ? date : undefined}
                  dates={isRecurring ? recurringDates : undefined}
                  startTime={startTime}
                  endTime={endTime}
                  servicePackageId={servicePackageId}
                  servicePackageName={selectedService?.name}
                />
              )}
            </div>
          </div>
        )}
      </AppSheet>
    </>
  )
}
