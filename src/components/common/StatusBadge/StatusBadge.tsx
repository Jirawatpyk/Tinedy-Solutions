import { cva, type VariantProps } from 'class-variance-authority'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusBadgeVariants = cva(
  'text-xs',
  {
    variants: {
      variant: {
        default: 'bg-tinedy-off-white text-tinedy-dark border-tinedy-dark/20',
        success: 'bg-green-100 text-green-700 border-green-300',
        warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        danger: 'bg-red-50 text-red-700 border-red-300',
        info: 'bg-blue-100 text-blue-700 border-blue-300',
        purple: 'bg-purple-100 text-purple-700 border-purple-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

/**
 * StatusBadge - Reusable status indicator component
 *
 * Displays status with color-coded badges for booking status, payment status, etc.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <StatusBadge variant="success">Completed</StatusBadge>
 *
 * // With helper function
 * <StatusBadge variant={getBookingStatusVariant(booking.status)}>
 *   {booking.status}
 * </StatusBadge>
 * ```
 */
export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  /**
   * Content to display in the badge
   */
  children: React.ReactNode
}

export const StatusBadge = ({
  variant,
  className,
  children,
  ...props
}: StatusBadgeProps) => {
  return (
    <Badge
      className={cn(statusBadgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </Badge>
  )
}

StatusBadge.displayName = 'StatusBadge'
