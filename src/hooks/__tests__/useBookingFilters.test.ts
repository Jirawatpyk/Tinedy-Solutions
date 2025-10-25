/**
 * Test Suite: useBookingFilters Hook
 *
 * Tests for the booking filters state management hook.
 * Covers filter state initialization, updates, resets, and active filter detection.
 *
 * Coverage Target: 100% (pure state management logic)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBookingFilters } from '../useBookingFilters'

// Mock the useDebounce hook
vi.mock('../use-debounce', () => ({
  useDebounce: <T,>(value: T): T => value, // Return value immediately for testing
}))

describe('useBookingFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default filter values', () => {
      // Arrange & Act
      const { result } = renderHook(() => useBookingFilters())

      // Assert
      expect(result.current.filters).toEqual({
        searchQuery: '',
        status: 'all',
        dateFrom: '',
        dateTo: '',
        staffId: 'all',
        teamId: 'all',
        serviceType: 'all',
      })
    })

    it('should initialize with provided initial filters', () => {
      // Arrange
      const initialFilters = {
        status: 'confirmed',
        staffId: 'staff-123',
      }

      // Act
      const { result } = renderHook(() => useBookingFilters(initialFilters))

      // Assert
      expect(result.current.filters).toEqual({
        searchQuery: '',
        status: 'confirmed',
        dateFrom: '',
        dateTo: '',
        staffId: 'staff-123',
        teamId: 'all',
        serviceType: 'all',
      })
    })

    it('should partially override defaults with initial filters', () => {
      // Arrange
      const initialFilters = {
        searchQuery: 'Test',
      }

      // Act
      const { result } = renderHook(() => useBookingFilters(initialFilters))

      // Assert
      expect(result.current.filters.searchQuery).toBe('Test')
      expect(result.current.filters.status).toBe('all')
      expect(result.current.filters.staffId).toBe('all')
    })
  })

  describe('updateFilter', () => {
    it('should update a single filter value', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      act(() => {
        result.current.updateFilter('status', 'pending')
      })

      // Assert
      expect(result.current.filters.status).toBe('pending')
    })

    it('should update searchQuery filter', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      act(() => {
        result.current.updateFilter('searchQuery', 'John Doe')
      })

      // Assert
      expect(result.current.filters.searchQuery).toBe('John Doe')
    })

    it('should update staffId filter', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      act(() => {
        result.current.updateFilter('staffId', 'staff-456')
      })

      // Assert
      expect(result.current.filters.staffId).toBe('staff-456')
    })

    it('should preserve other filters when updating one', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters({
        status: 'confirmed',
        staffId: 'staff-123',
      }))

      // Act
      act(() => {
        result.current.updateFilter('serviceType', 'cleaning')
      })

      // Assert
      expect(result.current.filters.status).toBe('confirmed')
      expect(result.current.filters.staffId).toBe('staff-123')
      expect(result.current.filters.serviceType).toBe('cleaning')
    })
  })

  describe('updateFilters', () => {
    it('should update multiple filters at once', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      act(() => {
        result.current.updateFilters({
          status: 'completed',
          staffId: 'staff-789',
          serviceType: 'training',
        })
      })

      // Assert
      expect(result.current.filters.status).toBe('completed')
      expect(result.current.filters.staffId).toBe('staff-789')
      expect(result.current.filters.serviceType).toBe('training')
    })

    it('should preserve unchanged filters', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters({
        searchQuery: 'Original Search',
        teamId: 'team-001',
      }))

      // Act
      act(() => {
        result.current.updateFilters({
          status: 'pending',
        })
      })

      // Assert
      expect(result.current.filters.searchQuery).toBe('Original Search')
      expect(result.current.filters.teamId).toBe('team-001')
      expect(result.current.filters.status).toBe('pending')
    })
  })

  describe('resetFilters', () => {
    it('should reset all filters to default values', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters({
        searchQuery: 'Test',
        status: 'confirmed',
        staffId: 'staff-123',
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      }))

      // Act
      act(() => {
        result.current.resetFilters()
      })

      // Assert
      expect(result.current.filters).toEqual({
        searchQuery: '',
        status: 'all',
        dateFrom: '',
        dateTo: '',
        staffId: 'all',
        teamId: 'all',
        serviceType: 'all',
      })
    })
  })

  describe('hasActiveFilters', () => {
    it('should return false when no filters are active', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      const hasActive = result.current.hasActiveFilters()

      // Assert
      expect(hasActive).toBe(false)
    })

    it('should return true when searchQuery is set', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      act(() => {
        result.current.updateFilter('searchQuery', 'Test')
      })

      // Assert
      expect(result.current.hasActiveFilters()).toBe(true)
    })

    it('should return true when status is not "all"', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      act(() => {
        result.current.updateFilter('status', 'pending')
      })

      // Assert
      expect(result.current.hasActiveFilters()).toBe(true)
    })

    it('should return true when dateFrom is set', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      act(() => {
        result.current.updateFilter('dateFrom', '2025-01-01')
      })

      // Assert
      expect(result.current.hasActiveFilters()).toBe(true)
    })

    it('should return true when dateTo is set', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      act(() => {
        result.current.updateFilter('dateTo', '2025-12-31')
      })

      // Assert
      expect(result.current.hasActiveFilters()).toBe(true)
    })

    it('should return true when multiple filters are active', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      act(() => {
        result.current.updateFilters({
          status: 'confirmed',
          staffId: 'staff-123',
          serviceType: 'cleaning',
        })
      })

      // Assert
      expect(result.current.hasActiveFilters()).toBe(true)
    })
  })

  describe('getActiveFilterCount', () => {
    it('should return 0 when no filters are active', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      const count = result.current.getActiveFilterCount()

      // Assert
      expect(count).toBe(0)
    })

    it('should count single active filter', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      act(() => {
        result.current.updateFilter('status', 'pending')
      })

      // Assert
      expect(result.current.getActiveFilterCount()).toBe(1)
    })

    it('should count multiple active filters', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      act(() => {
        result.current.updateFilters({
          searchQuery: 'Test',
          status: 'confirmed',
          staffId: 'staff-123',
        })
      })

      // Assert
      expect(result.current.getActiveFilterCount()).toBe(3)
    })

    it('should count all seven filters when all are active', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      act(() => {
        result.current.updateFilters({
          searchQuery: 'Test',
          status: 'pending',
          staffId: 'staff-123',
          teamId: 'team-001',
          dateFrom: '2025-01-01',
          dateTo: '2025-12-31',
          serviceType: 'cleaning',
        })
      })

      // Assert
      expect(result.current.getActiveFilterCount()).toBe(7)
    })

    it('should not count "all" values as active', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      act(() => {
        result.current.updateFilters({
          status: 'all',
          staffId: 'all',
          teamId: 'all',
          serviceType: 'all',
        })
      })

      // Assert
      expect(result.current.getActiveFilterCount()).toBe(0)
    })
  })

  describe('setQuickFilter', () => {
    describe('today', () => {
      it('should set dateFrom and dateTo to today', () => {
        // Arrange
        const { result } = renderHook(() => useBookingFilters())
        const today = new Date().toISOString().split('T')[0]

        // Act
        act(() => {
          result.current.setQuickFilter('today')
        })

        // Assert
        expect(result.current.filters.dateFrom).toBe(today)
        expect(result.current.filters.dateTo).toBe(today)
      })

      it('should preserve other filters when setting today', () => {
        // Arrange
        const { result } = renderHook(() => useBookingFilters({
          status: 'confirmed',
          staffId: 'staff-123',
        }))

        // Act
        act(() => {
          result.current.setQuickFilter('today')
        })

        // Assert
        expect(result.current.filters.status).toBe('confirmed')
        expect(result.current.filters.staffId).toBe('staff-123')
      })
    })

    describe('week', () => {
      it('should set dateFrom to start of week and dateTo to end of week', () => {
        // Arrange
        const { result } = renderHook(() => useBookingFilters())

        // Act
        act(() => {
          result.current.setQuickFilter('week')
        })

        // Assert
        const dateFrom = new Date(result.current.filters.dateFrom)
        const dateTo = new Date(result.current.filters.dateTo)

        // Week should span 7 days (Sunday to Saturday)
        const daysDiff = Math.floor((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24))
        expect(daysDiff).toBe(6) // 0-6 = 7 days

        // Both should be valid dates
        expect(dateFrom).toBeInstanceOf(Date)
        expect(dateTo).toBeInstanceOf(Date)
        expect(!isNaN(dateFrom.getTime())).toBe(true)
        expect(!isNaN(dateTo.getTime())).toBe(true)
      })
    })

    describe('month', () => {
      it('should set dateFrom and dateTo for month range', () => {
        // Arrange
        const { result } = renderHook(() => useBookingFilters())

        // Act
        act(() => {
          result.current.setQuickFilter('month')
        })

        // Assert
        // Check date strings match expected format
        expect(result.current.filters.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(result.current.filters.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/)

        // Both dates should be set (not empty)
        expect(result.current.filters.dateFrom).not.toBe('')
        expect(result.current.filters.dateTo).not.toBe('')

        // dateFrom should be before or equal to dateTo
        expect(result.current.filters.dateFrom <= result.current.filters.dateTo).toBe(true)
      })
    })
  })

  describe('debouncedSearchQuery', () => {
    it('should return debounced search query', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters({
        searchQuery: 'Initial',
      }))

      // Assert - with mocked useDebounce, it returns immediately
      expect(result.current.debouncedSearchQuery).toBe('Initial')
    })

    it('should update when searchQuery changes', () => {
      // Arrange
      const { result } = renderHook(() => useBookingFilters())

      // Act
      act(() => {
        result.current.updateFilter('searchQuery', 'New Query')
      })

      // Assert - with mocked useDebounce, it returns immediately
      expect(result.current.debouncedSearchQuery).toBe('New Query')
    })
  })
})
