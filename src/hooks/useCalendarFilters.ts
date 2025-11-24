/**
 * useCalendarFilters Hook
 *
 * Manages calendar filter state with useReducer
 * Supports multi-select filters, date ranges, search, presets, and localStorage persistence
 */

import { useReducer, useCallback, useMemo, useEffect } from 'react'
import type {
  CalendarFilters,
  CalendarFilterAction,
  CalendarFilterPreset,
} from '@/types/calendar-filters'
import { INITIAL_CALENDAR_FILTERS } from '@/types/calendar-filters'

// LocalStorage key
const STORAGE_KEY = 'calendar-filters'

// Apply preset logic
// NOTE: dateRange is NOT changed by presets to avoid query refetch
// Calendar page controls its own date range via currentDate state
function applyPreset(preset: CalendarFilterPreset): Partial<CalendarFilters> {
  if (!preset) return {}

  switch (preset) {
    case 'today':
    case 'week':
    case 'month':
    case 'upcoming':
      // Date-based presets: clear all filters (Calendar handles date range)
      return {
        statuses: [],
        staffIds: [],
        teamIds: [],
        searchQuery: '',
        dateRange: null, // Don't change dateRange to avoid refetch
      }

    case 'pending':
      return {
        statuses: ['pending'],
        staffIds: [],
        teamIds: [],
        searchQuery: '',
        dateRange: null,
      }

    case 'confirmed':
      return {
        statuses: ['confirmed'],
        staffIds: [],
        teamIds: [],
        searchQuery: '',
        dateRange: null,
      }

    default:
      return {}
  }
}

// Reducer function
function calendarFiltersReducer(
  state: CalendarFilters,
  action: CalendarFilterAction
): CalendarFilters {
  switch (action.type) {
    // Date Range Actions
    case 'SET_DATE_RANGE':
      return {
        ...state,
        dateRange: action.payload,
        preset: null, // Clear preset when manually changing filters
      }

    case 'CLEAR_DATE_RANGE':
      return {
        ...state,
        dateRange: null,
        preset: null,
      }

    // Staff Filter Actions
    case 'TOGGLE_STAFF': {
      const staffIds = state.staffIds.includes(action.payload)
        ? state.staffIds.filter((id) => id !== action.payload)
        : [...state.staffIds, action.payload]
      return {
        ...state,
        staffIds,
        preset: null,
      }
    }

    case 'SET_STAFF':
      return {
        ...state,
        staffIds: action.payload,
        preset: null,
      }

    case 'CLEAR_STAFF':
      return {
        ...state,
        staffIds: [],
        preset: null,
      }

    // Team Filter Actions
    case 'TOGGLE_TEAM': {
      const teamIds = state.teamIds.includes(action.payload)
        ? state.teamIds.filter((id) => id !== action.payload)
        : [...state.teamIds, action.payload]
      return {
        ...state,
        teamIds,
        preset: null,
      }
    }

    case 'SET_TEAM':
      return {
        ...state,
        teamIds: action.payload,
        preset: null,
      }

    case 'CLEAR_TEAM':
      return {
        ...state,
        teamIds: [],
        preset: null,
      }

    // Status Filter Actions
    case 'TOGGLE_STATUS': {
      const statuses = state.statuses.includes(action.payload)
        ? state.statuses.filter((s) => s !== action.payload)
        : [...state.statuses, action.payload]
      return {
        ...state,
        statuses,
        preset: null,
      }
    }

    case 'SET_STATUS':
      return {
        ...state,
        statuses: action.payload,
        preset: null,
      }

    case 'CLEAR_STATUS':
      return {
        ...state,
        statuses: [],
        preset: null,
      }

    // Search Actions
    case 'SET_SEARCH':
      return {
        ...state,
        searchQuery: action.payload,
        preset: null,
      }

    case 'CLEAR_SEARCH':
      return {
        ...state,
        searchQuery: '',
      }

    // Preset Actions
    case 'SET_PRESET':
      return {
        ...state,
        ...applyPreset(action.payload),
        preset: action.payload,
      }

    // Global Actions
    case 'CLEAR_ALL':
      return INITIAL_CALENDAR_FILTERS

    case 'RESTORE_FILTERS':
      return action.payload

    default:
      return state
  }
}

// Load filters from localStorage
function loadFiltersFromStorage(): CalendarFilters {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return INITIAL_CALENDAR_FILTERS

    const parsed = JSON.parse(stored)

    // Convert date strings back to Date objects
    if (parsed.dateRange) {
      parsed.dateRange = {
        start: new Date(parsed.dateRange.start),
        end: new Date(parsed.dateRange.end),
      }
    }

    return parsed
  } catch (error) {
    console.error('Failed to load calendar filters from localStorage:', error)
    return INITIAL_CALENDAR_FILTERS
  }
}

// Save filters to localStorage (debounced)
function saveFiltersToStorage(filters: CalendarFilters): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  } catch (error) {
    console.error('Failed to save calendar filters to localStorage:', error)
  }
}

// Main Hook
export function useCalendarFilters(
  initialFilters: CalendarFilters = INITIAL_CALENDAR_FILTERS
) {
  // Initialize reducer with localStorage data
  const [filters, dispatch] = useReducer(
    calendarFiltersReducer,
    initialFilters,
    loadFiltersFromStorage
  )

  // Save to localStorage on filter changes (debounced 500ms)
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveFiltersToStorage(filters)
    }, 500)

    return () => clearTimeout(timeout)
  }, [filters])

  // Action creators (memoized)
  const setDateRange = useCallback(
    (range: { start: Date; end: Date } | null) => {
      dispatch({ type: 'SET_DATE_RANGE', payload: range })
    },
    []
  )

  const clearDateRange = useCallback(() => {
    dispatch({ type: 'CLEAR_DATE_RANGE' })
  }, [])

  const toggleStaff = useCallback((staffId: string) => {
    dispatch({ type: 'TOGGLE_STAFF', payload: staffId })
  }, [])

  const setStaff = useCallback((staffIds: string[]) => {
    dispatch({ type: 'SET_STAFF', payload: staffIds })
  }, [])

  const clearStaff = useCallback(() => {
    dispatch({ type: 'CLEAR_STAFF' })
  }, [])

  const toggleTeam = useCallback((teamId: string) => {
    dispatch({ type: 'TOGGLE_TEAM', payload: teamId })
  }, [])

  const setTeam = useCallback((teamIds: string[]) => {
    dispatch({ type: 'SET_TEAM', payload: teamIds })
  }, [])

  const clearTeam = useCallback(() => {
    dispatch({ type: 'CLEAR_TEAM' })
  }, [])

  const toggleStatus = useCallback((status: string) => {
    dispatch({ type: 'TOGGLE_STATUS', payload: status })
  }, [])

  const setStatus = useCallback((statuses: string[]) => {
    dispatch({ type: 'SET_STATUS', payload: statuses })
  }, [])

  const clearStatus = useCallback(() => {
    dispatch({ type: 'CLEAR_STATUS' })
  }, [])

  const setSearch = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH', payload: query })
  }, [])

  const clearSearch = useCallback(() => {
    dispatch({ type: 'CLEAR_SEARCH' })
  }, [])

  const setPreset = useCallback((preset: CalendarFilterPreset) => {
    dispatch({ type: 'SET_PRESET', payload: preset })
  }, [])

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' })
  }, [])

  // Computed values (memoized)
  const hasActiveFilters = useMemo(() => {
    return (
      filters.dateRange !== null ||
      filters.staffIds.length > 0 ||
      filters.teamIds.length > 0 ||
      filters.statuses.length > 0 ||
      filters.searchQuery.trim() !== ''
    )
  }, [filters])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.dateRange) count++
    if (filters.staffIds.length > 0) count++
    if (filters.teamIds.length > 0) count++
    if (filters.statuses.length > 0) count++
    if (filters.searchQuery.trim()) count++
    return count
  }, [filters])

  // Memoize return object เพื่อป้องกัน re-render ของ child components
  return useMemo(() => ({
    // State
    filters,

    // Actions
    setDateRange,
    clearDateRange,
    toggleStaff,
    setStaff,
    clearStaff,
    toggleTeam,
    setTeam,
    clearTeam,
    toggleStatus,
    setStatus,
    clearStatus,
    setSearch,
    clearSearch,
    setPreset,
    clearAll,

    // Computed
    hasActiveFilters,
    activeFilterCount,
  }), [
    filters,
    setDateRange,
    clearDateRange,
    toggleStaff,
    setStaff,
    clearStaff,
    toggleTeam,
    setTeam,
    clearTeam,
    toggleStatus,
    setStatus,
    clearStatus,
    setSearch,
    clearSearch,
    setPreset,
    clearAll,
    hasActiveFilters,
    activeFilterCount,
  ])
}

// Export type for use in components
export type UseCalendarFiltersReturn = ReturnType<typeof useCalendarFilters>
