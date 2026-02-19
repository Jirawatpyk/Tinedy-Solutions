import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck } from 'lucide-react'
import { useModalState } from '@/hooks/use-modal-state'
import { createLogger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StaffAvailabilityModal } from './staff-availability-modal'
import { RecurringScheduleSelector } from './RecurringScheduleSelector'
import { useServicePackages, type UnifiedServicePackage } from '@/hooks/use-service-packages'
import { calculatePricing } from '@/lib/pricing-utils'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import type { RecurringPattern } from '@/types/recurring-booking'
import { RecurringPattern as Pattern } from '@/types/recurring-booking'
import type { BookingFrequency } from '@/types/service-package-v2'

const logger = createLogger('QuickAvailabilityCheck')

export function QuickAvailabilityCheck() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const dialog = useModalState()
  const resultsModal = useModalState()

  // Form state
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('11:00')
  const [servicePackageId, setServicePackageId] = useState('')
  const [assignmentType, setAssignmentType] = useState<'individual' | 'team'>('individual')
  const [areaSqm, setAreaSqm] = useState<number | null>(null)
  const [frequency, setFrequency] = useState<1 | 2 | 4 | 8>(1)

  // Recurring state (auto-enabled when frequency > 1)
  const [recurringDates, setRecurringDates] = useState<string[]>([])
  const [recurringPattern, setRecurringPattern] = useState<RecurringPattern>(Pattern.AutoMonthly)

  const { packages } = useServicePackages()
  const selectedService = packages.find((s: UnifiedServicePackage) => s.id === servicePackageId)

  // Reset form fields only (without closing modal - prevents circular dependency)
  const resetFormFields = useCallback(() => {
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setStartTime('09:00')
    setEndTime('11:00')
    setServicePackageId('')
    setAssignmentType('individual')
    setAreaSqm(null)
    setFrequency(1)
    setRecurringDates([])
    setRecurringPattern(Pattern.AutoMonthly)
  }, [])

  // Reset form and close results modal
  const resetForm = useCallback(() => {
    resetFormFields()
    resultsModal.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetFormFields])

  // Auto-calculate end time when service or start time changes
  useEffect(() => {
    if (!startTime) return

    const calculateEndTimeFromDuration = (start: string, durationMinutes: number): string => {
      const [hours, minutes] = start.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes + durationMinutes
      const endHours = Math.floor(totalMinutes / 60) % 24
      const endMinutes = totalMinutes % 60
      return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
    }

    // Fixed pricing - use duration_minutes
    if (selectedService?.duration_minutes) {
      const calculatedEndTime = calculateEndTimeFromDuration(startTime, selectedService.duration_minutes)
      setEndTime(calculatedEndTime)
      return
    }

    // Tiered pricing - use estimated_hours from tier directly
    if (selectedService?.pricing_model === 'tiered' && areaSqm && areaSqm > 0) {
      // เรียกใช้ calculatePricing เพื่อหา tier ที่ตรงกับพื้นที่
      calculatePricing(selectedService.id, areaSqm, frequency)
        .then((result) => {
          if (result.found && result.estimated_hours) {
            // ใช้ estimated_hours จาก tier โดยตรง
            const calculatedEndTime = calculateEndTimeFromDuration(startTime, result.estimated_hours * 60)
            setEndTime(calculatedEndTime)
          }
        })
        .catch((error) => {
          console.error('Error calculating pricing for end time:', error)
        })
    }
  }, [selectedService, startTime, areaSqm, frequency])

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      dialog.open()
    } else {
      dialog.close()
      // Reset form fields only when closing dialog (not the results modal)
      resetFormFields()
    }
  }, [dialog, resetFormFields])

  const handleCheckAvailability = () => {
    // Validate inputs
    if (!servicePackageId || !startTime || !endTime) {
      return
    }

    // Validate dates based on frequency
    const isRecurring = frequency > 1
    if (isRecurring) {
      if (recurringDates.length === 0) {
        toast({
          title: 'Error',
          description: 'Please select at least one date for recurring booking',
          variant: 'destructive'
        })
        return
      }
    } else {
      if (!date) {
        return
      }
    }

    resultsModal.open()
    dialog.close()
  }

  return (
    <>
      {/* Quick Access Button - icon on mobile with tooltip, text on tablet+ without tooltip */}
      {/* Mobile: icon only with tooltip */}
      <SimpleTooltip content="Check Availability">
        <Button
          variant="outline"
          size="icon"
          onClick={dialog.open}
          className="md:hidden"
        >
          <CalendarCheck className="h-4 w-4" />
        </Button>
      </SimpleTooltip>
      {/* Tablet+: full button without tooltip */}
      <Button
        variant="outline"
        size="sm"
        onClick={dialog.open}
        className="hidden md:flex gap-2"
      >
        <CalendarCheck className="h-4 w-4" />
        <span>Check Availability</span>
      </Button>

      {/* Step 1: Input Dialog */}
      <Dialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Quick Availability Check
            </DialogTitle>
            <DialogDescription>
              Check which staff or teams are available for a booking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 pl-1 pr-3 overflow-y-auto flex-1">
            {/* Service Package - MOVED TO TOP */}
            <div className="space-y-2">
              <Label htmlFor="service">Service Package</Label>
              <Select value={servicePackageId} onValueChange={setServicePackageId}>
                <SelectTrigger id="service">
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

            {/* Tiered Pricing Inputs (แสดงเมื่อเลือก Tiered Package) */}
            {selectedService?.pricing_model === 'tiered' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="area">Area (sqm) *</Label>
                  <Input
                    id="area"
                    type="number"
                    min="1"
                    value={areaSqm || ''}
                    onChange={(e) => setAreaSqm(e.target.value ? Number(e.target.value) : null)}
                    placeholder="Enter area"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select
                    value={String(frequency)}
                    onValueChange={(value) => setFrequency(Number(value) as 1 | 2 | 4 | 8)}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 time</SelectItem>
                      <SelectItem value="2">2 times</SelectItem>
                      <SelectItem value="4">4 times</SelectItem>
                      <SelectItem value="8">8 times</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Recurring Schedule Selector - แสดงอัตโนมัติเมื่อ frequency > 1 */}
            {servicePackageId && frequency > 1 ? (
              <>
                <div className="space-y-2">
                  <RecurringScheduleSelector
                    frequency={frequency as BookingFrequency}
                    selectedDates={recurringDates}
                    onDatesChange={setRecurringDates}
                    pattern={recurringPattern}
                    onPatternChange={setRecurringPattern}
                  />
                </div>

                {/* Time Range for Recurring - 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time *</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Date/Time for Non-Recurring - Date แยกบรรทัด, Time 2 columns */
              <>
                {/* Date - บรรทัดเดียว */}
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                {/* Time - 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time *</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Assignment Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Assignment Type</Label>
              <Select
                value={assignmentType}
                onValueChange={(value) => setAssignmentType(value as 'individual' | 'team')}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual Staff</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={dialog.close}>
              Cancel
            </Button>
            <Button
              onClick={handleCheckAvailability}
              disabled={
                !servicePackageId ||
                (frequency === 1 && !date) ||
                (frequency > 1 && recurringDates.length === 0) ||
                !startTime ||
                !endTime ||
                (selectedService?.pricing_model === 'tiered' && (!areaSqm || !frequency))
              }
            >
              Check Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 2: Results Modal (reuse existing StaffAvailabilityModal) */}
      {resultsModal.isOpen && servicePackageId && (
        <StaffAvailabilityModal
          isOpen={resultsModal.isOpen}
          onClose={resultsModal.close}
          assignmentType={assignmentType}
          onSelectStaff={(staffId) => {
            // Navigate to bookings page and trigger create modal with prefilled data
            const isRecurring = frequency > 1

            // Debug: Log recurring pattern
            logger.debug('Sending recurring data', {
              isRecurring,
              recurringDates,
              recurringPattern,
              frequency
            })

            // Show success message
            toast({
              title: 'Staff Selected',
              description: 'Redirecting to create booking...',
            })

            // Navigate with state - with recurring support
            navigate('/admin/bookings', {
              state: {
                createBooking: true,
                prefilledData: {
                  booking_date: isRecurring ? '' : date, // Empty if recurring
                  start_time: startTime,
                  end_time: endTime,
                  package_v2_id: servicePackageId,
                  staff_id: staffId,
                  team_id: '',
                  total_price: selectedService?.base_price || 0,
                  area_sqm: selectedService?.pricing_model === 'tiered' ? areaSqm : null,
                  frequency: selectedService?.pricing_model === 'tiered' ? frequency : null,
                  // Recurring data
                  is_recurring: isRecurring,
                  recurring_dates: isRecurring ? recurringDates : undefined,
                  recurring_pattern: isRecurring ? recurringPattern : undefined,
                }
              }
            })

            // Reset form after navigation
            resetForm()
          }}
          onSelectTeam={(teamId) => {
            // Navigate to bookings page and trigger create modal with prefilled data
            const isRecurring = frequency > 1

            // Show success message
            toast({
              title: 'Team Selected',
              description: 'Redirecting to create booking...',
            })

            // Navigate with state - with recurring support
            navigate('/admin/bookings', {
              state: {
                createBooking: true,
                prefilledData: {
                  booking_date: isRecurring ? '' : date, // Empty if recurring
                  start_time: startTime,
                  end_time: endTime,
                  package_v2_id: servicePackageId,
                  staff_id: '',
                  team_id: teamId,
                  total_price: selectedService?.base_price || 0,
                  area_sqm: selectedService?.pricing_model === 'tiered' ? areaSqm : null,
                  frequency: selectedService?.pricing_model === 'tiered' ? frequency : null,
                  // Recurring data
                  is_recurring: isRecurring,
                  recurring_dates: isRecurring ? recurringDates : undefined,
                  recurring_pattern: isRecurring ? recurringPattern : undefined,
                }
              }
            })

            // Reset form after navigation
            resetForm()
          }}
          date={frequency === 1 ? date : undefined}
          dates={frequency > 1 ? recurringDates : undefined}
          startTime={startTime}
          endTime={endTime}
          servicePackageId={servicePackageId}
          servicePackageName={selectedService?.name}
        />
      )}
    </>
  )
}
