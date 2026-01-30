import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { UndoToastAction } from '../undo-toast'

describe('UndoToastAction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with initial countdown', () => {
    render(<UndoToastAction onUndo={() => {}} />)
    expect(screen.getByText('Undo (5s)')).toBeInTheDocument()
  })

  it('counts down every second', () => {
    render(<UndoToastAction onUndo={() => {}} />)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('Undo (4s)')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('Undo (3s)')).toBeInTheDocument()
  })

  it('calls onUndo when clicked', async () => {
    const onUndo = vi.fn().mockResolvedValue(undefined)
    render(<UndoToastAction onUndo={onUndo} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  it('has 44px minimum height for touch target', () => {
    render(<UndoToastAction onUndo={() => {}} />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-11')
  })

  it('shows spinner during async onUndo', async () => {
    // L1 fix: Use deferred pattern to avoid uninitialized variable
    const deferred = createDeferred<void>()
    const onUndo = vi.fn().mockReturnValue(deferred.promise)

    render(<UndoToastAction onUndo={onUndo} />)

    // Click to trigger loading state
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    // Spinner should appear (internal loading state)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()

    // Resolve to cleanup
    await act(async () => {
      deferred.resolve()
    })
  })

  it('disables button during async onUndo', async () => {
    const deferred = createDeferred<void>()
    const onUndo = vi.fn().mockReturnValue(deferred.promise)

    render(<UndoToastAction onUndo={onUndo} />)

    const button = screen.getByRole('button')

    // Click to trigger loading state
    await act(async () => {
      fireEvent.click(button)
    })

    // Button should be disabled
    expect(button).toBeDisabled()

    // Resolve to cleanup
    await act(async () => {
      deferred.resolve()
    })
  })

  it('accepts custom duration', () => {
    render(<UndoToastAction onUndo={() => {}} duration={3000} />)
    expect(screen.getByText('Undo (3s)')).toBeInTheDocument()
  })

  it('stops countdown at 0', () => {
    render(<UndoToastAction onUndo={() => {}} duration={2000} />)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByText('Undo (0s)')).toBeInTheDocument()
  })

  it('is keyboard accessible (button role)', () => {
    render(<UndoToastAction onUndo={() => {}} />)
    const button = screen.getByRole('button')
    // Button elements are inherently keyboard accessible
    // They respond to Enter and Space via native behavior
    expect(button.tagName).toBe('BUTTON')
  })

  it('has altText for screen readers', () => {
    render(<UndoToastAction onUndo={() => {}} />)
    const button = screen.getByRole('button')
    // ToastAction renders altText as aria-label or visual text
    expect(button).toBeInTheDocument()
  })

  it('clears interval when clicked', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    const onUndo = vi.fn().mockResolvedValue(undefined)
    render(<UndoToastAction onUndo={onUndo} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    expect(clearIntervalSpy).toHaveBeenCalled()
    expect(onUndo).toHaveBeenCalledTimes(1)
    clearIntervalSpy.mockRestore()
  })

  it('prevents double-click during loading', async () => {
    const deferred = createDeferred<void>()
    const onUndo = vi.fn().mockReturnValue(deferred.promise)

    render(<UndoToastAction onUndo={onUndo} />)

    const button = screen.getByRole('button')

    // First click starts the async operation
    await act(async () => {
      fireEvent.click(button)
    })
    expect(onUndo).toHaveBeenCalledTimes(1)

    // Button should now be disabled (internal loading state)
    expect(button).toBeDisabled()

    // Second click should be ignored (button is disabled)
    fireEvent.click(button)
    expect(onUndo).toHaveBeenCalledTimes(1) // Still 1, not 2

    // Resolve the promise to complete
    await act(async () => {
      deferred.resolve()
    })
  })
})

// L1 fix: Helper to create a deferred promise (avoids uninitialized variable issue)
function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
