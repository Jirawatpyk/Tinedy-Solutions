import { Bell, BellOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useState } from 'react'

interface NotificationPromptProps {
  onRequest: () => Promise<boolean>
  isRequesting: boolean
}

export function NotificationPrompt({ onRequest, isRequesting }: NotificationPromptProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <Alert className="mb-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 animate-in fade-in-50 slide-in-from-top-4">
      <div className="flex items-start gap-3">
        <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <AlertDescription className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              เปิดการแจ้งเตือน
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              รับการแจ้งเตือนเมื่อมีงานใหม่หรืองานที่กำลังจะถึง
            </p>
          </AlertDescription>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={async () => {
                const granted = await onRequest()
                if (granted) setDismissed(true)
              }}
              disabled={isRequesting}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Bell className="h-3 w-3 mr-1" />
              {isRequesting ? 'กำลังขอสิทธิ์...' : 'เปิดการแจ้งเตือน'}
            </Button>
            <Button
              onClick={() => setDismissed(true)}
              variant="outline"
              size="sm"
            >
              ภายหลัง
            </Button>
          </div>
        </div>
        <Button
          onClick={() => setDismissed(true)}
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  )
}

export function NotificationStatus({ hasPermission }: { hasPermission: boolean }) {
  if (hasPermission) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <Bell className="h-3 w-3" />
        <span>การแจ้งเตือนเปิดอยู่</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <BellOff className="h-3 w-3" />
      <span>การแจ้งเตือนปิดอยู่</span>
    </div>
  )
}
