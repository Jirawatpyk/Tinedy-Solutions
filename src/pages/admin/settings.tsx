/**
 * Admin Settings Page
 *
 * จัดการการตั้งค่าระบบ:
 * - General Settings: ข้อมูลธุรกิจ
 *
 * Integrated with Zod schemas (Phase 5)
 */

import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSettings } from '@/hooks/use-settings'
import { AdminOnly } from '@/components/auth/permission-guard'
import { GeneralSettingsForm } from '@/components/settings/GeneralSettingsForm'
import { AlertCircle } from 'lucide-react'

export default function AdminSettings() {
  const { settings, loading, error, refresh } = useSettings()

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

  // Prepare initial data for form
  const generalInitialData = {
    business_name: settings.business_name,
    business_email: settings.business_email,
    business_phone: settings.business_phone,
    business_address: settings.business_address,
    business_description: settings.business_description,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    business_logo_url: (settings as any).business_logo_url || null,
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
            <GeneralSettingsForm
              initialData={generalInitialData}
              settingsId={settings.id}
              onSuccess={refresh}
            />
          </div>
        </div>
      </div>
    </AdminOnly>
  )
}
