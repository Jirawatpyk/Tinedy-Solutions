import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PullToRefresh } from '../pull-to-refresh'

describe('PullToRefresh', () => {
  const mockOnRefresh = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render children', () => {
    render(
      <PullToRefresh onRefresh={mockOnRefresh}>
        <div data-testid="child">Content</div>
      </PullToRefresh>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('should apply className to scroll container', () => {
    const { container } = render(
      <PullToRefresh onRefresh={mockOnRefresh} className="custom-scroll">
        <div>Content</div>
      </PullToRefresh>
    )

    expect(container.firstChild).toHaveClass('custom-scroll')
  })

  it('should apply contentClassName to inner content div', () => {
    const { container } = render(
      <PullToRefresh onRefresh={mockOnRefresh} contentClassName="inner-content">
        <div>Content</div>
      </PullToRefresh>
    )

    // Content wrapper is the last child inside the scroll container
    const scrollContainer = container.firstChild as HTMLElement
    const contentDiv = scrollContainer.lastChild as HTMLElement
    expect(contentDiv).toHaveClass('inner-content')
  })

  it('should have overflow-y-auto on container', () => {
    const { container } = render(
      <PullToRefresh onRefresh={mockOnRefresh}>
        <div>Content</div>
      </PullToRefresh>
    )

    expect(container.firstChild).toHaveClass('overflow-y-auto')
  })

  it('should have touch-action and overscroll-behavior styles', () => {
    const { container } = render(
      <PullToRefresh onRefresh={mockOnRefresh}>
        <div>Content</div>
      </PullToRefresh>
    )

    const scrollContainer = container.firstChild as HTMLElement
    expect(scrollContainer.style.touchAction).toBe('pan-y')
    expect(scrollContainer.style.overscrollBehaviorY).toBe('none')
  })

  // Note: Touch gesture tests are limited in happy-dom because scrollTop isn't properly simulated.
  // The following tests verify the component structure and props; actual pull gesture
  // behavior should be tested manually on real iOS devices per tech-spec.

  it('should show pull indicator container', () => {
    const { container } = render(
      <PullToRefresh onRefresh={mockOnRefresh} threshold={60}>
        <div>Content</div>
      </PullToRefresh>
    )

    const scrollContainer = container.firstChild as HTMLElement
    // Pull indicator div exists (starts hidden with opacity-0)
    const indicatorDiv = scrollContainer.querySelector('.transition-all.duration-200')
    expect(indicatorDiv).toBeInTheDocument()
  })

  it('should handle touch events without errors', () => {
    const { container } = render(
      <PullToRefresh onRefresh={mockOnRefresh} threshold={60}>
        <div>Content</div>
      </PullToRefresh>
    )

    const scrollContainer = container.firstChild as HTMLElement

    // These should not throw
    expect(() => {
      fireEvent.touchStart(scrollContainer, {
        touches: [{ clientY: 0 }],
      })
      fireEvent.touchMove(scrollContainer, {
        touches: [{ clientY: 50 }],
      })
      fireEvent.touchEnd(scrollContainer)
    }).not.toThrow()
  })

  it('should NOT call onRefresh when released before threshold', async () => {
    const { container } = render(
      <PullToRefresh onRefresh={mockOnRefresh} threshold={60}>
        <div>Content</div>
      </PullToRefresh>
    )

    const scrollContainer = container.firstChild as HTMLElement

    // Simulate small pull (not enough to trigger)
    fireEvent.touchStart(scrollContainer, {
      touches: [{ clientY: 0 }],
    })

    fireEvent.touchMove(scrollContainer, {
      touches: [{ clientY: 30 }],
    })

    fireEvent.touchEnd(scrollContainer)

    // Wait a bit and verify no call
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(mockOnRefresh).not.toHaveBeenCalled()
  })
})
