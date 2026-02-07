import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * StatCard - Reusable statistics display component
 *
 * Displays metrics with optional icons, trend indicators, and action buttons.
 * Commonly used in dashboard views to show key performance indicators.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <StatCard
 *   title="Total Revenue"
 *   value="$12,345"
 *   description="From completed bookings"
 * />
 *
 * // With icon and trend (manual direction)
 * <StatCard
 *   title="Total Bookings"
 *   value={150}
 *   icon={Calendar}
 *   iconColor="text-blue-600"
 *   trend={{ value: "+12%", direction: "up", label: "from last month" }}
 * />
 *
 * // With trend percentage (auto direction based on value)
 * <StatCard
 *   title="This Month"
 *   value="฿12,345"
 *   icon={Calendar}
 *   trendValue={15.5}
 *   trendLabel="vs last month"
 * />
 *
 * // With action button
 * <StatCard
 *   title="Pending"
 *   value={5}
 *   description="Awaiting confirmation"
 *   action={{ label: "View all", onClick: () => navigate('/bookings') }}
 * />
 *
 * // Loading state
 * <StatCard
 *   title="Total Customers"
 *   value={0}
 *   isLoading={true}
 * />
 * ```
 */
export interface StatCardProps {
  /**
   * The title/label of the statistic
   */
  title: string

  /**
   * The main value to display (can be string or number)
   */
  value: string | number

  /**
   * Optional description text below the value
   */
  description?: string

  /**
   * Optional Lucide icon component to display
   */
  icon?: LucideIcon

  /**
   * Tailwind text color class for the icon (e.g., 'text-primary', 'text-blue-600')
   * @default 'text-muted-foreground'
   */
  iconColor?: string

  /**
   * Tailwind background color class for the icon container (e.g., 'bg-primary/10', 'bg-blue-100')
   * @default undefined
   */
  iconBgColor?: string

  /**
   * Optional trend indicator with value, direction, and label (manual control)
   */
  trend?: {
    /**
     * The trend value to display (e.g., '+12%', '-5%')
     */
    value: string
    /**
     * Direction of the trend
     */
    direction: 'up' | 'down' | 'neutral'
    /**
     * Optional label to display with the trend (e.g., 'from last month')
     */
    label?: string
  }

  /**
   * Trend value as number - direction is auto-calculated (positive = up, negative = down)
   * Use this for simple percentage trends instead of the trend object
   */
  trendValue?: number

  /**
   * Label for trendValue (e.g., 'vs last month', 'vs last week')
   */
  trendLabel?: string

  /**
   * Optional action button
   */
  action?: {
    /**
     * Button label text
     */
    label: string
    /**
     * Click handler for the button
     */
    onClick: () => void
  }

  /**
   * Whether the component is in loading state
   * @default false
   */
  isLoading?: boolean

  /**
   * Additional CSS class for the Card container
   */
  className?: string

  /**
   * Additional CSS class for the value text
   */
  valueClassName?: string
}

/**
 * Format growth percentage with sign
 */
const formatGrowth = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '0.0%'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

/**
 * Get trend color based on direction - extracted for performance
 */
const getTrendColor = (direction: 'up' | 'down' | 'neutral'): string => {
  switch (direction) {
    case 'up':
      return 'text-green-500'
    case 'down':
      return 'text-red-500'
    case 'neutral':
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get trend icon based on direction - extracted for performance
 */
const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
  switch (direction) {
    case 'up':
      return TrendingUp
    case 'down':
      return TrendingDown
    case 'neutral':
    default:
      return null
  }
}

/**
 * StatCard Component
 *
 * A versatile card component for displaying statistics and metrics.
 * Supports icons, trend indicators, actions, and loading states.
 */
export const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  trend,
  trendValue,
  trendLabel,
  action,
  isLoading = false,
  className,
  valueClassName,
}: StatCardProps) => {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 sm:pt-3 px-3 sm:px-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent className="pb-2 sm:pb-3 px-3 sm:px-6">
          <Skeleton className="h-8 w-20 mb-0" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  // Handle trendValue (auto-direction) or trend object (manual direction)
  const hasTrend = trend || trendValue !== undefined
  const trendDirection: 'up' | 'down' | 'neutral' = trend
    ? trend.direction
    : trendValue !== undefined
      ? trendValue >= 0 ? 'up' : 'down'
      : 'neutral'
  const trendDisplayValue = trend
    ? trend.value
    : trendValue !== undefined
      ? formatGrowth(trendValue)
      : ''
  const trendDisplayLabel = trend?.label || trendLabel

  const TrendIcon = hasTrend ? getTrendIcon(trendDirection) : null

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 sm:pt-3 px-3 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', iconColor)} />
        )}
      </CardHeader>
      <CardContent className="pb-2 sm:pb-3 px-3 sm:px-6">
        <div className={cn('text-xl sm:text-2xl font-bold', valueClassName)}>{value}</div>

        {/* Description or Trend */}
        <div className="mt-0 flex items-center justify-between">
          {description && !hasTrend && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}

          {hasTrend && (
            <div className="flex items-center gap-1 mt-0">
              {TrendIcon && <TrendIcon className={cn('h-3 w-3', getTrendColor(trendDirection))} />}
              <p className={cn('text-xs font-medium', getTrendColor(trendDirection))}>
                {trendDisplayValue}
              </p>
              {trendDisplayLabel && (
                <p className="text-xs text-muted-foreground hidden sm:inline">
                  {trendDisplayLabel}
                </p>
              )}
            </div>
          )}

          {description && hasTrend && (
            <p className="text-xs text-muted-foreground hidden sm:block">{description}</p>
          )}
        </div>

        {/* Action Button */}
        {action && (
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className="w-full"
            >
              {action.label}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

StatCard.displayName = 'StatCard'
