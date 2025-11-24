/**
 * FilterMultiSelect Component
 *
 * Reusable multi-select filter component with:
 * - Select All/None functionality with indeterminate state
 * - Scrollable options list
 * - Individual checkboxes for each option
 * - Selected count display
 * - Clear button
 * - Optimized with React.memo
 */

import React, { useMemo } from 'react'
import { Check, X } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

export interface FilterOption {
  value: string
  label: string
  description?: string // Optional description/subtitle
  icon?: React.ReactNode // Optional icon
}

interface FilterMultiSelectProps {
  /** Display label for the filter group */
  label: string
  /** Icon to display next to label */
  icon?: React.ReactNode
  /** Available options to select from */
  options: FilterOption[]
  /** Currently selected values */
  selectedValues: string[]
  /** Callback when selection changes (required if onToggle not provided) */
  onChange?: (values: string[]) => void
  /** Callback when a single item is toggled (required if onChange not provided) */
  onToggle?: (value: string) => void
  /** Placeholder text when no options available */
  emptyText?: string
  /** Maximum height for scrollable area (default: 200px) */
  maxHeight?: number
  /** Show "Select All" checkbox */
  showSelectAll?: boolean
  /** Show selected count */
  showCount?: boolean
  /** Show clear button */
  showClear?: boolean
  /** Disabled state */
  disabled?: boolean
}

const FilterMultiSelectComponent: React.FC<FilterMultiSelectProps> = ({
  label,
  icon,
  options,
  selectedValues,
  onChange,
  onToggle,
  emptyText = 'No options available',
  maxHeight = 200,
  showSelectAll = true,
  showCount = true,
  showClear = true,
  disabled = false,
}) => {
  // Compute select all state
  const selectAllState = useMemo(() => {
    if (selectedValues.length === 0) return 'none'
    if (selectedValues.length === options.length) return 'all'
    return 'indeterminate'
  }, [selectedValues.length, options.length])

  // Handle select all/none
  const handleSelectAll = () => {
    if (!onChange) return
    if (selectAllState === 'all') {
      onChange([]) // Deselect all
    } else {
      onChange(options.map((opt) => opt.value)) // Select all
    }
  }

  // Handle single item toggle
  const handleToggle = (value: string) => {
    if (onToggle) {
      onToggle(value)
    } else if (onChange) {
      // Default toggle behavior
      if (selectedValues.includes(value)) {
        onChange(selectedValues.filter((v) => v !== value))
      } else {
        onChange([...selectedValues, value])
      }
    }
  }

  // Handle clear
  const handleClear = () => {
    if (onChange) {
      onChange([])
    }
  }

  // Check if option is selected
  const isSelected = (value: string) => selectedValues.includes(value)

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h4 className="font-medium text-sm">{label}</h4>
          {showCount && selectedValues.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {selectedValues.length}
            </span>
          )}
        </div>
        {showClear && selectedValues.length > 0 && (
          <Button
            onClick={handleClear}
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={disabled}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Select All */}
      {showSelectAll && options.length > 0 && (
        <div className="flex items-center space-x-2 pb-2 border-b">
          <Checkbox
            id="select-all"
            checked={selectAllState === 'all'}
            onCheckedChange={handleSelectAll}
            disabled={disabled}
            className={selectAllState === 'indeterminate' ? 'data-[state=checked]:bg-muted-foreground' : ''}
          />
          <Label
            htmlFor="select-all"
            className="text-sm font-medium cursor-pointer flex-1"
          >
            {selectAllState === 'all' ? 'Deselect All' : 'Select All'}
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              ({selectedValues.length}/{options.length})
            </span>
          </Label>
        </div>
      )}

      {/* Options List */}
      {options.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          {emptyText}
        </div>
      ) : (
        <ScrollArea style={{ maxHeight: `${maxHeight}px` }} className="pr-3">
          <div className="space-y-2">
            {options.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-2 py-1.5 hover:bg-muted/50 rounded px-2 -mx-2 transition-colors"
              >
                <Checkbox
                  id={option.value}
                  checked={isSelected(option.value)}
                  onCheckedChange={() => handleToggle(option.value)}
                  disabled={disabled}
                />
                <Label
                  htmlFor={option.value}
                  className="flex-1 cursor-pointer text-sm"
                >
                  <div className="flex items-center gap-2">
                    {option.icon && <span className="text-muted-foreground">{option.icon}</span>}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span>{option.label}</span>
                        {isSelected(option.value) && (
                          <Check className="h-3 w-3 text-tinedy-blue" />
                        )}
                      </div>
                      {option.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
export const FilterMultiSelect = React.memo(FilterMultiSelectComponent, (prevProps, nextProps) => {
  return (
    prevProps.selectedValues === nextProps.selectedValues &&
    prevProps.options === nextProps.options &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.onToggle === nextProps.onToggle &&
    prevProps.disabled === nextProps.disabled
  )
})

FilterMultiSelect.displayName = 'FilterMultiSelect'
