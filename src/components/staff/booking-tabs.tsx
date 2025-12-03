import { memo } from 'react'
import { Calendar, Briefcase, CheckCircle, BarChart3 } from 'lucide-react'

export type TabValue = 'today' | 'upcoming' | 'past' | 'stats'

interface Tab {
  value: TabValue
  label: string
  icon: React.ComponentType<{ className?: string }>
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
    { value: 'today', label: 'Today', icon: Calendar, count: todayCount },
    { value: 'upcoming', label: 'Upcoming', icon: Briefcase, count: upcomingCount },
    { value: 'past', label: 'Past', icon: CheckCircle, count: pastCount },
    { value: 'stats', label: 'Stats', icon: BarChart3 },
  ]

  return (
    <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-[73px] tablet-landscape:top-[65px] sm:top-[89px] z-10 shadow-sm">
      <div className="px-2 tablet-landscape:px-4 sm:px-4">
        <div className="flex gap-0.5 tablet-landscape:gap-2 sm:gap-1 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.value

            return (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={`
                  group relative flex items-center gap-1 tablet-landscape:gap-2 sm:gap-2 px-2 tablet-landscape:px-4 sm:px-4 py-2 tablet-landscape:py-3 sm:py-3.5
                  font-medium text-xs tablet-landscape:text-sm sm:text-base whitespace-nowrap
                  transition-all duration-200 active:scale-95
                  ${isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <Icon className={`h-3.5 w-3.5 tablet-landscape:h-4 tablet-landscape:w-4 sm:h-5 sm:w-5 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <span className="hidden xs:inline tablet-landscape:inline">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`
                      inline-flex items-center justify-center min-w-[16px] tablet-landscape:min-w-[18px] sm:min-w-[20px] h-4 tablet-landscape:h-5 sm:h-5 px-1 sm:px-1.5
                      rounded-full text-[10px] tablet-landscape:text-xs sm:text-xs font-semibold
                      ${isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                      }
                    `}
                  >
                    {tab.count}
                  </span>
                )}

                {/* Active indicator */}
                <div
                  className={`
                    absolute bottom-0 left-0 right-0 h-0.5 bg-primary
                    transition-all duration-200
                    ${isActive ? 'opacity-100' : 'opacity-0'}
                  `}
                />
              </button>
            )
          })}
        </div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
})
