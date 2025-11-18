import React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'

export interface CollapsibleSectionProps {
  /**
   * หัวข้อของ section
   */
  title: string

  /**
   * Icon ที่แสดงข้างหัวข้อ (optional)
   */
  icon?: React.ReactNode

  /**
   * เนื้อหาภายใน section
   */
  children: React.ReactNode

  /**
   * สถานะการเปิด/ปิด
   */
  isOpen: boolean

  /**
   * Callback เมื่อกดปุ่ม toggle
   */
  onToggle: () => void

  /**
   * CSS className เพิ่มเติม (optional)
   */
  className?: string

  /**
   * CSS className สำหรับ content (optional)
   */
  contentClassName?: string

  /**
   * ซ่อนปุ่ม toggle (default = false)
   */
  hideToggle?: boolean

  /**
   * ขนาดของหัวข้อ (default = 'default')
   */
  titleSize?: 'sm' | 'default' | 'lg'
}

/**
 * CollapsibleSection Component
 *
 * Component สำหรับสร้าง section ที่พับเก็บได้ พร้อม header และ toggle button
 * ใช้สำหรับ Stats Cards และ Filters
 *
 * @example
 * ```tsx
 * const [isOpen, toggle] = useCollapsible('dashboard-stats')
 *
 * <CollapsibleSection
 *   title="Statistics"
 *   icon={<BarChart3 className="h-5 w-5" />}
 *   isOpen={isOpen}
 *   onToggle={toggle}
 * >
 *   <div className="grid gap-4 md:grid-cols-4">
 *     {statsCards}
 *   </div>
 * </CollapsibleSection>
 * ```
 */
export function CollapsibleSection({
  title,
  icon,
  children,
  isOpen,
  onToggle,
  className,
  contentClassName,
  hideToggle = false,
  titleSize = 'default',
}: CollapsibleSectionProps) {
  const titleSizeClasses = {
    sm: 'text-sm font-medium',
    default: 'text-base font-semibold',
    lg: 'text-lg font-bold',
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle} className={cn('w-full', className)}>
      <div className="flex items-center justify-between py-2 px-1">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h3 className={cn('text-tinedy-dark', titleSizeClasses[titleSize])}>
            {title}
          </h3>
        </div>

        {!hideToggle && (
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-tinedy-dark"
            >
              <span className="sr-only">Toggle {title}</span>
              {isOpen ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  <span className="text-xs">ซ่อน</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  <span className="text-xs">แสดง</span>
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        )}
      </div>

      <CollapsibleContent
        className={cn(
          'transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
          contentClassName
        )}
      >
        <div className="pt-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
