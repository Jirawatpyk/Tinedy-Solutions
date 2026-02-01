import React, { startTransition } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PackageSelector, type PackageSelectionData } from '@/components/service-packages'
import { RecurringScheduleSelector } from '../RecurringScheduleSelector'
import { RecurringPattern as Pattern } from '@/types/recurring-booking'
import type { RecurringPattern } from '@/types/recurring-booking'
import type { BookingFrequency } from '@/types/service-package-v2'
import type { UnifiedServicePackage } from '@/hooks/use-service-packages'
import type { ServicePackageV2WithTiers } from '@/types'
import type { BookingCreateFormData } from '@/schemas'
import { logger } from '@/lib/logger'

interface BookingScheduleSectionProps {
  form: UseFormReturn<BookingCreateFormData>
  servicePackages: UnifiedServicePackage[]
  packageSelection: PackageSelectionData | null
  setPackageSelection: (selection: PackageSelectionData | null) => void
  recurringDates: string[]
  setRecurringDates: (dates: string[] | ((prev: string[]) => string[])) => void
  recurringPattern: RecurringPattern
  setRecurringPattern: (pattern: RecurringPattern | ((prev: RecurringPattern) => RecurringPattern)) => void
  calculateEndTime: (startTime: string, durationMinutes: number) => string
}

const BookingScheduleSection = React.memo(function BookingScheduleSection({
  form,
  servicePackages,
  packageSelection,
  setPackageSelection,
  recurringDates,
  setRecurringDates,
  recurringPattern,
  setRecurringPattern,
  calculateEndTime,
}: BookingScheduleSectionProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

      {/* Package Selector V2 - รองรับทั้ง Fixed และ Tiered Pricing */}
      <div className="space-y-2 sm:col-span-2">
        <PackageSelector
          serviceType="cleaning"
          packages={servicePackages as unknown as ServicePackageV2WithTiers[]} // ส่ง unified packages
          value={packageSelection}
          onChange={(selection) => {
            logger.debug('Package selection changed', { selection }, { context: 'BookingScheduleSection' })

            // ใช้ startTransition เพื่อ batch updates แบบ non-blocking
            startTransition(() => {
              // Update parent state
              logger.debug('Updating package selection state', { selection }, { context: 'BookingScheduleSection' })
              setPackageSelection(selection)

              if (selection) {
                // ตรวจสอบว่า package เป็น V1 หรือ V2 จาก _source field
                const selectedPkg = servicePackages.find(pkg => pkg.id === selection.packageId)
                const isV1Package = selectedPkg?._source === 'v1'

                if (selection.pricingModel === 'fixed') {
                  logger.debug('Setting fixed price', {
                    price: selection.price,
                    version: selectedPkg?._source
                  }, { context: 'BookingScheduleSection' })

                  // FIX: ตั้งค่าตาม version ของ package (ต้องมีเพียงหนึ่งตัว)
                  if (isV1Package) {
                    form.setValue('service_package_id', selection.packageId)
                    form.setValue('package_v2_id', '')
                  } else {
                    form.setValue('service_package_id', '')
                    form.setValue('package_v2_id', selection.packageId)
                  }

                  form.setValue('total_price', selection.price)
                  form.setValue('area_sqm', undefined)
                  form.setValue('frequency', undefined)
                } else {
                  // Tiered pricing - ต้องเป็น V2 แน่นอน
                  logger.debug('Setting tiered price', {
                    price: selection.price,
                    areaSqm: selection.areaSqm,
                    frequency: selection.frequency
                  }, { context: 'BookingScheduleSection' })
                  form.setValue('service_package_id', '')
                  form.setValue('package_v2_id', selection.packageId)
                  form.setValue('area_sqm', selection.areaSqm)
                  form.setValue('frequency', selection.frequency as 1 | 2 | 4 | 8)
                  form.setValue('total_price', selection.price)

                  // Clear recurring state if frequency is 1 (one-time booking)
                  if (selection.frequency === 1) {
                    setRecurringDates([])
                    setRecurringPattern(Pattern.AutoMonthly)
                  }
                }

                // Auto-calculate End Time if Start Time is set
                const currentStartTime = form.getValues('start_time')
                if (currentStartTime && selection.estimatedHours) {
                  const durationMinutes = Math.round(selection.estimatedHours * 60)
                  const endTime = calculateEndTime(currentStartTime, durationMinutes)
                  logger.debug('Auto-calculated end time', {
                    endTime,
                    estimatedHours: selection.estimatedHours,
                    startTime: currentStartTime
                  }, { context: 'BookingScheduleSection' })
                  form.setValue('end_time', endTime)
                }
              } else {
                // Clear selection
                logger.debug('Clearing package selection', undefined, { context: 'BookingScheduleSection' })
                form.setValue('service_package_id', '')
                form.setValue('package_v2_id', '')
                form.setValue('area_sqm', undefined)
                form.setValue('frequency', undefined)
                form.setValue('total_price', 0)
              }
            })
          }}
        />
      </div>

      {/* Recurring Schedule Selector - แสดงอัตโนมัติเมื่อ frequency > 1 */}
      {packageSelection?.frequency && packageSelection.frequency > 1 && (
        <div className="space-y-2 sm:col-span-2">
          <RecurringScheduleSelector
            frequency={packageSelection.frequency as BookingFrequency}
            selectedDates={recurringDates}
            onDatesChange={setRecurringDates}
            pattern={recurringPattern}
            onPatternChange={setRecurringPattern}
          />
        </div>
      )}

      {/* Booking Date - แสดงเฉพาะเมื่อไม่ recurring (frequency = 1) - แยกแถวเดียวบน mobile */}
      {(!packageSelection?.frequency || packageSelection.frequency === 1) && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="booking_date">Booking Date *</Label>
          <Input
            id="booking_date"
            type="date"
            {...form.register('booking_date')}
            required
            aria-invalid={!!form.formState.errors.booking_date}
          />
          {form.formState.errors.booking_date && (
            <p className="text-sm text-destructive">
              {form.formState.errors.booking_date.message}
            </p>
          )}
        </div>
      )}

      {/* Time Fields - 2 columns */}
      <div className="sm:col-span-2 grid grid-cols-2 gap-3">
        {/* Start Time */}
        <div className="space-y-2">
          <Label htmlFor="start_time">Start Time *</Label>
          <Input
            id="start_time"
            type="time"
            {...form.register('start_time', {
              onChange: (e) => {
                const newStartTime = e.target.value

                // Auto-calculate End Time when Start Time changes
                if (newStartTime && packageSelection?.estimatedHours) {
                  const durationMinutes = Math.round(packageSelection.estimatedHours * 60)
                  const endTime = calculateEndTime(newStartTime, durationMinutes)
                  logger.debug('Auto-recalculated end time on start time change', {
                    newStartTime,
                    endTime,
                    estimatedHours: packageSelection.estimatedHours
                  }, { context: 'BookingScheduleSection' })
                  form.setValue('end_time', endTime)
                }
              }
            })}
            required
            aria-invalid={!!form.formState.errors.start_time}
          />
          {form.formState.errors.start_time && (
            <p className="text-sm text-destructive">
              {form.formState.errors.start_time.message}
            </p>
          )}
        </div>

        {/* End Time */}
        <div className="space-y-2">
          <Label htmlFor="end_time">End Time</Label>
          <Input
            id="end_time"
            type="time"
            {...form.register('end_time')}
            placeholder="Auto-calculated from package"
            disabled={true}
            className="bg-muted"
            aria-invalid={!!form.formState.errors.end_time}
          />
          {form.formState.errors.end_time && (
            <p className="text-sm text-destructive">
              {form.formState.errors.end_time.message}
            </p>
          )}
        </div>
      </div>

      {/* Price Display - For fixed pricing only */}
      {packageSelection?.pricingModel === 'fixed' && (
        <div className="space-y-2">
          <Label htmlFor="total_price">Total Price (Auto-calculated) *</Label>
          <Input
            id="total_price"
            type="number"
            step="0.01"
            {...form.register('total_price', { valueAsNumber: true })}
            required
            disabled
            className="bg-muted"
            aria-invalid={!!form.formState.errors.total_price}
          />
          {form.formState.errors.total_price && (
            <p className="text-sm text-destructive">
              {form.formState.errors.total_price.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Price is calculated from package selection
          </p>
        </div>
      )}
    </div>
  )
})

BookingScheduleSection.displayName = 'BookingScheduleSection'

export { BookingScheduleSection }
export type { BookingScheduleSectionProps }
