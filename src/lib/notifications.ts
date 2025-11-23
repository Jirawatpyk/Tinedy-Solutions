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
    // Always check current browser permission, not cached value
    // This ensures permission changes are detected even after page reload
    if ('Notification' in window) {
      return Notification.permission === 'granted'
    }
    return false
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
      title: isTeam ? '👥 New Team Booking!' : '🔔 New Booking!',
      body: isTeam
        ? `New team booking from ${customerName} at ${time}`
        : `New booking from ${customerName} at ${time}`,
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
      title: isTeam ? '👥 Team Booking Reminder' : '⏰ Booking Reminder',
      body: isTeam
        ? `Team booking with ${customerName} starts in 30 minutes (${time})`
        : `Booking with ${customerName} starts in 30 minutes (${time})`,
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
      title: isTeam ? '👥 Team Booking Cancelled' : '❌ Booking Cancelled',
      body: isTeam
        ? `Team booking with ${customerName} at ${time} was cancelled`
        : `Booking with ${customerName} at ${time} was cancelled`,
      tag: 'booking-cancelled',
      data: {
        type: 'cancelled',
        notificationType
      }
    })
  }

  async notifyMessage(from: string, message: string): Promise<void> {
    await this.show({
      title: `💬 New message from ${from}`,
      body: message,
      tag: 'new-message',
      data: {
        type: 'message',
        url: '/staff/chat'
      }
    })
  }

  async notifyPaymentReceived(customerName: string, amount: number, bookingId: string): Promise<void> {
    await this.show({
      title: '💰 Payment Received',
      body: `Payment received from ${customerName}: ฿${amount.toLocaleString()}`,
      tag: `payment-${bookingId}`,
      data: {
        type: 'payment_received',
        bookingId,
        url: '/admin/bookings'
      }
    })
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
