import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useNotifications } from '@/hooks/use-notifications'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function NotificationSettingsCard() {
  const { hasPermission, isRequesting, requestPermission, isSupported } = useNotifications()

  if (!isSupported) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            Your browser does not support notifications
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            {hasPermission ? (
              <>
                <Bell className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Notifications Enabled</span>
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Notifications Disabled</span>
              </>
            )}
          </div>
          <div className={`h-2 w-2 rounded-full ${hasPermission ? 'bg-green-600' : 'bg-tinedy-dark/40'}`} />
        </div>

        {/* Browser Notifications Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="browser-notifications" className="text-base">
                Browser Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                {hasPermission
                  ? 'You will receive notifications about bookings and appointments'
                  : 'Get notified about new bookings and upcoming appointments'}
              </p>
              {hasPermission && (
                <p className="text-xs text-muted-foreground mt-1">
                  To disable, change settings in your browser
                </p>
              )}
            </div>
            <Switch
              id="browser-notifications"
              checked={hasPermission}
              disabled={hasPermission || !isSupported}
              onCheckedChange={(checked) => {
                if (checked && !hasPermission) {
                  requestPermission()
                }
              }}
            />
          </div>

          {!hasPermission && (
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
              <AlertDescription className="text-sm">
                <p className="font-medium mb-1">Enable notifications to receive:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground ml-1">
                  <li>New booking assignments</li>
                  <li>Team booking notifications</li>
                  <li>Booking status updates</li>
                  <li>Upcoming appointment reminders (30 minutes before)</li>
                </ul>
                <Button
                  onClick={() => requestPermission()}
                  disabled={isRequesting}
                  size="sm"
                  className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Bell className="h-3 w-3 mr-2" />
                  {isRequesting ? 'Requesting Permission...' : 'Enable Notifications'}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Info */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            You can change notification permissions in your browser settings at any time.
          </p>
        </div>
      </div>
  )
}
