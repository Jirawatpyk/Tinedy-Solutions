/**
 * PageHeader Component
 *
 * Unified header pattern for Staff Portal pages:
 * - Consistent title styling
 * - Optional subtitle
 * - Actions slot for buttons/icons
 * - Sticky with backdrop blur
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  /** Page title (required) */
  title: string
  /** Optional subtitle below title */
  subtitle?: string
  /** Optional actions slot (buttons, icons) */
  actions?: ReactNode
  /** Additional className for container */
  className?: string
  /** Hide on desktop - defaults to true (hidden on lg:) */
  hideOnDesktop?: boolean
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
  hideOnDesktop = true,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b',
        hideOnDesktop && 'lg:hidden',
        className
      )}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-foreground truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
