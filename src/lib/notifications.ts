// Notification Service for Browser Push Notifications

export interface NotificationData {
  type: string
  bookingId?: string
  notificationType?: 'personal' | 'team'
  url?: string
  [key: string]: unknown
}

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: NotificationData
}

class NotificationService {
  private permission: NotificationPermission = 'default'

  constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission
    }
  }

  // Request notification permission from user
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return false
    }

    if (this.permission === 'granted') {
      return true
    }

    const permission = await Notification.requestPermission()
    this.permission = permission
    return permission === 'granted'
  }

  // Check if notifications are supported and permitted
  isSupported(): boolean {
    return 'Notification' in window
  }

  isGranted(): boolean {
    return this.permission === 'granted'
  }

  // Show a notification
  async show(options: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Notifications not supported')
      return
    }

    // Request permission if not yet granted
    if (!this.isGranted()) {
      const granted = await this.requestPermission()
      if (!granted) {
        console.warn('Notification permission denied')
        return
      }
    }

    // Create notification
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/logo.png',
      badge: options.badge || '/logo.png',
      tag: options.tag,
      data: options.data,
      requireInteraction: false,
      silent: false,
    })

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000)

    // Handle click event
    notification.onclick = () => {
      window.focus()
      notification.close()

      // Navigate to relevant page if data contains URL
      if (options.data?.url) {
        window.location.href = options.data.url
      }
    }
  }

  // Notification templates for common events
  async notifyNewBooking(customerName: string, time: string, bookingId: string, notificationType: 'personal' | 'team' = 'personal'): Promise<void> {
    const isTeam = notificationType === 'team'
    await this.show({
      title: isTeam ? '👥 งานทีมใหม่!' : '🔔 งานใหม่!',
      body: isTeam
        ? `มีงานทีมใหม่จาก ${customerName} เวลา ${time}`
        : `มีงานใหม่จาก ${customerName} เวลา ${time}`,
      tag: `new-booking-${bookingId}`,
      data: {
        type: 'new_booking',
        bookingId,
        notificationType,
        url: '/staff'
      }
    })
  }

  async notifyBookingReminder(customerName: string, time: string, bookingId: string, notificationType: 'personal' | 'team' = 'personal'): Promise<void> {
    const isTeam = notificationType === 'team'
    await this.show({
      title: isTeam ? '👥 แจ้งเตือนงานทีม' : '⏰ แจ้งเตือนงาน',
      body: isTeam
        ? `งานทีมกับ ${customerName} จะเริ่มในอีก 30 นาที (${time})`
        : `งานกับ ${customerName} จะเริ่มในอีก 30 นาที (${time})`,
      tag: `reminder-${bookingId}`,
      data: {
        type: 'reminder',
        bookingId,
        notificationType,
        url: '/staff'
      }
    })
  }

  async notifyBookingCancelled(customerName: string, time: string, notificationType: 'personal' | 'team' = 'personal'): Promise<void> {
    const isTeam = notificationType === 'team'
    await this.show({
      title: isTeam ? '👥 งานทีมถูกยกเลิก' : '❌ งานถูกยกเลิก',
      body: isTeam
        ? `งานทีมกับ ${customerName} เวลา ${time} ถูกยกเลิก`
        : `งานกับ ${customerName} เวลา ${time} ถูกยกเลิก`,
      tag: 'booking-cancelled',
      data: {
        type: 'cancelled',
        notificationType
      }
    })
  }

  async notifyMessage(from: string, message: string): Promise<void> {
    await this.show({
      title: `💬 ข้อความใหม่จาก ${from}`,
      body: message,
      tag: 'new-message',
      data: {
        type: 'message',
        url: '/staff/chat'
      }
    })
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
