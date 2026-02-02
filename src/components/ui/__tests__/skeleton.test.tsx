import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Skeleton } from '../skeleton'

describe('Skeleton', () => {
  it('renders with shimmer by default', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />)
    expect(container.querySelector('[style*="contain: paint"]')).toBeInTheDocument()
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument()
  })

  it('renders without shimmer when shimmer={false}', () => {
    const { container } = render(<Skeleton shimmer={false} className="h-4 w-20" />)
    expect(container.querySelector('[style*="contain"]')).toBeNull()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('applies animation delay when delay prop provided', () => {
    const { container } = render(<Skeleton delay={200} />)
    const shimmerOverlay = container.querySelector('.animate-shimmer')
    expect(shimmerOverlay).toHaveStyle({ animationDelay: '200ms' })
  })

  it('does not apply animation delay when delay is 0', () => {
    const { container } = render(<Skeleton delay={0} />)
    const shimmerOverlay = container.querySelector('.animate-shimmer')
    expect(shimmerOverlay?.getAttribute('style')).toBeNull()
  })

  it('passes className to root element', () => {
    const { container } = render(<Skeleton className="custom-class h-10" />)
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('merges className with default classes when shimmer={false}', () => {
    const { container } = render(<Skeleton shimmer={false} className="custom-class" />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton.className).toContain('animate-pulse')
    expect(skeleton.className).toContain('custom-class')
  })

  it('merges className with default classes when shimmer={true}', () => {
    const { container } = render(<Skeleton className="custom-class" />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton.className).toContain('overflow-hidden')
    expect(skeleton.className).toContain('custom-class')
  })

  it('passes additional HTML attributes', () => {
    const { container } = render(<Skeleton data-testid="test-skeleton" />)
    expect(container.querySelector('[data-testid="test-skeleton"]')).toBeInTheDocument()
  })
})
