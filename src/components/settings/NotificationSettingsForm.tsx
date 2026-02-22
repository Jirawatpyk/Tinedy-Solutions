/**
 * NotificationSettingsForm Component
 *
 * ฟอร์มสำหรับจัดการการตั้งค่าการแจ้งเตือน
 * - Email notifications
 * - SMS notifications
 * - Booking event notifications
 * - Reminder settings
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
  NotificationSettingsSchema,
  NotificationSettingsTransformSchema,
  type NotificationSettingsFormData,
} from '@/schemas'
import { Badge } from '@/components/ui/badge'
import { Bell, Save } from 'lucide-react'

interface NotificationSettingsFormProps {
  initialData?: Partial<NotificationSettingsFormData>
  settingsId?: string
  onSuccess?: () => void
}

export function NotificationSettingsForm({ initialData, settingsId, onSuccess }: NotificationSettingsFormProps) {
  const form = useForm<NotificationSettingsFormData>({
    resolver: zodResolver(NotificationSettingsSchema),
    defaultValues: {
      email_notifications: initialData?.email_notifications ?? true,
      sms_notifications: initialData?.sms_notifications ?? false,
      notify_new_booking: initialData?.notify_new_booking ?? true,
      notify_cancellation: initialData?.notify_cancellation ?? true,
      notify_payment: initialData?.notify_payment ?? true,
      reminder_hours: initialData?.reminder_hours || '24',
    },
  })

  const onSubmit = async (data: NotificationSettingsFormData) => {
    try {
      // Transform data
      const transformedData = NotificationSettingsTransformSchema.parse(data)

      // Update settings
      const { error } = await supabase
        .from('settings')
        .update(transformedData)
        .eq('id', settingsId)

      if (error) throw error

      toast.success('Notification settings saved successfully')

      onSuccess?.()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'general')
      toast.error(errorMsg.title, { description: errorMsg.description })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Configure how and when you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Notification Channels */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Notification Channels</h3>

            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Controller
                name="email_notifications"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    id="email_notifications"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="sms_notifications">SMS Notifications</Label>
                  <Badge variant="warning" className="text-xs">Coming Soon</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via SMS
                </p>
              </div>
              <Controller
                name="sms_notifications"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    id="sms_notifications"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled
                  />
                )}
              />
            </div>
          </div>

          {/* Phase 2: Booking Events — hidden until backend triggers check settings
              See: tech-spec-functional-booking-event-toggles.md */}
          <div className="border-t pt-6" hidden>
            <h3 className="text-sm font-medium mb-4">Booking Events</h3>

            {/* Notify New Booking */}
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-0.5">
                <Label htmlFor="notify_new_booking">New Booking</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when a new booking is created
                </p>
              </div>
              <Controller
                name="notify_new_booking"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    id="notify_new_booking"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Notify Cancellation */}
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-0.5">
                <Label htmlFor="notify_cancellation">Cancellation</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when a booking is cancelled
                </p>
              </div>
              <Controller
                name="notify_cancellation"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    id="notify_cancellation"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Notify Payment */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify_payment">Payment</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when payment is received
                </p>
              </div>
              <Controller
                name="notify_payment"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    id="notify_payment"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-medium mb-4">Reminders</h3>

            {/* Reminder Hours */}
            <div className="space-y-2">
              <Label htmlFor="reminder_hours">Send Reminder Before Booking *</Label>
              <Controller
                name="reminder_hours"
                control={form.control}
                render={({ field, fieldState }) => (
                  <>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="reminder_hours">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="12">12 hours</SelectItem>
                        <SelectItem value="24">24 hours (1 day)</SelectItem>
                        <SelectItem value="48">48 hours (2 days)</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-sm text-red-500">{fieldState.error.message}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      How many hours before booking to send reminder
                    </p>
                  </>
                )}
              />
            </div>
          </div>

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
