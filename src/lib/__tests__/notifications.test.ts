import { describe, it, expect, beforeEach, vi } from 'vitest'
import { notificationService } from '../notifications'
import type { NotificationOptions } from '../notifications'

// Mock the Notification API
const mockNotificationInstance = {
  close: vi.fn(),
  onclick: null as ((this: Notification, ev: Event) => unknown) | null,
}

// Use function (not arrow function) to support 'new' keyword
const mockNotification = vi.fn(function(this: any, _title: string, _options?: NotificationOptions) {
  return mockNotificationInstance
})

// Mock setTimeout
vi.useFakeTimers()

describe('notifications', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    mockNotificationInstance.close.mockClear()
    mockNotificationInstance.onclick = null

    // Setup window.Notification mock
    Object.defineProperty(global, 'Notification', {
      writable: true,
      configurable: true,
      value: mockNotification,
    })

    // Default permission to 'granted' for easier testing
    Object.defineProperty(mockNotification, 'permission', {
      writable: true,
      configurable: true,
      value: 'granted' as NotificationPermission,
    })

    // Mock requestPermission
    ;(mockNotification as any).requestPermission = vi.fn().mockResolvedValue('granted' as NotificationPermission)

    // Reset internal permission state of notificationService
    ;(notificationService as any).permission = 'granted'

    // Reset timers
    vi.clearAllTimers()
  })

  // ============================================================================
  // isSupported
  // ============================================================================

  describe('isSupported', () => {
    it('should return true when Notification API is available', () => {
      expect(notificationService.isSupported()).toBe(true)
    })
  })

  // ============================================================================
  // isGranted
  // ============================================================================

  describe('isGranted', () => {
    it('should return true when permission is granted', () => {
      ;(mockNotification as any).permission = 'granted'

      expect(notificationService.isGranted()).toBe(true)
    })

    it('should return false when permission is denied', () => {
      ;(mockNotification as any).permission = 'denied'

      expect(notificationService.isGranted()).toBe(false)
    })

    it('should return false when permission is default', () => {
      ;(mockNotification as any).permission = 'default'

      expect(notificationService.isGranted()).toBe(false)
    })
  })

  // ============================================================================
  // requestPermission
  // ============================================================================

  describe('requestPermission', () => {
    it('should request permission and return true when granted', async () => {
      ;(mockNotification as any).permission = 'default'
      ;(notificationService as any).permission = 'default'
      ;(mockNotification as any).requestPermission = vi.fn().mockResolvedValue('granted' as NotificationPermission)

      const result = await notificationService.requestPermission()

      expect((mockNotification as any).requestPermission).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should request permission and return false when denied', async () => {
      ;(mockNotification as any).permission = 'default'
      ;(notificationService as any).permission = 'default'
      ;(mockNotification as any).requestPermission = vi.fn().mockResolvedValue('denied' as NotificationPermission)

      const result = await notificationService.requestPermission()

      expect((mockNotification as any).requestPermission).toHaveBeenCalled()
      expect(result).toBe(false)
    })
  })

  // ============================================================================
  // show
  // ============================================================================

  describe('show', () => {
    beforeEach(() => {
      ;(mockNotification as any).permission = 'granted'
    })

    it('should create notification with correct options', async () => {
      const options: NotificationOptions = {
        title: 'Test Title',
        body: 'Test Body',
        icon: '/test-icon.png',
        badge: '/test-badge.png',
        tag: 'test-tag',
        data: { type: 'test' }
      }

      await notificationService.show(options)

      expect(mockNotification).toHaveBeenCalledWith('Test Title', {
        body: 'Test Body',
        icon: '/test-icon.png',
        badge: '/test-badge.png',
        tag: 'test-tag',
        data: { type: 'test' },
        requireInteraction: false,
        silent: false,
      })
    })

    it('should use default icon and badge when not provided', async () => {
      const options: NotificationOptions = {
        title: 'Test',
        body: 'Body',
      }

      await notificationService.show(options)

      expect(mockNotification).toHaveBeenCalledWith('Test', expect.objectContaining({
        icon: '/logo.png',
        badge: '/logo.png',
      }))
    })

    it('should auto close notification after 5 seconds', async () => {
      await notificationService.show({
        title: 'Test',
        body: 'Body',
      })

      expect(mockNotificationInstance.close).not.toHaveBeenCalled()

      // Fast-forward time
      vi.advanceTimersByTime(5000)

      expect(mockNotificationInstance.close).toHaveBeenCalled()
    })

    it('should handle notification click with URL navigation', async () => {
      const originalLocation = window.location
      // Mock window.location.href
      delete (window as Partial<Window>).location
      ;(window as any).location = { href: '' }

      await notificationService.show({
        title: 'Test',
        body: 'Body',
        data: {
          type: 'test',
          url: '/test-url'
        }
      })

      // Simulate click
      mockNotificationInstance.onclick?.call(mockNotificationInstance as any, new Event('click'))

      expect(mockNotificationInstance.close).toHaveBeenCalled()
      expect(window.location.href).toBe('/test-url')

      // Restore
      ;(window as any).location = originalLocation
    })

    it('should handle notification click without URL', async () => {
      await notificationService.show({
        title: 'Test',
        body: 'Body',
      })

      // Simulate click
      mockNotificationInstance.onclick?.call(mockNotificationInstance as any, new Event('click'))

      expect(mockNotificationInstance.close).toHaveBeenCalled()
    })

    it('should request permission if not granted', async () => {
      ;(mockNotification as any).permission = 'default'
      ;(notificationService as any).permission = 'default'
      ;(mockNotification as any).requestPermission = vi.fn().mockResolvedValue('granted' as NotificationPermission)

      await notificationService.show({
        title: 'Test',
        body: 'Body',
      })

      expect((mockNotification as any).requestPermission).toHaveBeenCalled()
      expect(mockNotification).toHaveBeenCalled()
    })

    it('should return early when permission denied after request', async () => {
      ;(mockNotification as any).permission = 'default'
      ;(notificationService as any).permission = 'default'
      ;(mockNotification as any).requestPermission = vi.fn().mockResolvedValue('denied' as NotificationPermission)

      await notificationService.show({
        title: 'Test',
        body: 'Body',
      })

      expect((mockNotification as any).requestPermission).toHaveBeenCalled()
      // Should not create notification (only called 0 times, requestPermission doesn't count)
      expect(mockNotification).toHaveBeenCalledTimes(0)
    })
  })

  // ============================================================================
  // Notification Templates
  // ============================================================================

  describe('notifyNewBooking', () => {
    beforeEach(() => {
      ;(mockNotification as any).permission = 'granted'
    })

    it('should show personal booking notification', async () => {
      await notificationService.notifyNewBooking('John Doe', '10:00 AM', 'booking-123', 'personal')

      expect(mockNotification).toHaveBeenCalledWith('🔔 New Booking!', expect.objectContaining({
        body: 'New booking from John Doe at 10:00 AM',
        tag: 'new-booking-booking-123',
        data: {
          type: 'new_booking',
          bookingId: 'booking-123',
          notificationType: 'personal',
          url: '/staff'
        }
      }))
    })

    it('should show team booking notification', async () => {
      await notificationService.notifyNewBooking('Jane Smith', '2:00 PM', 'booking-456', 'team')

      expect(mockNotification).toHaveBeenCalledWith('👥 New Team Booking!', expect.objectContaining({
        body: 'New team booking from Jane Smith at 2:00 PM',
        tag: 'new-booking-booking-456',
        data: {
          type: 'new_booking',
          bookingId: 'booking-456',
          notificationType: 'team',
          url: '/staff'
        }
      }))
    })

    it('should default to personal notification type', async () => {
      await notificationService.notifyNewBooking('Test User', '3:00 PM', 'booking-789')

      expect(mockNotification).toHaveBeenCalledWith('🔔 New Booking!', expect.anything())
    })
  })

  describe('notifyBookingReminder', () => {
    beforeEach(() => {
      ;(mockNotification as any).permission = 'granted'
    })

    it('should show personal reminder notification', async () => {
      await notificationService.notifyBookingReminder('John Doe', '10:00 AM', 'booking-123', 'personal')

      expect(mockNotification).toHaveBeenCalledWith('⏰ Booking Reminder', expect.objectContaining({
        body: 'Booking with John Doe starts in 30 minutes (10:00 AM)',
        tag: 'reminder-booking-123',
        data: {
          type: 'reminder',
          bookingId: 'booking-123',
          notificationType: 'personal',
          url: '/staff'
        }
      }))
    })

    it('should show team reminder notification', async () => {
      await notificationService.notifyBookingReminder('Jane Smith', '2:00 PM', 'booking-456', 'team')

      expect(mockNotification).toHaveBeenCalledWith('👥 Team Booking Reminder', expect.objectContaining({
        body: 'Team booking with Jane Smith starts in 30 minutes (2:00 PM)',
        tag: 'reminder-booking-456',
        data: {
          type: 'reminder',
          bookingId: 'booking-456',
          notificationType: 'team',
          url: '/staff'
        }
      }))
    })
  })

  describe('notifyBookingCancelled', () => {
    beforeEach(() => {
      ;(mockNotification as any).permission = 'granted'
    })

    it('should show personal cancellation notification', async () => {
      await notificationService.notifyBookingCancelled('John Doe', '10:00 AM', 'personal')

      expect(mockNotification).toHaveBeenCalledWith('❌ Booking Cancelled', expect.objectContaining({
        body: 'Booking with John Doe at 10:00 AM was cancelled',
        tag: 'booking-cancelled',
        data: {
          type: 'cancelled',
          notificationType: 'personal'
        }
      }))
    })

    it('should show team cancellation notification', async () => {
      await notificationService.notifyBookingCancelled('Jane Smith', '2:00 PM', 'team')

      expect(mockNotification).toHaveBeenCalledWith('👥 Team Booking Cancelled', expect.objectContaining({
        body: 'Team booking with Jane Smith at 2:00 PM was cancelled',
        tag: 'booking-cancelled',
        data: {
          type: 'cancelled',
          notificationType: 'team'
        }
      }))
    })
  })

  describe('notifyMessage', () => {
    beforeEach(() => {
      ;(mockNotification as any).permission = 'granted'
    })

    it('should show new message notification', async () => {
      await notificationService.notifyMessage('Alice', 'Hello, how are you?')

      expect(mockNotification).toHaveBeenCalledWith('💬 New message from Alice', expect.objectContaining({
        body: 'Hello, how are you?',
        tag: 'new-message',
        data: {
          type: 'message',
          url: '/staff/chat'
        }
      }))
    })
  })

  describe('notifyPaymentReceived', () => {
    beforeEach(() => {
      ;(mockNotification as any).permission = 'granted'
    })

    it('should show payment received notification', async () => {
      await notificationService.notifyPaymentReceived('John Doe', 5000, 'booking-123')

      expect(mockNotification).toHaveBeenCalledWith('💰 Payment Received', expect.objectContaining({
        body: 'Payment received from John Doe: ฿5,000',
        tag: 'payment-booking-123',
        data: {
          type: 'payment_received',
          bookingId: 'booking-123',
          url: '/admin/bookings'
        }
      }))
    })

    it('should format large payment amount correctly', async () => {
      await notificationService.notifyPaymentReceived('Company XYZ', 123456, 'booking-999')

      expect(mockNotification).toHaveBeenCalledWith('💰 Payment Received', expect.objectContaining({
        body: 'Payment received from Company XYZ: ฿123,456',
      }))
    })
  })
})
