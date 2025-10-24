import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * EmptyState - Reusable component for displaying empty list states
 *
 * Used to show a consistent empty state UI across the application when
 * lists or data collections are empty. Supports optional icon, actions,
 * and secondary actions.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <EmptyState
 *   title="No bookings found"
 *   description="Create your first booking to get started"
 * />
 *
 * // With icon and action
 * <EmptyState
 *   icon={Calendar}
 *   title="No bookings yet"
 *   description="Start by creating a new booking"
 *   action={{
 *     label: "Create Booking",
 *     onClick: () => setShowCreateModal(true),
 *     icon: Plus
 *   }}
 * />
 *
 * // With primary and secondary actions
 * <EmptyState
 *   icon={Users}
 *   title="No customers found"
 *   description="Add customers to start managing your client base"
 *   action={{
 *     label: "Add Customer",
 *     onClick: handleAddCustomer,
 *     icon: Plus
 *   }}
 *   secondaryAction={{
 *     label: "Import from CSV",
 *     onClick: handleImport
 *   }}
 * />
 * ```
 */
export interface EmptyStateProps {
  /**
   * Optional icon to display at the top of the empty state
   * Should be a Lucide icon component
   */
  icon?: LucideIcon

  /**
   * Main title text for the empty state
   */
  title: string

  /**
   * Optional description text providing more context
   */
  description?: string

  /**
   * Optional primary action button configuration
   */
  action?: {
    /**
     * Button label text
     */
    label: string

    /**
     * Click handler for the action button
     */
    onClick: () => void

    /**
     * Optional icon to display in the action button
     */
    icon?: LucideIcon
  }

  /**
   * Optional secondary action button configuration
   * Rendered as an outline button below the primary action
   */
  secondaryAction?: {
    /**
     * Button label text
     */
    label: string

    /**
     * Click handler for the secondary action button
     */
    onClick: () => void
  }

  /**
   * Optional additional CSS classes to apply to the container
   */
  className?: string
}

/**
 * EmptyState component for displaying empty list states with optional actions
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {/* Icon */}
      {Icon && (
        <div className="mb-4 rounded-full bg-muted p-3">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {action && (
            <Button onClick={action.onClick}>
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

EmptyState.displayName = 'EmptyState'
