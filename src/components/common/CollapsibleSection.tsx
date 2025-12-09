import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

/**
 * CollapsibleSection Component
 *
 * แสดง section ที่สามารถเปิด/ปิดได้บนมือถือ
 * และแสดงแบบปกติ (ไม่มี collapse) บน desktop
 *
 * @param title - หัวข้อของ section (รองรับ React Node สำหรับ icon + text)
 * @param children - เนื้อหาภายใน section
 * @param defaultOpen - เปิดโดยdefault หรือไม่ (default: true)
 * @param className - Additional CSS classes
 */
export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn('space-y-3 border-b pb-4', className)}>
      {/* Mobile: Clickable header with chevron */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between md:cursor-default md:pointer-events-none"
        aria-expanded={isOpen}
      >
        {/* Title */}
        {typeof title === 'string' ? (
          <h3 className="font-semibold text-lg">{title}</h3>
        ) : (
          title
        )}

        {/* Chevron - Show only on mobile */}
        <ChevronDown
          className={cn(
            'h-5 w-5 text-muted-foreground transition-transform md:hidden',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Content */}
      <div
        className={cn(
          // Mobile: Collapsible with animation
          // Use overflow-visible when open to show focus rings, overflow-hidden when closed for animation
          'md:block transition-all duration-200',
          isOpen ? 'max-h-[2000px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'
        )}
      >
        {children}
      </div>
    </div>
  )
}
