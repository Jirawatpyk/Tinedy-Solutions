import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useInAppNotifications } from '@/hooks/use-in-app-notifications'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useInAppNotifications()

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_booking':
        return '🔔'
      case 'team_booking':
        return '👥'
      case 'booking_reminder':
        return '⏰'
      case 'booking_cancelled':
        return '❌'
      case 'booking_updated':
        return '📝'
      case 'new_customer':
        return '👤'
      case 'new_team':
        return '👥'
      default:
        return '📢'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">การแจ้งเตือน</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                อ่านทั้งหมด
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-8 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                ลบทั้งหมด
              </Button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">กำลังโหลด...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Bell className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                ไม่มีการแจ้งเตือน
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 hover:bg-muted/50 transition-colors group relative',
                    !notification.is_read && 'bg-primary/5'
                  )}
                >
                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
                  )}

                  <div className="flex gap-3 pl-4">
                    {/* Icon */}
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm mb-1">
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground break-words">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: th,
                            })}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => markAsRead(notification.id)}
                              title="ทำเครื่องหมายว่าอ่านแล้ว"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteNotification(notification.id)}
                            title="ลบการแจ้งเตือน"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
