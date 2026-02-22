/**
 * Email type constants — centralized to prevent magic string drift
 * between client components and Edge Functions.
 */
export const EMAIL_TYPES = {
  BOOKING_REMINDER: 'booking_reminder',
  BOOKING_CONFIRMATION: 'booking_confirmation',
  PAYMENT_LINK: 'payment_link',
  PAYMENT_CONFIRMATION: 'payment_confirmation',
  PAYMENT_REMINDER: 'payment_reminder',
  BOOKING_RESCHEDULED: 'booking_rescheduled',
} as const

export type EmailType = (typeof EMAIL_TYPES)[keyof typeof EMAIL_TYPES]
