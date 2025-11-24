/**
 * FilterPresets Component
 *
 * Quick filter preset buttons with:
 * - Today, Week, Month, Upcoming, Pending, Confirmed presets
 * - Active state highlighting
 * - Icons for each preset
 * - Responsive layout
 * - Clear button (when preset is active)
 */

import React from 'react'
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CalendarFilterPreset } from '@/types/calendar-filters'

interface PresetConfig {
  value: CalendarFilterPreset
  label: string
  icon: React.ReactNode
  description: string
}

const PRESET_CONFIGS: PresetConfig[] = [
  {
    value: 'today',
    label: 'Today',
    icon: <Calendar className="h-4 w-4" />,
    description: "Today's bookings",
  },
  {
    value: 'week',
    label: 'This Week',
    icon: <CalendarDays className="h-4 w-4" />,
    description: 'Current week (Sun-Sat)',
  },
  {
    value: 'month',
    label: 'This Month',
    icon: <CalendarRange className="h-4 w-4" />,
    description: 'Current month',
  },
  {
    value: 'upcoming',
    label: 'Upcoming',
    icon: <Clock className="h-4 w-4" />,
    description: 'Future bookings',
  },
  {
    value: 'pending',
    label: 'Pending',
    icon: <AlertCircle className="h-4 w-4" />,
    description: 'Pending status only',
  },
  {
    value: 'confirmed',
    label: 'Confirmed',
    icon: <CheckCircle2 className="h-4 w-4" />,
    description: 'Confirmed status only',
  },
]

interface FilterPresetsProps {
  /** Currently active preset */
  activePreset: CalendarFilterPreset | null
  /** Callback when preset is selected */
  onPresetChange: (preset: CalendarFilterPreset) => void
  /** Callback to change current date (for date-based presets: today, week, month, upcoming) */
  onPresetDateChange?: (preset: string) => void
  /** Callback to clear preset */
  onClear?: () => void
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Show preset descriptions */
  showDescriptions?: boolean
  /** Custom className */
  className?: string
}

export const FilterPresets: React.FC<FilterPresetsProps> = ({
  activePreset,
  onPresetChange,
  onPresetDateChange,
  onClear,
  orientation = 'horizontal',
  showDescriptions = false,
  className,
}) => {
  const handlePresetClick = (preset: CalendarFilterPreset) => {
    // Toggle off if clicking active preset
    if (activePreset === preset && onClear) {
      onClear()
    } else {
      // Date-based presets (today, week, month, upcoming) should change calendar date
      if (
        onPresetDateChange &&
        (preset === 'today' || preset === 'week' || preset === 'month' || preset === 'upcoming')
      ) {
        onPresetDateChange(preset)
      }
      // All presets still update filter state (for status filters: pending, confirmed)
      onPresetChange(preset)
    }
  }

  return (
    <div
      className={cn(
        'flex gap-2',
        orientation === 'vertical' ? 'flex-col' : 'flex-wrap',
        className
      )}
    >
      {PRESET_CONFIGS.map((preset) => {
        const isActive = activePreset === preset.value

        return (
          <Button
            key={preset.value}
            onClick={() => handlePresetClick(preset.value)}
            variant={isActive ? 'default' : 'outline'}
            size={showDescriptions ? 'default' : 'sm'}
            className={cn(
              'transition-all',
              orientation === 'vertical' && 'justify-start',
              isActive && 'ring-2 ring-tinedy-blue ring-offset-2'
            )}
            title={preset.description}
          >
            {preset.icon}
            <span className="ml-2">{preset.label}</span>
            {showDescriptions && orientation === 'vertical' && (
              <span className="ml-auto text-xs text-muted-foreground">
                {preset.description}
              </span>
            )}
          </Button>
        )
      })}
    </div>
  )
}

/**
 * FilterPresetsCompact Component
 *
 * Compact version with icon-only buttons for limited space
 */

interface FilterPresetsCompactProps {
  /** Currently active preset */
  activePreset: CalendarFilterPreset | null
  /** Callback when preset is selected */
  onPresetChange: (preset: CalendarFilterPreset) => void
  /** Custom className */
  className?: string
}

export const FilterPresetsCompact: React.FC<FilterPresetsCompactProps> = ({
  activePreset,
  onPresetChange,
  className,
}) => {
  return (
    <div className={cn('flex gap-1', className)}>
      {PRESET_CONFIGS.map((preset) => {
        const isActive = activePreset === preset.value

        return (
          <Button
            key={preset.value}
            onClick={() => onPresetChange(preset.value)}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-8 w-8 p-0',
              isActive && 'ring-2 ring-tinedy-blue ring-offset-1'
            )}
            title={`${preset.label} - ${preset.description}`}
          >
            {preset.icon}
            <span className="sr-only">{preset.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
