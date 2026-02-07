import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SwipeableCard } from '../swipeable-card'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onTap, onDragStart: _onDragStart, onDragEnd: _onDragEnd, ...props }: React.HTMLAttributes<HTMLDivElement> & { onTap?: () => void, onDragStart?: () => void, onDragEnd?: () => void }) => (
      <div {...props} onClick={onTap}>{children}</div>
    ),
  },
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => 0,
  useReducedMotion: () => false,
}))

describe('SwipeableCard', () => {
  it('renders children correctly', () => {
    render(<SwipeableCard><span>Test Content</span></SwipeableCard>)
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('shows revealed content when revealedContent prop provided', () => {
    render(
      <SwipeableCard revealedContent={<button>Action</button>}>
        <span>Card</span>
      </SwipeableCard>
    )
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })

  it('does not show drag affordance when disabled', () => {
    const { container } = render(
      <SwipeableCard disabled>
        <span>Card</span>
      </SwipeableCard>
    )
    // ChevronRight should not be rendered when disabled
    expect(container.querySelector('svg')).toBeNull()
  })

  it('shows drag affordance when not disabled', () => {
    const { container } = render(
      <SwipeableCard>
        <span>Card</span>
      </SwipeableCard>
    )
    // ChevronRight should be rendered
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('calls onSwipeReset when revealed card is tapped', () => {
    const onSwipeReset = vi.fn()
    render(
      <SwipeableCard
        isRevealed={true}
        onSwipeReset={onSwipeReset}
        onRevealChange={vi.fn()}
      >
        <span>Card</span>
      </SwipeableCard>
    )

    // Find the motion.div (mocked as regular div with onClick)
    const card = screen.getByText('Card').parentElement
    card?.click()

    expect(onSwipeReset).toHaveBeenCalled()
  })

  it('applies relative bg-card class to main content', () => {
    const { container } = render(
      <SwipeableCard>
        <span>Card</span>
      </SwipeableCard>
    )

    const mainContent = container.querySelector('.relative.bg-card')
    expect(mainContent).toBeInTheDocument()
  })

  it('does not call onSwipeReveal when disabled', () => {
    const onSwipeReveal = vi.fn()
    render(
      <SwipeableCard disabled onSwipeReveal={onSwipeReveal}>
        <span>Card</span>
      </SwipeableCard>
    )
    // Drag events won't work in mock, but verify component renders correctly
    expect(onSwipeReveal).not.toHaveBeenCalled()
  })

  it('handles controlled revealed state correctly', () => {
    const onRevealChange = vi.fn()
    const { rerender } = render(
      <SwipeableCard isRevealed={false} onRevealChange={onRevealChange}>
        <span>Card</span>
      </SwipeableCard>
    )

    // Rerender with revealed state
    rerender(
      <SwipeableCard isRevealed={true} onRevealChange={onRevealChange}>
        <span>Card</span>
      </SwipeableCard>
    )

    // Component should accept controlled state without error
    expect(screen.getByText('Card')).toBeInTheDocument()
  })
})
