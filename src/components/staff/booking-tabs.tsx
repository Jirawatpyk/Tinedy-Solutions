/**
 * BookingTabs Component
 *
 * Pill-style tabs for Staff Dashboard:
 * - Always show label (no icon-only mode)
 * - Full width, equal spacing
 * - 44px touch target minimum
 * - Count badge next to label
 */

import { memo } from 'react'
import { cn } from '@/lib/utils'

export type TabValue = 'today' | 'upcoming' | 'past'

interface Tab {
  value: TabValue
  label: string
  count?: number
}

interface BookingTabsProps {
  activeTab: TabValue
  onTabChange: (tab: TabValue) => void
  todayCount?: number
  upcomingCount?: number
  pastCount?: number
}

export const BookingTabs = memo(function BookingTabs({
  activeTab,
  onTabChange,
  todayCount,
  upcomingCount,
  pastCount,
}: BookingTabsProps) {
  const tabs: Tab[] = [
    { value: 'today', label: 'Today', count: todayCount },
    { value: 'upcoming', label: 'Upcoming', count: upcomingCount },
    { value: 'past', label: 'Past', count: pastCount },
  ]

  return (
    <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-10">
      <div className="px-2 py-2">
        <div className="flex gap-2 p-1 bg-muted/30 rounded-xl">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] rounded-full font-medium text-sm transition-all duration-200 active:scale-[0.97]',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
                aria-pressed={isActive}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold',
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
})
