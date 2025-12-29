import type { ReactNode } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

interface SimpleTooltipProps {
  /** Tooltip text content */
  content: string
  /** Child element to trigger tooltip */
  children: ReactNode
  /** Side to show tooltip (default: bottom) */
  side?: TooltipSide
  /** Only show tooltip when this condition is true */
  enabled?: boolean
  /** Additional className for TooltipContent */
  className?: string
}

/**
 * Simple wrapper for Radix Tooltip
 *
 * @example
 * <SimpleTooltip content="Delete item">
 *   <Button><Trash2 /></Button>
 * </SimpleTooltip>
 *
 * @example
 * // Conditional tooltip (e.g., only when sidebar is collapsed)
 * <SimpleTooltip content="Dashboard" enabled={isCollapsed} side="right">
 *   <Link to="/dashboard"><Home /></Link>
 * </SimpleTooltip>
 */
export function SimpleTooltip({
  content,
  children,
  side = 'bottom',
  enabled = true,
  className = '',
}: SimpleTooltipProps) {
  // If not enabled, just render children without tooltip
  if (!enabled) {
    return <>{children}</>
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} className={`text-xs ${className}`}>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
