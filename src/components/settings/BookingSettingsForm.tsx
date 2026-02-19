/**
 * BookingSettingsForm Component
 *
 * ฟอร์มสำหรับจัดการการตั้งค่าการจอง
 * - Time slot duration
 * - Minimum advance booking
 * - Maximum booking window
 * - Cancellation hours
 * - Deposit requirements
 * - ใช้ React Hook Form + Zod validation
 */

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import {
  BookingSettingsSchema,
  BookingSettingsTransformSchema,
  type BookingSettingsFormData,
} from '@/schemas'
import { Clock, Calendar, Save } from 'lucide-react'

interface BookingSettingsFormProps {
  initialData?: Partial<BookingSettingsFormData>
  settingsId?: string
  onSuccess?: () => void
}

export function BookingSettingsForm({ initialData, settingsId, onSuccess }: BookingSettingsFormProps) {
  const form = useForm<BookingSettingsFormData>({
    resolver: zodResolver(BookingSettingsSchema),
    defaultValues: {
      time_slot_duration: initialData?.time_slot_duration || '60',
      min_advance_booking: initialData?.min_advance_booking || '24',
      max_booking_window: initialData?.max_booking_window || '60',
      cancellation_hours: initialData?.cancellation_hours || '24',
      require_deposit: initialData?.require_deposit ?? false,
      deposit_percentage: initialData?.deposit_percentage || null,
    },
  })

  const onSubmit = async (data: BookingSettingsFormData) => {
    try {
      // Transform data
      const transformedData = BookingSettingsTransformSchema.parse(data)

      // Update settings
      const { error } = await supabase
        .from('settings')
        .update(transformedData)
        .eq('id', settingsId)

      if (error) throw error

      toast.success('Booking settings saved successfully')

      onSuccess?.()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'general')
      toast.error(errorMsg.title, { description: errorMsg.description })
    }
  }

  const requireDeposit = form.watch('require_deposit')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Booking Settings
        </CardTitle>
        <CardDescription>
          Configure booking time slots, windows, and deposit requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Time Slot Duration */}
          <div className="space-y-2">
            <Label htmlFor="time_slot_duration" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Slot Duration *
            </Label>
            <Controller
              name="time_slot_duration"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="time_slot_duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-sm text-red-500">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>

          {/* Minimum Advance Booking */}
          <div className="space-y-2">
            <Label htmlFor="min_advance_booking">Minimum Advance Booking *</Label>
            <Controller
              name="min_advance_booking"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="min_advance_booking">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours (1 day)</SelectItem>
                      <SelectItem value="48">48 hours (2 days)</SelectItem>
                      <SelectItem value="72">72 hours (3 days)</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-sm text-red-500">{fieldState.error.message}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Minimum time customers must book in advance
                  </p>
                </>
              )}
            />
          </div>

          {/* Maximum Booking Window */}
          <div className="space-y-2">
            <Label htmlFor="max_booking_window">Maximum Booking Window *</Label>
            <Controller
              name="max_booking_window"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="max_booking_window">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days (1 week)</SelectItem>
                      <SelectItem value="14">14 days (2 weeks)</SelectItem>
                      <SelectItem value="30">30 days (1 month)</SelectItem>
                      <SelectItem value="60">60 days (2 months)</SelectItem>
                      <SelectItem value="90">90 days (3 months)</SelectItem>
                      <SelectItem value="180">180 days (6 months)</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-sm text-red-500">{fieldState.error.message}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Maximum days in advance customers can book
                  </p>
                </>
              )}
            />
          </div>

          {/* Cancellation Hours */}
          <div className="space-y-2">
            <Label htmlFor="cancellation_hours">Cancellation Window *</Label>
            <Controller
              name="cancellation_hours"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="cancellation_hours">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours (1 day)</SelectItem>
                      <SelectItem value="48">48 hours (2 days)</SelectItem>
                      <SelectItem value="72">72 hours (3 days)</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-sm text-red-500">{fieldState.error.message}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Minimum hours before booking to allow cancellation
                  </p>
                </>
              )}
            />
          </div>

          {/* Require Deposit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="require_deposit">Require Deposit</Label>
              <Controller
                name="require_deposit"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    id="require_deposit"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Require customers to pay a deposit when booking
            </p>
          </div>

          {/* Deposit Percentage (only show if require_deposit is true) */}
          {requireDeposit && (
            <div className="space-y-2">
              <Label htmlFor="deposit_percentage">Deposit Percentage *</Label>
              <Controller
                name="deposit_percentage"
                control={form.control}
                render={({ field, fieldState }) => (
                  <>
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="deposit_percentage">
                        <SelectValue placeholder="Select percentage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="20">20%</SelectItem>
                        <SelectItem value="30">30%</SelectItem>
                        <SelectItem value="50">50%</SelectItem>
                        <SelectItem value="100">100% (Full payment)</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-sm text-red-500">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="bg-tinedy-blue hover:bg-tinedy-blue/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
