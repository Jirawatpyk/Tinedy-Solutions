/**
 * FilterSearchBar Component
 *
 * Debounced search input with:
 * - Search icon
 * - Clear button (when has value)
 * - Placeholder text
 * - Debounced onChange (300ms)
 * - Responsive sizing
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FilterSearchBarProps {
  /** Current search query value */
  value: string
  /** Callback when search query changes (debounced) */
  onChange: (query: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Debounce delay in milliseconds */
  debounceMs?: number
  /** Disabled state */
  disabled?: boolean
  /** Custom className */
  className?: string
}

const FilterSearchBarComponent: React.FC<FilterSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search bookings...',
  debounceMs = 300,
  disabled = false,
  className,
}) => {
  // Local state for immediate UI updates
  const [localValue, setLocalValue] = useState(value)

  // Sync local value with prop value when it changes externally
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounced onChange callback
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, debounceMs)

    return () => clearTimeout(handler)
  }, [localValue, value, onChange, debounceMs])

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }

  // Handle clear
  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
  }, [onChange])

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear()
      e.currentTarget.blur()
    }
  }

  return (
    <div className={cn('relative', className)}>
      {/* Search Icon */}
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

      {/* Input */}
      <Input
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'pl-9',
          localValue && 'pr-9' // Add padding for clear button when has value
        )}
      />

      {/* Clear Button */}
      {localValue && !disabled && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
          type="button"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  )
}

// Memoize component to prevent re-renders when props haven't changed
// This fixes the issue where input loses focus during typing
export const FilterSearchBar = React.memo(FilterSearchBarComponent)
