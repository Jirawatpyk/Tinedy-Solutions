import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface FloatingActionButtonProps {
  onRefresh: () => void
  isRefreshing?: boolean
}

export const FloatingActionButton = memo(function FloatingActionButton({
  onRefresh,
  isRefreshing = false
}: FloatingActionButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Main FAB - Direct Refresh */}
      <Button
        onClick={onRefresh}
        size="icon"
        disabled={isRefreshing}
        className="h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 transition-all duration-200 disabled:opacity-50"
      >
        <RefreshCw className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  )
})
