/**
 * SettingsListItem Component
 *
 * Reusable list row with icon, label, and chevron arrow:
 * - Used in Profile page settings section
 * - onClick to open Sheet/Modal
 */

import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsListItemProps {
  icon: LucideIcon
  label: string
  description?: string
  onClick: () => void
  className?: string
}

export function SettingsListItem({
  icon: Icon,
  label,
  description,
  onClick,
  className,
}: SettingsListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground flex-shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
    </button>
  )
}
