/**
 * Breadcrumbs Component
 *
 * Displays navigation breadcrumb trail for current page.
 */

import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbsProps {
  /** Array of breadcrumb labels */
  items: string[]
  /** Optional className */
  className?: string
  /** Separator icon (default: ChevronRight) */
  separator?: React.ReactNode
  /** Max items to show before collapsing (default: no limit) */
  maxItems?: number
}

/**
 * Breadcrumbs navigation component
 *
 * @example
 * ```tsx
 * <Breadcrumbs items={['Dashboard', 'Customers', 'John Doe']} />
 * ```
 */
export function Breadcrumbs({
  items,
  className,
  separator,
  maxItems,
}: BreadcrumbsProps) {
  // Filter out empty items
  const filteredItems = items.filter(Boolean)

  if (filteredItems.length === 0) {
    return null
  }

  // Handle maxItems (collapse middle items)
  let displayItems = filteredItems
  if (maxItems && filteredItems.length > maxItems) {
    const firstItems = filteredItems.slice(0, Math.floor(maxItems / 2))
    const lastItems = filteredItems.slice(-Math.ceil(maxItems / 2))
    displayItems = [...firstItems, '...', ...lastItems]
  }

  const defaultSeparator = <ChevronRight className="h-4 w-4" />

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-1 text-sm', className)}
    >
      <ol className="flex items-center space-x-1">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1
          const isEllipsis = item === '...'

          return (
            <li key={`${item}-${index}`} className="flex items-center space-x-1">
              {/* Breadcrumb item */}
              <span
                className={cn(
                  'font-medium transition-colors',
                  isLast
                    ? 'text-foreground'
                    : isEllipsis
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                {item}
              </span>

              {/* Separator */}
              {!isLast && (
                <span className="text-muted-foreground" aria-hidden="true">
                  {separator || defaultSeparator}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * Compact breadcrumbs variant for mobile
 *
 * Shows only last 2 items on small screens
 *
 * @example
 * ```tsx
 * <Breadcrumbs.Compact items={breadcrumbs} />
 * ```
 */
Breadcrumbs.Compact = function BreadcrumbsCompact({
  items,
  className,
}: Pick<BreadcrumbsProps, 'items' | 'className'>) {
  const filteredItems = items.filter(Boolean)

  if (filteredItems.length === 0) {
    return null
  }

  // Show only last 2 items
  const displayItems =
    filteredItems.length > 2
      ? ['...', ...filteredItems.slice(-2)]
      : filteredItems

  return (
    <Breadcrumbs
      items={displayItems}
      className={cn('md:hidden', className)}
    />
  )
}

/**
 * Responsive breadcrumbs component
 *
 * Shows compact version on mobile, full on desktop
 *
 * @example
 * ```tsx
 * <Breadcrumbs.Responsive items={breadcrumbs} />
 * ```
 */
Breadcrumbs.Responsive = function BreadcrumbsResponsive({
  items,
  className,
  ...props
}: BreadcrumbsProps) {
  return (
    <>
      {/* Mobile: Compact */}
      <Breadcrumbs.Compact items={items} className={className} />

      {/* Desktop: Full */}
      <Breadcrumbs
        {...props}
        items={items}
        className={cn('hidden md:flex', className)}
      />
    </>
  )
}
