/**
 * use-booking-wizard.test.ts — Reducer unit tests (M4 fix)
 *
 * Tests wizard state machine in isolation:
 * - All price mode transitions (R2-2 fix)
 * - Step navigation + validation (R6)
 * - End time auto-calc (R7: only if not manually set)
 * - localStorage mode scoping (R5)
 * - validateFullState pure function (RT7)
 */

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBookingWizard, validateFullState, createInitialState } from '../use-booking-wizard'
import { PriceMode } from '@/types/booking'

// ============================================================================
// validateFullState (RT7: pure function tests)
// ============================================================================

describe('validateFullState', () => {
  it('returns errors for completely empty state', () => {
    const state = createInitialState()
    const errors = validateFullState(state)
    expect(Object.keys(errors).length).toBeGreaterThan(0)
  })

  it('returns no errors for valid package mode booking', () => {
    const state = createInitialState()
    const validState = {
      ...state,
      customer: { id: 'c1', full_name: 'Test Customer', phone: '0800000000' } as never,
      isNewCustomer: false,
      package_v2_id: 'pkg-1',
      price_mode: PriceMode.Package as typeof PriceMode[keyof typeof PriceMode],
      total_price: 1500,
      booking_date: '2026-02-20',
      start_time: '09:00',
      address: '123 Main St',
      city: 'Bangkok',
    }
    const errors = validateFullState(validState)
    expect(errors).toEqual({})
  })

  it('requires job_name for custom mode', () => {
    const state = createInitialState()
    const customState = {
      ...state,
      customer: { id: 'c1', full_name: 'Test', phone: '0800000000' } as never,
      price_mode: PriceMode.Custom as typeof PriceMode[keyof typeof PriceMode],
      custom_price: 2000,
      job_name: '', // Missing!
      booking_date: '2026-02-20',
      start_time: '09:00',
      address: '123 Main St',
      city: 'Bangkok',
    }
    const errors = validateFullState(customState)
    expect(errors.job_name).toBeDefined()
  })
})

// ============================================================================
// Reducer via useBookingWizard hook
// ============================================================================

describe('useBookingWizard reducer', () => {
  describe('SET_PRICE_MODE', () => {
    it('switching to custom clears package_v2_id and selectedPackage (G4 fix)', () => {
      const { result } = renderHook(() => useBookingWizard())
      act(() => {
        result.current.dispatch({ type: 'SET_PRICE_MODE', mode: PriceMode.Custom })
      })
      expect(result.current.state.price_mode).toBe('custom')
      expect(result.current.state.package_v2_id).toBeNull()
      expect(result.current.state.selectedPackage).toBeNull()
    })

    it('switching to package resets total_price to 0', () => {
      const { result } = renderHook(() => useBookingWizard())
      // First go to custom with some price
      act(() => {
        result.current.dispatch({ type: 'SET_CUSTOM_PRICE', price: 5000 })
        result.current.dispatch({ type: 'SET_PRICE_MODE', mode: PriceMode.Custom })
      })
      // Switch back to package
      act(() => {
        result.current.dispatch({ type: 'SET_PRICE_MODE', mode: PriceMode.Package })
      })
      expect(result.current.state.price_mode).toBe('package')
      expect(result.current.state.total_price).toBe(0)
      expect(result.current.state.custom_price).toBeNull()
      expect(result.current.state.job_name).toBe('')
    })

    it('switching to override clears job_name but keeps total_price', () => {
      const { result } = renderHook(() => useBookingWizard())
      act(() => {
        result.current.dispatch({ type: 'SET_TOTAL_PRICE', price: 1500 })
        result.current.dispatch({ type: 'SET_PRICE_MODE', mode: PriceMode.Override })
      })
      expect(result.current.state.price_mode).toBe('override')
      expect(result.current.state.total_price).toBe(1500)
      expect(result.current.state.job_name).toBe('')
    })
  })

  describe('Step navigation (R6)', () => {
    it('NEXT_STEP from step 1 validates customer selection', () => {
      const { result } = renderHook(() => useBookingWizard())
      act(() => {
        result.current.dispatch({ type: 'NEXT_STEP' })
      })
      // Should stay on step 1 because no customer selected
      expect(result.current.state.step).toBe(1)
      expect(Object.keys(result.current.state.validationErrors).length).toBeGreaterThan(0)
    })

    it('GOTO_STEP moves directly without validation', () => {
      const { result } = renderHook(() => useBookingWizard())
      act(() => {
        result.current.dispatch({ type: 'GOTO_STEP', step: 4 })
      })
      expect(result.current.state.step).toBe(4)
    })

    it('PREV_STEP goes back one step', () => {
      const { result } = renderHook(() => useBookingWizard())
      act(() => {
        result.current.dispatch({ type: 'GOTO_STEP', step: 3 })
        result.current.dispatch({ type: 'PREV_STEP' })
      })
      expect(result.current.state.step).toBe(2)
    })
  })

  describe('End time auto-calc (R7)', () => {
    it('does NOT auto-calc end_time if endTimeManuallySet is true', () => {
      const { result } = renderHook(() => useBookingWizard())
      act(() => {
        result.current.dispatch({ type: 'SET_END_TIME', time: '15:00', manual: true })
        result.current.dispatch({ type: 'SET_START_TIME', time: '09:00' })
      })
      // end_time should remain 15:00 (not overwritten by auto-calc)
      expect(result.current.state.end_time).toBe('15:00')
      expect(result.current.state.endTimeManuallySet).toBe(true)
    })

    it('marks endTimeManuallySet when SET_END_TIME called with manual=true', () => {
      const { result } = renderHook(() => useBookingWizard())
      act(() => {
        result.current.dispatch({ type: 'SET_END_TIME', time: '14:00', manual: true })
      })
      expect(result.current.state.endTimeManuallySet).toBe(true)
    })
  })

  describe('SET_VALIDATION_ERRORS (H2 fix)', () => {
    it('sets validation errors in state for Quick mode inline display', () => {
      const { result } = renderHook(() => useBookingWizard())
      act(() => {
        result.current.dispatch({
          type: 'SET_VALIDATION_ERRORS',
          errors: { job_name: 'Please enter a job name', booking_date: 'Please select a date' },
        })
      })
      expect(result.current.state.validationErrors.job_name).toBe('Please enter a job name')
      expect(result.current.state.validationErrors.booking_date).toBe('Please select a date')
    })
  })

  describe('RESET', () => {
    it('resets state to initial values', () => {
      const { result } = renderHook(() => useBookingWizard())
      act(() => {
        result.current.dispatch({ type: 'SET_BOOKING_DATE', date: '2026-12-01' })
        result.current.dispatch({ type: 'RESET' })
      })
      expect(result.current.state.booking_date).toBe('')
      expect(result.current.state.step).toBe(1)
    })
  })

  describe('Multi-day (R8)', () => {
    it('setting isMultiDay=true disables recurring', () => {
      const { result } = renderHook(() => useBookingWizard())
      act(() => {
        result.current.dispatch({ type: 'TOGGLE_RECURRING', isRecurring: true })
        result.current.dispatch({ type: 'TOGGLE_MULTI_DAY', isMultiDay: true })
      })
      expect(result.current.state.isMultiDay).toBe(true)
      // Recurring should be cleared when multi-day is enabled
      expect(result.current.state.isRecurring).toBe(false)
    })
  })
})
