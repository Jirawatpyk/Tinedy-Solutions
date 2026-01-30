/**
 * Responsive Sheet Component
 *
 * Sheet that adapts its position based on screen size:
 * - Mobile (<1024px): Slides from bottom
 * - Desktop (≥1024px): Slides from right
 *
 * Auto-closes when crossing the breakpoint to prevent animation glitches.
 */

import { useEffect, useRef } from 'react'
import { useMediaQuery, MEDIA_QUERIES } from '@/hooks/use-media-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { cn } from '@/lib/utils'

interface ResponsiveSheetProps {
  /** Whether the sheet is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Sheet content */
  children: React.ReactNode
  /** Sheet title (for accessibility) */
  title?: string
  /** Sheet description (for accessibility) */
  description?: string
  /** Icon to display before title */
  icon?: React.ReactNode
  /** Mobile height class, default: h-[85vh] */
  mobileHeight?: string
  /** Desktop width class, default: w-[540px] */
  desktopWidth?: string
  /** Additional className for SheetContent */
  className?: string
  /** Data-testid for testing */
  'data-testid'?: string
}

export function ResponsiveSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  icon,
  mobileHeight = 'h-[85vh]',
  desktopWidth = 'w-[540px]',
  className,
  'data-testid': testId,
}: ResponsiveSheetProps) {
  const isMobile = useMediaQuery(MEDIA_QUERIES.mobile)
  const prevIsMobile = useRef(isMobile)

  // Close sheet when crossing breakpoint to avoid animation glitches
  useEffect(() => {
    if (open && prevIsMobile.current !== isMobile) {
      onOpenChange(false)
    }
    prevIsMobile.current = isMobile
  }, [isMobile, open, onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          'flex flex-col p-0',
          isMobile ? `${mobileHeight} rounded-t-xl` : desktopWidth,
          className
        )}
        data-testid={testId}
      >
        {/* Drag handle for mobile */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-12 h-1.5 bg-muted rounded-full" />
          </div>
        )}
        {(title || description) && (
          <SheetHeader className={cn('px-6 pb-4 flex-shrink-0', !isMobile && 'pt-6', isMobile && 'text-center')}>
            {title && (
              <SheetTitle className={cn(icon && 'flex items-center gap-2', isMobile && 'justify-center')}>
                {icon}
                {title}
              </SheetTitle>
            )}
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ErrorBoundary
            fallback={
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <div>
                  <p className="text-destructive font-medium">Something went wrong</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please close and try again
                  </p>
                </div>
              </div>
            }
          >
            {children}
          </ErrorBoundary>
        </div>
      </SheetContent>
    </Sheet>
  )
}
