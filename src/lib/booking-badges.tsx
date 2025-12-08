import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/common/StatusBadge'
import { getPaymentStatusVariant, getPaymentStatusLabel } from '@/lib/status-utils'
// Re-export from centralized utilities for backwards compatibility
export { getAvailableStatuses, getStatusLabel } from '@/lib/booking-utils'

// Status Configuration
interface StatusConfig {
  className: string
  label: string
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  pending: {
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    label: 'Pending',
  },
  confirmed: {
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'Confirmed',
  },
  in_progress: {
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    label: 'In Progress',
  },
  completed: {
    className: 'bg-green-100 text-green-800 border-green-200',
    label: 'Completed',
  },
  cancelled: {
    className: 'bg-red-100 text-red-800 border-red-200',
    label: 'Cancelled',
  },
  no_show: {
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    label: 'No Show',
  },
}

const DEFAULT_STATUS_CONFIG: StatusConfig = {
  className: 'bg-gray-100 text-gray-800 border-gray-200',
  label: 'Unknown',
}

/**
 * Get status configuration for a booking status
 */
export function getStatusConfig(status: string): StatusConfig {
  return STATUS_CONFIGS[status] || DEFAULT_STATUS_CONFIG
}

/**
 * Get Badge component for booking status
 */
export function getStatusBadge(status: string): JSX.Element {
  const config = getStatusConfig(status)
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

/**
 * Get Badge component for payment status
 */
export function getPaymentStatusBadge(status?: string): JSX.Element {
  const paymentStatus = status || 'unpaid'
  return (
    <StatusBadge variant={getPaymentStatusVariant(paymentStatus)}>
      {getPaymentStatusLabel(paymentStatus)}
    </StatusBadge>
  )
}

// getAvailableStatuses and getStatusLabel are re-exported from @/lib/booking-utils at the top of this file
