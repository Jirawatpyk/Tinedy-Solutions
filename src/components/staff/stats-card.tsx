import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { type LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export const StatsCard = memo(function StatsCard({ title, value, icon: Icon, description, trend, className = '' }: StatsCardProps) {
  return (
    <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 active:scale-[0.98] cursor-pointer border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm ${className}`}>
      {/* Modern gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardContent className="relative p-2.5 tablet-landscape:p-2 sm:p-4 lg:p-6">
        <div className="flex items-center sm:items-start justify-between gap-2 tablet-landscape:gap-1 sm:gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] tablet-landscape:text-[8px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 tablet-landscape:mb-0.5 sm:mb-2 truncate">{title}</p>
            <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
              <h3 className="text-lg tablet-landscape:text-sm sm:text-2xl lg:text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {value}
              </h3>
              {trend && (
                <span
                  className={`inline-flex items-center px-1 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-semibold ${
                    trend.isPositive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {description && (
              <p className="mt-0.5 sm:mt-1.5 text-[9px] tablet-landscape:hidden sm:text-xs text-muted-foreground line-clamp-1">{description}</p>
            )}
          </div>

          {/* Modern icon with gradient */}
          <div className="shrink-0">
            <div className="relative rounded-lg sm:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-1.5 tablet-landscape:p-1 sm:p-3 group-hover:scale-110 transition-transform duration-300">
              <div className="absolute inset-0 rounded-lg sm:rounded-2xl bg-primary/10 blur-xl group-hover:bg-primary/20 transition-colors duration-300" />
              <Icon className="relative h-4 w-4 tablet-landscape:h-4 tablet-landscape:w-4 sm:h-7 sm:w-7 text-primary drop-shadow-lg" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
