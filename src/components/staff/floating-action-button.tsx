import { memo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Filter, Search, X } from 'lucide-react'

interface FloatingActionButtonProps {
  onRefresh: () => void
  onFilter?: () => void
  onSearch?: () => void
  isRefreshing?: boolean
}

export const FloatingActionButton = memo(function FloatingActionButton({
  onRefresh,
  onFilter,
  onSearch,
  isRefreshing = false
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleMainClick = () => {
    if (isExpanded) {
      setIsExpanded(false)
    } else {
      setIsExpanded(true)
    }
  }

  const handleAction = (action: () => void) => {
    action()
    setIsExpanded(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
      {/* Secondary actions */}
      {isExpanded && (
        <>
          {onSearch && (
            <Button
              onClick={() => handleAction(onSearch)}
              size="icon"
              variant="secondary"
              className="h-12 w-12 rounded-full shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-200 bg-white hover:bg-gray-100"
              style={{ animationDelay: '0ms' }}
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          {onFilter && (
            <Button
              onClick={() => handleAction(onFilter)}
              size="icon"
              variant="secondary"
              className="h-12 w-12 rounded-full shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-200 bg-white hover:bg-gray-100"
              style={{ animationDelay: '50ms' }}
            >
              <Filter className="h-5 w-5" />
            </Button>
          )}

          <Button
            onClick={() => handleAction(onRefresh)}
            size="icon"
            variant="secondary"
            className="h-12 w-12 rounded-full shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-200 bg-white hover:bg-gray-100"
            style={{ animationDelay: '100ms' }}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </>
      )}

      {/* Main FAB */}
      <Button
        onClick={handleMainClick}
        size="icon"
        className={`h-14 w-14 rounded-full shadow-2xl transition-all duration-200 ${
          isExpanded ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'
        }`}
      >
        {isExpanded ? (
          <X className="h-6 w-6" />
        ) : (
          <RefreshCw className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
        )}
      </Button>
    </div>
  )
})
