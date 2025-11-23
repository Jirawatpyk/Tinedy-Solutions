/**
 * Admin Settings Page
 *
 * จัดการการตั้งค่าระบบทั้งหมด:
 * - General Settings: ข้อมูลธุรกิจ
 * - Booking Settings: การตั้งค่าการจอง
 * - Notification Settings: การตั้งค่าการแจ้งเตือน
 *
 * Integrated with Zod schemas (Phase 5)
 */

import { SimpleTabs as Tabs, SimpleTabsContent as TabsContent, SimpleTabsList as TabsList, SimpleTabsTrigger as TabsTrigger } from '@/components/ui/simple-tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSettings } from '@/hooks/use-settings'
import { AdminOnly } from '@/components/auth/permission-guard'
import { GeneralSettingsForm } from '@/components/settings/GeneralSettingsForm'
import { BookingSettingsForm } from '@/components/settings/BookingSettingsForm'
import { NotificationSettingsForm } from '@/components/settings/NotificationSettingsForm'
import type {
  TimeSlotDuration,
  MinAdvanceBooking,
  MaxBookingWindow,
  CancellationHours,
  DepositPercentage,
  ReminderHours,
} from '@/schemas'
import {
  Building2,
  Clock,
  Bell,
  AlertCircle,
} from 'lucide-react'
import { useState } from 'react'

export default function AdminSettings() {
  const { settings, loading, error, refresh } = useSettings()
  const [activeTab, setActiveTab] = useState('general')

  // Show loading skeleton while settings load
  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b">
          <div className="px-4 sm:px-6 py-6">
            <p className="text-sm text-muted-foreground">
              Manage your system settings and preferences
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  // Show error if settings fail to load
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b">
          <div className="px-4 sm:px-6 py-6">
            <p className="text-sm text-muted-foreground">
              Manage your system settings and preferences
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading settings: {error}. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // Prepare initial data for forms
  const generalInitialData = {
    business_name: settings.business_name,
    business_email: settings.business_email,
    business_phone: settings.business_phone,
    business_address: settings.business_address,
    business_description: settings.business_description,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    business_logo_url: (settings as any).business_logo_url || null,
  }

  const bookingInitialData = {
    time_slot_duration: String(settings.time_slot_duration) as TimeSlotDuration,
    min_advance_booking: String(settings.min_advance_booking) as MinAdvanceBooking,
    max_booking_window: String(settings.max_booking_window) as MaxBookingWindow,
    cancellation_hours: String(settings.cancellation_hours) as CancellationHours,
    require_deposit: settings.require_deposit,
    deposit_percentage: settings.deposit_percentage ? (String(settings.deposit_percentage) as DepositPercentage) : null,
  }

  const notificationInitialData = {
    email_notifications: settings.email_notifications,
    sms_notifications: settings.sms_notifications,
    notify_new_booking: settings.notify_new_booking,
    notify_cancellation: settings.notify_cancellation,
    notify_payment: settings.notify_payment,
    reminder_hours: String(settings.reminder_hours) as ReminderHours,
  }

  return (
    <AdminOnly
      fallback="alert"
      fallbackMessage="You do not have permission to access system settings. Only administrators can manage settings."
    >
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b">
          <div className="px-4 sm:px-6 py-6">
            <p className="text-sm text-muted-foreground">
              Manage your system settings and preferences
            </p>
          </div>
        </div>

        {/* Settings Content */}
        <div className="p-4 sm:p-6">
          <div className="max-w-full mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="general" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger value="booking" className="flex items-center gap-2" disabled>
                  <Clock className="h-4 w-4" />
                  Booking
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2" disabled>
                  <Bell className="h-4 w-4" />
                  Notifications
                </TabsTrigger>
              </TabsList>

              {/* General Settings Tab */}
              <TabsContent value="general">
                <GeneralSettingsForm
                  initialData={generalInitialData}
                  settingsId={settings.id}
                  onSuccess={refresh}
                />
              </TabsContent>

              {/* Booking Settings Tab */}
              <TabsContent value="booking">
                <BookingSettingsForm
                  initialData={bookingInitialData}
                  settingsId={settings.id}
                  onSuccess={refresh}
                />
              </TabsContent>

              {/* Notification Settings Tab */}
              <TabsContent value="notifications">
                <NotificationSettingsForm
                  initialData={notificationInitialData}
                  settingsId={settings.id}
                  onSuccess={refresh}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AdminOnly>
  )
}
