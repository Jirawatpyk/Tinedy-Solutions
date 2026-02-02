import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CardSkeleton, TableRowSkeleton, FormFieldSkeleton, ListItemSkeleton } from '../'

describe('CardSkeleton', () => {
  it('renders with default shimmer wrapper', () => {
    const { container } = render(<CardSkeleton />)
    expect(container.querySelector('[style*="contain: paint"]')).toBeInTheDocument()
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument()
  })

  it('renders without shimmer wrapper when shimmer={false}', () => {
    const { container } = render(<CardSkeleton shimmer={false} />)
    expect(container.querySelector('[style*="contain"]')).toBeNull()
    expect(container.querySelector('.animate-shimmer')).toBeNull()
  })

  it('renders default variant with content area', () => {
    const { container } = render(<CardSkeleton variant="default" />)
    expect(container.querySelector('.space-y-2')).toBeInTheDocument()
  })

  it('renders compact variant without content area', () => {
    const { container } = render(<CardSkeleton variant="compact" />)
    expect(container.querySelector('.space-y-2')).toBeNull()
  })

  it('passes className to card element', () => {
    const { container } = render(<CardSkeleton className="custom-class" />)
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('applies animation delay when delay prop provided', () => {
    const { container } = render(<CardSkeleton delay={150} />)
    const shimmerOverlay = container.querySelector('.animate-shimmer')
    expect(shimmerOverlay).toHaveStyle({ animationDelay: '150ms' })
  })
})

describe('TableRowSkeleton', () => {
  it('renders default 4 columns', () => {
    render(<table><tbody><TableRowSkeleton /></tbody></table>)
    expect(screen.getAllByRole('cell')).toHaveLength(4)
  })

  it('renders correct number of columns', () => {
    render(<table><tbody><TableRowSkeleton columns={5} /></tbody></table>)
    expect(screen.getAllByRole('cell')).toHaveLength(5)
  })

  it('renders with pulse animation (no shimmer)', () => {
    const { container } = render(<table><tbody><TableRowSkeleton /></tbody></table>)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(container.querySelector('.animate-shimmer')).toBeNull()
  })

  it('passes className to tr element', () => {
    const { container } = render(<table><tbody><TableRowSkeleton className="custom-row" /></tbody></table>)
    expect(container.querySelector('.custom-row')).toBeInTheDocument()
  })
})

describe('FormFieldSkeleton', () => {
  it('renders label and input skeletons', () => {
    const { container } = render(<FormFieldSkeleton />)
    const skeletons = container.querySelectorAll('.bg-muted')
    expect(skeletons.length).toBeGreaterThanOrEqual(2)
  })

  it('renders with shimmer by default', () => {
    const { container } = render(<FormFieldSkeleton />)
    expect(container.querySelector('[style*="contain: paint"]')).toBeInTheDocument()
  })

  it('renders without shimmer when shimmer={false}', () => {
    const { container } = render(<FormFieldSkeleton shimmer={false} />)
    expect(container.querySelector('[style*="contain"]')).toBeNull()
  })

  it('passes className to wrapper', () => {
    const { container } = render(<FormFieldSkeleton className="custom-field" />)
    expect(container.querySelector('.custom-field')).toBeInTheDocument()
  })
})

describe('ListItemSkeleton', () => {
  it('renders avatar when showAvatar={true} (default)', () => {
    const { container } = render(<ListItemSkeleton />)
    expect(container.querySelector('.rounded-full')).toBeInTheDocument()
  })

  it('hides avatar when showAvatar={false}', () => {
    const { container } = render(<ListItemSkeleton showAvatar={false} />)
    expect(container.querySelector('.rounded-full')).toBeNull()
  })

  it('renders with shimmer by default', () => {
    const { container } = render(<ListItemSkeleton />)
    expect(container.querySelector('[style*="contain: paint"]')).toBeInTheDocument()
  })

  it('renders without shimmer when shimmer={false}', () => {
    const { container } = render(<ListItemSkeleton shimmer={false} />)
    expect(container.querySelector('[style*="contain"]')).toBeNull()
  })

  it('passes className to content wrapper', () => {
    const { container } = render(<ListItemSkeleton className="custom-item" />)
    expect(container.querySelector('.custom-item')).toBeInTheDocument()
  })

  it('applies animation delay', () => {
    const { container } = render(<ListItemSkeleton delay={300} />)
    const shimmerOverlay = container.querySelector('.animate-shimmer')
    expect(shimmerOverlay).toHaveStyle({ animationDelay: '300ms' })
  })
})
