/**
 * Admin Settings Page
 *
 * จัดการการตั้งค่าระบบ:
 * - General Tab: ข้อมูลธุรกิจ
 * - Payment Tab: การตั้งค่าการชำระเงิน
 * - Notification Tab: การตั้งค่าการแจ้งเตือน + Email Logs
 *
 * Integrated with Zod schemas (Phase 5)
 */

import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSettings } from '@/hooks/use-settings'
import { AdminOnly } from '@/components/auth/permission-guard'
import { GeneralSettingsForm } from '@/components/settings/GeneralSettingsForm'
import { PaymentSettingsForm } from '@/components/settings/PaymentSettingsForm'
import { NotificationSettingsForm } from '@/components/settings/NotificationSettingsForm'
import { EmailLogsSection } from '@/components/settings/EmailLogsSection'
import { PageHeader } from '@/components/common/PageHeader'
import { AlertCircle, Building2, CreditCard, Bell } from 'lucide-react'

export default function AdminSettings() {
  const { settings, loading, error, refresh } = useSettings()
  const [activeTab, setActiveTab] = useState('general')

  // Show loading skeleton while settings load
  if (loading || !settings) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          subtitle="Manage your business information, payment, and notification settings"
        />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Show error if settings fail to load
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          subtitle="Manage your business information, payment, and notification settings"
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading settings: {error}. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Prepare initial data for form
  const generalInitialData = {
    business_name: settings.business_name,
    business_email: settings.business_email,
    business_phone: settings.business_phone,
    business_address: settings.business_address,
    business_description: settings.business_description,
    business_logo_url: settings.business_logo_url || null,
  }

  // Prepare payment settings initial data
  const paymentInitialData = {
    bank_name: settings.bank_name,
    bank_account_name: settings.bank_account_name,
    bank_account_number: settings.bank_account_number,
    promptpay_id: settings.promptpay_id,
  }

  return (
    <AdminOnly
      fallback="alert"
      fallbackMessage="You do not have permission to access system settings. Only Super Admin can manage settings."
    >
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          subtitle="Manage your business information, payment, and notification settings"
        />

        {/* Settings Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="general" className="flex items-center justify-center gap-1.5 text-xs sm:text-sm sm:gap-2 min-w-0">
              <Building2 className="h-4 w-4 hidden sm:block shrink-0" />
              <span className="truncate">General</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center justify-center gap-1.5 text-xs sm:text-sm sm:gap-2 min-w-0">
              <CreditCard className="h-4 w-4 hidden sm:block shrink-0" />
              <span className="truncate">Payment</span>
            </TabsTrigger>
            <TabsTrigger value="notification" className="flex items-center justify-center gap-1.5 text-xs sm:text-sm sm:gap-2 min-w-0">
              <Bell className="h-4 w-4 hidden sm:block shrink-0" />
              <span className="truncate">Notification</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralSettingsForm
              initialData={generalInitialData}
              settingsId={settings.id}
              onSuccess={refresh}
            />
          </TabsContent>

          <TabsContent value="payment">
            <PaymentSettingsForm
              initialData={paymentInitialData}
              settingsId={settings.id}
              onSuccess={refresh}
            />
          </TabsContent>

          <TabsContent value="notification">
            <div className="space-y-6">
              <NotificationSettingsForm
                initialData={{
                  email_notifications: settings.email_notifications,
                  sms_notifications: settings.sms_notifications,
                  notify_new_booking: settings.notify_new_booking,
                  notify_cancellation: settings.notify_cancellation,
                  notify_payment: settings.notify_payment,
                  reminder_hours: (['1', '2', '4', '12', '24', '48'] as const).includes(
                    String(settings.reminder_hours || 24) as '1' | '2' | '4' | '12' | '24' | '48'
                  )
                    ? (String(settings.reminder_hours || 24) as '1' | '2' | '4' | '12' | '24' | '48')
                    : '24',
                }}
                settingsId={settings.id}
                onSuccess={refresh}
              />
              <EmailLogsSection />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminOnly>
  )
}
