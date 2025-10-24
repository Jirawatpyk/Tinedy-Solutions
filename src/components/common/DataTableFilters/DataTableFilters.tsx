import * as React from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Props for the DataTableFilters component
 * @template T - The type of the filters object
 */
export interface DataTableFiltersProps<T extends Record<string, unknown>> {
  /**
   * Current filter values
   */
  filters: T
  /**
   * Callback when a filter value changes
   * @param key - The filter key to update
   * @param value - The new value for the filter
   */
  onFilterChange: (key: keyof T, value: unknown) => void
  /**
   * Callback to reset all filters to their default values
   */
  onReset: () => void
  /**
   * Filter input components (Input, Select, DatePicker, etc.)
   */
  children: React.ReactNode
  /**
   * Optional class name for the root element
   */
  className?: string
  /**
   * Initial collapsed state (defaults to false - expanded)
   */
  defaultCollapsed?: boolean
  /**
   * Optional custom logic to determine if a filter value is active
   * By default, considers non-null, non-undefined, non-empty string values as active
   */
  isFilterActive?: (key: keyof T, value: unknown) => boolean
  /**
   * Optional label for the filter panel
   */
  label?: string
}

/**
 * Default logic to determine if a filter value is considered "active"
 * A filter is active if it has a meaningful value set
 */
const defaultIsFilterActive = (value: unknown): boolean => {
  // Null or undefined = not active
  if (value === null || value === undefined) {
    return false
  }

  // Empty string = not active
  if (typeof value === 'string' && value.trim() === '') {
    return false
  }

  // Empty array = not active
  if (Array.isArray(value) && value.length === 0) {
    return false
  }

  // "all" or similar default values = not active
  if (
    typeof value === 'string' &&
    (value.toLowerCase() === 'all' || value.toLowerCase() === 'default')
  ) {
    return false
  }

  // Otherwise, consider it active
  return true
}

/**
 * DataTableFilters - Generic filter panel component for data tables
 *
 * A reusable filter panel that works with any data type. Provides a collapsible
 * container for filter inputs with features like active filter counting, reset
 * functionality, and responsive grid layout.
 *
 * @example
 * Basic usage:
 * <DataTableFilters filters={filters} onFilterChange={updateFilter} onReset={resetFilters}>
 *   <Input placeholder="Search..." value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
 *   <Select value={filters.status} onValueChange={(val) => updateFilter('status', val)}>
 *     <SelectItem value="all">All Statuses</SelectItem>
 *   </Select>
 * </DataTableFilters>
 *
 * @example
 * With custom active filter detection:
 * <DataTableFilters
 *   filters={filters}
 *   onFilterChange={updateFilter}
 *   onReset={resetFilters}
 *   isFilterActive={(key, value) => key === 'minPrice' ? value > 0 : value !== null}
 * >
 *   Filter inputs here
 * </DataTableFilters>
 */
export function DataTableFilters<T extends Record<string, unknown>>({
  filters,
  onFilterChange: _onFilterChange,
  onReset,
  children,
  className,
  defaultCollapsed = false,
  isFilterActive = defaultIsFilterActive,
  label = 'Filters',
}: DataTableFiltersProps<T>) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

  /**
   * Count how many filters are currently active
   * Uses the custom isFilterActive function if provided, otherwise uses default logic
   */
  const activeFilterCount = React.useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      // Use custom logic if provided
      if (isFilterActive !== defaultIsFilterActive) {
        return isFilterActive(key as keyof T, value)
      }
      // Otherwise use default logic
      return defaultIsFilterActive(value)
    }).length
  }, [filters, isFilterActive])

  /**
   * Toggle collapse/expand state
   */
  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev)
  }

  /**
   * Handle reset button click
   * Calls the onReset callback to clear all filters
   */
  const handleReset = () => {
    onReset()
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{label}</h3>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount} active
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 px-2 text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                Clear all
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              className="h-8 w-8"
              aria-label={isCollapsed ? 'Expand filters' : 'Collapse filters'}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {children}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

DataTableFilters.displayName = 'DataTableFilters'
