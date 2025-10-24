export { StatusBadge, type StatusBadgeProps } from './StatusBadge'

// Re-export helper functions from status-utils
export {
  getBookingStatusVariant,
  getPaymentStatusVariant,
  getBookingStatusLabel,
  getPaymentStatusLabel,
} from '@/lib/status-utils'
