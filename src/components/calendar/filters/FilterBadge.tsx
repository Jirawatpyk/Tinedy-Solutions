/**
 * FilterBadge Component
 *
 * Badge component for displaying active filters with:
 * - Label and value display
 * - Remove button (X icon)
 * - Icon support
 * - Color variants
 * - Hover states
 */

import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FilterBadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive'

interface FilterBadgeProps {
  /** Filter label (e.g., "Staff", "Status") */
  label: string
  /** Filter value (e.g., "John Doe", "Confirmed") */
  value: string
  /** Callback when remove button is clicked */
  onRemove: () => void
  /** Optional icon */
  icon?: React.ReactNode
  /** Badge color variant */
  variant?: FilterBadgeVariant
  /** Custom className */
  className?: string
}

const variantStyles: Record<FilterBadgeVariant, string> = {
  default: 'bg-muted text-muted-foreground hover:bg-muted/80',
  primary: 'bg-tinedy-blue/10 text-tinedy-blue hover:bg-tinedy-blue/20',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  success: 'bg-green-100 text-green-800 hover:bg-green-200',
  warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  destructive: 'bg-red-100 text-red-800 hover:bg-red-200',
}

export const FilterBadge: React.FC<FilterBadgeProps> = ({
  label,
  value,
  onRemove,
  icon,
  variant = 'default',
  className,
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
        variantStyles[variant],
        className
      )}
    >
      {/* Icon */}
      {icon && <span className="flex-shrink-0">{icon}</span>}

      {/* Label and Value */}
      <span className="flex items-center gap-1">
        <span className="font-semibold">{label}:</span>
        <span className="truncate max-w-[120px]" title={value}>
          {value}
        </span>
      </span>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className={cn(
          'flex-shrink-0 rounded-full p-0.5 hover:bg-background/50 transition-colors focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-current',
          'ml-1'
        )}
        type="button"
        aria-label={`Remove ${label}: ${value}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

/**
 * FilterBadgeList Component
 *
 * Container for multiple FilterBadge components with:
 * - Responsive flex layout
 * - "Clear All" button
 * - Empty state
 */

interface FilterBadgeListProps {
  /** Child badge components */
  children: React.ReactNode
  /** Show "Clear All" button */
  showClearAll?: boolean
  /** Callback when "Clear All" is clicked */
  onClearAll?: () => void
  /** Custom className */
  className?: string
}

export const FilterBadgeList: React.FC<FilterBadgeListProps> = ({
  children,
  showClearAll = true,
  onClearAll,
  className,
}) => {
  // Count number of badges
  const badgeCount = React.Children.count(children)

  // Don't render if no badges
  if (badgeCount === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {children}

      {/* Clear All Button */}
      {showClearAll && badgeCount > 1 && onClearAll && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground underline transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-tinedy-blue rounded px-1"
          type="button"
        >
          Clear all ({badgeCount})
        </button>
      )}
    </div>
  )
}
