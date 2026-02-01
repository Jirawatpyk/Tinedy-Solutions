/**
 * Test Suite: useSwipe Hook
 *
 * Tests for swipe gesture detection hook on touch devices.
 * Covers swipe direction detection, threshold behavior, and tap handling.
 *
 * Coverage Target: 100% (pure gesture detection logic)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSwipe } from '../use-swipe'

// Helper function to create mock touch event
const createTouchEvent = (clientX: number, clientY: number): React.TouchEvent => ({
  touches: [{ clientX, clientY }] as unknown as React.TouchList,
} as React.TouchEvent)

describe('useSwipe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should return touch event handlers', () => {
      // Arrange & Act
      const { result } = renderHook(() => useSwipe())

      // Assert
      expect(result.current).toHaveProperty('onTouchStart')
      expect(result.current).toHaveProperty('onTouchMove')
      expect(result.current).toHaveProperty('onTouchEnd')
      expect(typeof result.current.onTouchStart).toBe('function')
      expect(typeof result.current.onTouchMove).toBe('function')
      expect(typeof result.current.onTouchEnd).toBe('function')
    })

    it('should return stable handler references', () => {
      // Arrange
      const { result, rerender } = renderHook(() => useSwipe())
      const initialHandlers = result.current

      // Act
      rerender()

      // Assert - handlers should be the same references
      expect(result.current.onTouchStart).toBe(initialHandlers.onTouchStart)
      expect(result.current.onTouchMove).toBe(initialHandlers.onTouchMove)
      expect(result.current.onTouchEnd).toBe(initialHandlers.onTouchEnd)
    })
  })

  describe('Swipe Left Detection', () => {
    it('should detect swipe left when delta exceeds threshold', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const { result } = renderHook(() => useSwipe({ onSwipeLeft }))

      // Act - Swipe left: start at 200, end at 100 (delta = 100)
      act(() => {
        result.current.onTouchStart(createTouchEvent(200, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeLeft).toHaveBeenCalledTimes(1)
    })

    it('should detect swipe left with custom threshold', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const { result } = renderHook(() => useSwipe({
        threshold: 100,
        onSwipeLeft
      }))

      // Act - Delta = 80 (below 100 threshold)
      act(() => {
        result.current.onTouchStart(createTouchEvent(180, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert - should NOT trigger
      expect(onSwipeLeft).not.toHaveBeenCalled()
    })

    it('should not detect swipe left when below threshold', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const { result } = renderHook(() => useSwipe({ onSwipeLeft }))

      // Act - Delta = 40 (below default 50 threshold)
      act(() => {
        result.current.onTouchStart(createTouchEvent(140, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeLeft).not.toHaveBeenCalled()
    })

    it('should detect swipe left even with vertical movement', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const { result } = renderHook(() => useSwipe({ onSwipeLeft }))

      // Act - Horizontal: 200->100 (100px), Vertical: 100->120 (20px)
      // Horizontal movement dominates
      act(() => {
        result.current.onTouchStart(createTouchEvent(200, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 120))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeLeft).toHaveBeenCalledTimes(1)
    })
  })

  describe('Swipe Right Detection', () => {
    it('should detect swipe right when delta exceeds threshold', () => {
      // Arrange
      const onSwipeRight = vi.fn()
      const { result } = renderHook(() => useSwipe({ onSwipeRight }))

      // Act - Swipe right: start at 100, end at 200 (delta = -100)
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(200, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeRight).toHaveBeenCalledTimes(1)
    })

    it('should not detect swipe right when below threshold', () => {
      // Arrange
      const onSwipeRight = vi.fn()
      const { result } = renderHook(() => useSwipe({ onSwipeRight }))

      // Act - Delta = 30 (below default 50 threshold)
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(130, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeRight).not.toHaveBeenCalled()
    })
  })

  describe('Swipe Up Detection', () => {
    it('should detect swipe up when delta exceeds threshold', () => {
      // Arrange
      const onSwipeUp = vi.fn()
      const { result } = renderHook(() => useSwipe({ onSwipeUp }))

      // Act - Swipe up: start at Y=200, end at Y=100 (delta = 100)
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 200))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeUp).toHaveBeenCalledTimes(1)
    })

    it('should not detect swipe up when below threshold', () => {
      // Arrange
      const onSwipeUp = vi.fn()
      const { result } = renderHook(() => useSwipe({ onSwipeUp }))

      // Act - Delta = 40 (below default 50 threshold)
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 140))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeUp).not.toHaveBeenCalled()
    })

    it('should detect swipe up even with horizontal movement', () => {
      // Arrange
      const onSwipeUp = vi.fn()
      const { result } = renderHook(() => useSwipe({ onSwipeUp }))

      // Act - Vertical: 200->100 (100px), Horizontal: 100->120 (20px)
      // Vertical movement dominates
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 200))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(120, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeUp).toHaveBeenCalledTimes(1)
    })
  })

  describe('Swipe Down Detection', () => {
    it('should detect swipe down when delta exceeds threshold', () => {
      // Arrange
      const onSwipeDown = vi.fn()
      const { result } = renderHook(() => useSwipe({ onSwipeDown }))

      // Act - Swipe down: start at Y=100, end at Y=200 (delta = -100)
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 200))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeDown).toHaveBeenCalledTimes(1)
    })

    it('should not detect swipe down when below threshold', () => {
      // Arrange
      const onSwipeDown = vi.fn()
      const { result } = renderHook(() => useSwipe({ onSwipeDown }))

      // Act - Delta = 30 (below default 50 threshold)
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 130))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeDown).not.toHaveBeenCalled()
    })
  })

  describe('Tap Behavior (No Swipe)', () => {
    it('should not trigger any callback on tap (no movement)', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const onSwipeRight = vi.fn()
      const onSwipeUp = vi.fn()
      const onSwipeDown = vi.fn()
      const { result } = renderHook(() => useSwipe({
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
      }))

      // Act - Tap at same position
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeLeft).not.toHaveBeenCalled()
      expect(onSwipeRight).not.toHaveBeenCalled()
      expect(onSwipeUp).not.toHaveBeenCalled()
      expect(onSwipeDown).not.toHaveBeenCalled()
    })

    it('should not trigger callback on small movement below threshold', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const onSwipeRight = vi.fn()
      const onSwipeUp = vi.fn()
      const onSwipeDown = vi.fn()
      const { result } = renderHook(() => useSwipe({
        threshold: 50,
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
      }))

      // Act - Small diagonal movement (20px each direction)
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(120, 120))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeLeft).not.toHaveBeenCalled()
      expect(onSwipeRight).not.toHaveBeenCalled()
      expect(onSwipeUp).not.toHaveBeenCalled()
      expect(onSwipeDown).not.toHaveBeenCalled()
    })

    it('should initialize touch end position on touch start to prevent false swipe on tap', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const { result } = renderHook(() => useSwipe({ onSwipeLeft }))

      // Act - Only touch start and end (no move)
      act(() => {
        result.current.onTouchStart(createTouchEvent(200, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert - No swipe detected (end position initialized to start position)
      expect(onSwipeLeft).not.toHaveBeenCalled()
    })
  })

  describe('Threshold Customization', () => {
    it('should use default threshold of 50px', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const { result } = renderHook(() => useSwipe({ onSwipeLeft }))

      // Act - Delta = 51 (just above default 50)
      act(() => {
        result.current.onTouchStart(createTouchEvent(151, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeLeft).toHaveBeenCalledTimes(1)
    })

    it('should use custom threshold', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const { result } = renderHook(() => useSwipe({
        threshold: 100,
        onSwipeLeft
      }))

      // Act - Delta = 101 (just above custom 100)
      act(() => {
        result.current.onTouchStart(createTouchEvent(201, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeLeft).toHaveBeenCalledTimes(1)
    })

    it('should accept threshold of 0 for any movement', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const { result } = renderHook(() => useSwipe({
        threshold: 0,
        onSwipeLeft
      }))

      // Act - Delta = 1 (any movement)
      act(() => {
        result.current.onTouchStart(createTouchEvent(101, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeLeft).toHaveBeenCalledTimes(1)
    })
  })

  describe('Multiple Swipes', () => {
    it('should handle multiple swipes correctly', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const onSwipeRight = vi.fn()
      const { result } = renderHook(() => useSwipe({
        onSwipeLeft,
        onSwipeRight,
      }))

      // Act - First swipe left
      act(() => {
        result.current.onTouchStart(createTouchEvent(200, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Act - Second swipe right
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(200, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeLeft).toHaveBeenCalledTimes(1)
      expect(onSwipeRight).toHaveBeenCalledTimes(1)
    })

    it('should reset touch positions after each swipe', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const { result } = renderHook(() => useSwipe({ onSwipeLeft }))

      // Act - First swipe
      act(() => {
        result.current.onTouchStart(createTouchEvent(200, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Act - Tap (no movement)
      act(() => {
        result.current.onTouchStart(createTouchEvent(150, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert - Only one swipe detected, tap did not trigger
      expect(onSwipeLeft).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined callbacks gracefully', () => {
      // Arrange
      const { result } = renderHook(() => useSwipe())

      // Act - Swipe without callbacks
      expect(() => {
        act(() => {
          result.current.onTouchStart(createTouchEvent(200, 100))
        })
        act(() => {
          result.current.onTouchMove(createTouchEvent(100, 100))
        })
        act(() => {
          result.current.onTouchEnd({} as React.TouchEvent)
        })
      }).not.toThrow()

      // Assert - No error thrown
    })

    it('should handle exact threshold value', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const { result } = renderHook(() => useSwipe({
        threshold: 50,
        onSwipeLeft
      }))

      // Act - Delta = exactly 50
      act(() => {
        result.current.onTouchStart(createTouchEvent(150, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert - Should NOT trigger (needs to be > threshold, not >=)
      expect(onSwipeLeft).not.toHaveBeenCalled()
    })

    it('should handle diagonal swipe by dominant direction', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const onSwipeUp = vi.fn()
      const { result } = renderHook(() => useSwipe({
        onSwipeLeft,
        onSwipeUp,
      }))

      // Act - Diagonal: left 100px, up 80px (horizontal dominant)
      act(() => {
        result.current.onTouchStart(createTouchEvent(200, 180))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert - Only horizontal swipe detected
      expect(onSwipeLeft).toHaveBeenCalledTimes(1)
      expect(onSwipeUp).not.toHaveBeenCalled()
    })

    it('should handle perfectly diagonal swipe (equal X and Y)', () => {
      // Arrange
      const onSwipeLeft = vi.fn()
      const onSwipeUp = vi.fn()
      const { result } = renderHook(() => useSwipe({
        onSwipeLeft,
        onSwipeUp,
      }))

      // Act - Perfectly diagonal: left 100px, up 100px
      // When absDeltaX === absDeltaY, the condition (absDeltaX > absDeltaY) is false
      // So it falls to vertical swipe logic
      act(() => {
        result.current.onTouchStart(createTouchEvent(200, 200))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert - Vertical direction is triggered when X and Y are equal
      expect(onSwipeUp).toHaveBeenCalledTimes(1)
      expect(onSwipeLeft).not.toHaveBeenCalled()
    })
  })

  describe('Callback Stability', () => {
    it('should update behavior when callbacks change', () => {
      // Arrange
      const onSwipeLeft1 = vi.fn()
      const onSwipeLeft2 = vi.fn()
      const { result, rerender } = renderHook(
        ({ callback }) => useSwipe({ onSwipeLeft: callback }),
        { initialProps: { callback: onSwipeLeft1 } }
      )

      // Act - Swipe with first callback
      act(() => {
        result.current.onTouchStart(createTouchEvent(200, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Change callback
      rerender({ callback: onSwipeLeft2 })

      // Act - Swipe with second callback
      act(() => {
        result.current.onTouchStart(createTouchEvent(200, 100))
      })
      act(() => {
        result.current.onTouchMove(createTouchEvent(100, 100))
      })
      act(() => {
        result.current.onTouchEnd({} as React.TouchEvent)
      })

      // Assert
      expect(onSwipeLeft1).toHaveBeenCalledTimes(1)
      expect(onSwipeLeft2).toHaveBeenCalledTimes(1)
    })
  })
})
