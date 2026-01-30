/**
 * NotificationSheet Component
 *
 * Responsive sheet for viewing notifications:
 * - Mobile: Slides from bottom
 * - Desktop: Slides from right
 * - List of notifications with mark-as-read
 */

import { useEffect, useRef } from 'react'
import { useInAppNotifications, type InAppNotification } from '@/hooks/use-in-app-notifications'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, BellOff, Check, CheckCheck, Trash2, Loader2, Calendar, Users, Briefcase } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface NotificationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'booking_assigned':
    case 'booking_updated':
    case 'booking_reminder':
      return <Calendar className="h-4 w-4" />
    case 'team_booking':
      return <Users className="h-4 w-4" />
    default:
      return <Briefcase className="h-4 w-4" />
  }
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: {
  notification: InAppNotification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        notification.is_read
          ? 'bg-background border-border'
          : 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded-full flex-shrink-0',
            notification.is_read
              ? 'bg-muted text-muted-foreground'
              : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
          )}
        >
          <NotificationIcon type={notification.type} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm',
              notification.is_read ? 'font-normal' : 'font-medium'
            )}
          >
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!notification.is_read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onMarkAsRead(notification.id)}
              title="Mark as read"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(notification.id)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function NotificationSheet({ open, onOpenChange }: NotificationSheetProps) {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useInAppNotifications()

  // Responsive side detection
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const prevIsMobile = useRef(isMobile)

  // Close sheet when crossing breakpoint
  useEffect(() => {
    if (open && prevIsMobile.current !== isMobile) {
      onOpenChange(false)
    }
    prevIsMobile.current = isMobile
  }, [isMobile, open, onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile ? 'h-[85vh] rounded-t-xl' : 'w-[400px]'}
      >
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-destructive text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </SheetTitle>
              <SheetDescription>
                Your recent notifications
              </SheetDescription>
            </div>
            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-8 text-xs"
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1" />
                    Read all
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-8 text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className={cn('mt-4', isMobile ? 'h-[calc(85vh-120px)]' : 'h-[calc(100vh-180px)]')}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll see booking updates and reminders here
              </p>
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
