import { Badge } from '@/components/ui/badge'

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
  switch (status) {
    case 'paid':
      return <Badge className="bg-green-100 text-green-700 border-green-300">Paid</Badge>
    case 'pending_verification':
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Verifying</Badge>
    case 'partial':
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Partial</Badge>
    case 'refunded':
      return <Badge className="bg-purple-100 text-purple-700 border-purple-300">Refunded</Badge>
    default:
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
          Unpaid
        </Badge>
      )
  }
}

/**
 * Get available status transitions for a current status
 */
export function getAvailableStatuses(currentStatus: string): string[] {
  const transitions: Record<string, string[]> = {
    pending: ['pending', 'confirmed', 'cancelled'],
    confirmed: ['confirmed', 'in_progress', 'cancelled', 'no_show'],
    in_progress: ['in_progress', 'completed', 'cancelled'],
    completed: ['completed'],
    cancelled: ['cancelled'],
    no_show: ['no_show'],
  }
  return transitions[currentStatus] || [currentStatus]
}

/**
 * Get human-readable label for a status
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
  }
  return labels[status] || status
}
