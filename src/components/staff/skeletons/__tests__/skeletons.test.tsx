import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BookingCardSkeleton } from '../booking-card-skeleton'
import { StatsCardSkeleton } from '../stats-card-skeleton'
import { BookingTimelineSkeleton } from '../booking-timeline-skeleton'

describe('BookingCardSkeleton', () => {
  it('should render without crashing', () => {
    render(<BookingCardSkeleton />)
    // Skeleton renders structural elements
    expect(document.querySelector('.animate-shimmer')).toBeInTheDocument()
  })

  it('should have contain: paint style for paint isolation', () => {
    const { container } = render(<BookingCardSkeleton />)
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.style.contain).toBe('paint')
  })

  it('should render absolute-positioned accent line', () => {
    const { container } = render(<BookingCardSkeleton />)
    const accentLine = container.querySelector('.absolute.top-0.left-0.right-0.h-1')
    expect(accentLine).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    const { container } = render(<BookingCardSkeleton className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('StatsCardSkeleton', () => {
  it('should render without crashing', () => {
    render(<StatsCardSkeleton />)
    expect(document.querySelector('.animate-shimmer')).toBeInTheDocument()
  })

  it('should have contain: paint style for paint isolation', () => {
    const { container } = render(<StatsCardSkeleton />)
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.style.contain).toBe('paint')
  })

  it('should have tablet-landscape:hidden description skeleton', () => {
    const { container } = render(<StatsCardSkeleton />)
    const hiddenElement = container.querySelector('.tablet-landscape\\:hidden')
    expect(hiddenElement).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    const { container } = render(<StatsCardSkeleton className="my-custom" />)
    expect(container.firstChild).toHaveClass('my-custom')
  })
})

describe('BookingTimelineSkeleton', () => {
  it('should render without crashing', () => {
    render(<BookingTimelineSkeleton />)
    expect(document.querySelector('.animate-shimmer')).toBeInTheDocument()
  })

  it('should have contain: paint style for paint isolation', () => {
    const { container } = render(<BookingTimelineSkeleton />)
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.style.contain).toBe('paint')
  })

  it('should render 3 timeline items', () => {
    const { container } = render(<BookingTimelineSkeleton />)
    // Each timeline item has a rounded-full dot
    const timelineDots = container.querySelectorAll('.rounded-full')
    expect(timelineDots.length).toBe(3)
  })

  it('should accept custom className', () => {
    const { container } = render(<BookingTimelineSkeleton className="timeline-custom" />)
    expect(container.firstChild).toHaveClass('timeline-custom')
  })
})
