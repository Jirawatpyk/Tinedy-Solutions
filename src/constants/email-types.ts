/**
 * Email type constants — centralized to prevent magic string drift
 * between client components and Edge Functions.
 */
export const EMAIL_TYPES = {
  BOOKING_REMINDER: 'booking_reminder',
  BOOKING_CONFIRMATION: 'booking_confirmation',
  RECURRING_BOOKING_CONFIRMATION: 'recurring_booking_confirmation',
  PAYMENT_CONFIRMATION: 'payment_confirmation',
  REFUND_CONFIRMATION: 'refund_confirmation',
} as const

export type EmailType = (typeof EMAIL_TYPES)[keyof typeof EMAIL_TYPES]
