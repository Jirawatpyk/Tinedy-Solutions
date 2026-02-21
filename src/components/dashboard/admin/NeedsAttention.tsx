import { AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, getBangkokNowHHMM, timeToMinutes } from '@/lib/utils'
import type { TodayBooking } from '@/types/dashboard'

export type AttentionFilter = 'pending' | 'unverified' | 'starting_soon'

interface NeedsAttentionProps {
  todayBookings: TodayBooking[]
  onFilterSelect: (filter: AttentionFilter | null) => void
  activeFilter: AttentionFilter | null
}

interface AttentionRow {
  key: AttentionFilter
  label: string
  count: number
  dotClass: string
  hoverClass: string
  activeClass: string
}

export function NeedsAttention({ todayBookings, onFilterSelect, activeFilter }: NeedsAttentionProps) {
  const nowMinutes = timeToMinutes(getBangkokNowHHMM())

  const pendingCount = todayBookings.filter((b) => b.status === 'pending').length
  const unverifiedCount = todayBookings.filter(
    (b) => b.payment_status === 'pending_verification'
  ).length
  const startingSoonCount = todayBookings.filter((b) => {
    const diff = timeToMinutes(b.start_time) - nowMinutes
    return diff > 0 && diff <= 60
  }).length

  const hasAnyIssue = pendingCount > 0 || unverifiedCount > 0 || startingSoonCount > 0

  const rows: AttentionRow[] = [
    {
      key: 'pending',
      label: `${pendingCount} pending booking${pendingCount !== 1 ? 's' : ''}`,
      count: pendingCount,
      dotClass: 'bg-red-500',
      hoverClass: 'hover:bg-red-50',
      activeClass: 'bg-red-50 ring-1 ring-red-200',
    },
    {
      key: 'unverified',
      label: `${unverifiedCount} unverified payment${unverifiedCount !== 1 ? 's' : ''}`,
      count: unverifiedCount,
      dotClass: 'bg-amber-500',
      hoverClass: 'hover:bg-amber-50',
      activeClass: 'bg-amber-50 ring-1 ring-amber-200',
    },
    {
      key: 'starting_soon',
      label: `${startingSoonCount} starting soon`,
      count: startingSoonCount,
      dotClass: 'bg-green-500',
      hoverClass: 'hover:bg-green-50',
      activeClass: 'bg-green-50 ring-1 ring-green-200',
    },
  ]

  const handleClick = (key: AttentionFilter) => {
    onFilterSelect(activeFilter === key ? null : key)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-tinedy-blue" />
          Needs Attention
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!hasAnyIssue ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>All clear!</span>
          </div>
        ) : (
          <div className="space-y-1">
            {rows.map(({ key, label, count, dotClass, hoverClass, activeClass }) => {
              const isActive = activeFilter === key
              return (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors',
                    count === 0
                      ? 'opacity-40 cursor-default'
                      : cn('cursor-pointer', hoverClass),
                    isActive && activeClass
                  )}
                  onClick={() => count > 0 && handleClick(key)}
                  disabled={count === 0}
                >
                  <span className={cn('h-2 w-2 rounded-full flex-shrink-0', dotClass)} />
                  <span className="text-tinedy-dark">{label}</span>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
