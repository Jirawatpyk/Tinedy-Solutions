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
 * // With icon and trend
 * <StatCard
 *   title="Total Bookings"
 *   value={150}
 *   icon={Calendar}
 *   iconColor="text-blue-600"
 *   iconBgColor="bg-blue-100"
 *   trend={{ value: "+12%", direction: "up", label: "from last month" }}
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
   * Optional trend indicator with value, direction, and label
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
  iconBgColor,
  trend,
  action,
  isLoading = false,
}: StatCardProps) => {
  // Determine trend color based on direction
  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      case 'neutral':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  // Get trend icon based on direction
  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return TrendingUp
      case 'down':
        return TrendingDown
      case 'neutral':
        return null
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  const TrendIcon = trend ? getTrendIcon(trend.direction) : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && (
          <div
            className={cn(
              'rounded-full p-2',
              iconBgColor
            )}
          >
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>

        {/* Description or Trend */}
        <div className="mt-1 flex items-center justify-between">
          {description && !trend && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}

          {trend && (
            <div className="flex items-center gap-4 w-full">
              {description && (
                <p className="text-xs text-muted-foreground flex-1">{description}</p>
              )}
              <div
                className={cn(
                  'flex items-center gap-1 text-xs font-semibold',
                  getTrendColor(trend.direction)
                )}
              >
                {TrendIcon && <TrendIcon className="h-3 w-3" />}
                <span>{trend.value}</span>
                {trend.label && (
                  <span className="font-normal text-muted-foreground ml-1">
                    {trend.label}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        {action && (
          <div className="mt-4">
            <Button
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
