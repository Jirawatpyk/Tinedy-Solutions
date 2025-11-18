import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatGrowth } from '@/lib/analytics'

// Base props shared by all variants
interface BaseMetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  iconClassName?: string
  valueClassName?: string
  className?: string
}

// Discriminated union for variants
type MetricCardProps =
  | (BaseMetricCardProps & { variant?: 'default' })
  | (BaseMetricCardProps & {
      variant: 'subtitle'
      subtitle: string | React.ReactNode
    })
  | (BaseMetricCardProps & {
      variant: 'trend'
      trend: {
        value: number
        comparisonText: string
      }
    })

export function MetricCard(props: MetricCardProps) {
  const {
    title,
    value,
    icon: Icon,
    iconClassName = 'h-4 w-4 text-tinedy-blue',
    valueClassName = 'text-2xl font-bold text-tinedy-dark',
    className,
  } = props

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={iconClassName} />
      </CardHeader>
      <CardContent className="pb-3">
        <div className={valueClassName}>{value}</div>

        {/* Render variant-specific content */}
        {props.variant === 'subtitle' && (
          <p className="text-xs text-muted-foreground mt-0">{props.subtitle}</p>
        )}

        {props.variant === 'trend' && (
          <div className="flex items-center gap-1 mt-0">
            {props.trend.value >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <p
              className={`text-xs font-medium ${
                props.trend.value >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {formatGrowth(props.trend.value)}
            </p>
            <p className="text-xs text-muted-foreground">
              {props.trend.comparisonText}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
