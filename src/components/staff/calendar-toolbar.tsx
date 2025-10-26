import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'

interface CalendarToolbarProps {
  date: Date
  view: string
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
  onView: (view: 'month' | 'week' | 'day') => void
}

export function CalendarToolbar({ date, view, onNavigate, onView }: CalendarToolbarProps) {
  const getDateLabel = () => {
    if (view === 'month') {
      return format(date, 'MMMM yyyy', { locale: enUS })
    } else if (view === 'week') {
      return format(date, 'MMMM yyyy', { locale: enUS })
    } else {
      return format(date, 'dd MMMM yyyy', { locale: enUS })
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4 p-4 bg-white rounded-lg border">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('PREV')}
          className="h-9 w-9 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('TODAY')}
          className="min-w-[80px]"
        >
          <CalendarIcon className="h-4 w-4 mr-1" />
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('NEXT')}
          className="h-9 w-9 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Date Display */}
      <div className="text-lg font-semibold text-center flex-1">
        {getDateLabel()}
      </div>

      {/* View Switcher */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        <Button
          variant={view === 'month' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onView('month')}
          className="h-8"
        >
          Month
        </Button>
        <Button
          variant={view === 'week' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onView('week')}
          className="h-8"
        >
          Week
        </Button>
        <Button
          variant={view === 'day' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onView('day')}
          className="h-8"
        >
          Day
        </Button>
      </div>
    </div>
  )
}
