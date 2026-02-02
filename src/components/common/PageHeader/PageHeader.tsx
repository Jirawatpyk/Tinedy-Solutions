import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  /** Page title - rendered as h1 */
  title: string
  /** Optional subtitle description */
  subtitle?: string
  /** Optional back navigation href (for detail pages) */
  backHref?: string
  /** Optional action buttons slot (renders top-right) */
  actions?: React.ReactNode
  /** Optional className override */
  className?: string
}

export function PageHeader({ title, subtitle, backHref, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", className)}>
      <div className="flex items-center gap-4 min-w-0">
        {backHref && (
          <Link
            to={backHref}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "flex-shrink-0")}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-tinedy-dark truncate">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1 line-clamp-2">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
