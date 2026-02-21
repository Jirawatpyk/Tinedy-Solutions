import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeeklyOverview } from '../WeeklyOverview'
import type { WeeklyBookingDay, WeeklyDayLabel } from '@/types/dashboard'

const LABELS: WeeklyDayLabel[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const makeDays = (counts: number[], todayIndex = 2): WeeklyBookingDay[] => {
  const baseDate = new Date('2026-02-16') // Known Monday (UTC)
  return LABELS.map((dayLabel, i) => {
    const d = new Date(baseDate)
    d.setUTCDate(d.getUTCDate() + i)
    return {
      date: d.toISOString().split('T')[0],
      dayLabel,
      count: counts[i] ?? 0,
      isToday: i === todayIndex,
    }
  })
}

describe('WeeklyOverview', () => {
  it('renders all 7 day labels', () => {
    render(<WeeklyOverview days={makeDays([1, 2, 3, 0, 5, 1, 0])} />)
    ;['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  it('renders booking counts', () => {
    render(<WeeklyOverview days={makeDays([3, 0, 7, 2, 1, 0, 4])} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('renders loading skeleton when loading=true', () => {
    const { container } = render(<WeeklyOverview days={[]} loading />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('does not throw when all counts are 0 (max=1 guard)', () => {
    expect(() =>
      render(<WeeklyOverview days={makeDays([0, 0, 0, 0, 0, 0, 0])} />)
    ).not.toThrow()
  })

  it('shows "This Week" header', () => {
    render(<WeeklyOverview days={makeDays([1, 2, 3, 4, 5, 6, 7])} />)
    expect(screen.getByText('This Week')).toBeInTheDocument()
  })

  it('shows dash instead of 0 for empty days', () => {
    render(<WeeklyOverview days={makeDays([0, 5, 0, 2, 0, 0, 1])} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBe(4) // Mon, Wed, Fri, Sat = 0
  })

  it('marks today row with data-testid', () => {
    const { container } = render(<WeeklyOverview days={makeDays([1, 2, 3, 4, 5, 6, 7], 3)} />)
    expect(container.querySelector('[data-testid="today-row"]')).toBeTruthy()
  })

  it('assigns data-testid to non-today rows', () => {
    const { container } = render(<WeeklyOverview days={makeDays([1, 2, 3, 4, 5, 6, 7], 0)} />)
    // Mon is today (index 0), so Tue-Sun should have day-row-* testids
    expect(container.querySelector('[data-testid="day-row-tue"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="day-row-sun"]')).toBeTruthy()
  })

  it('shows error message when error=true', () => {
    render(<WeeklyOverview days={[]} error />)
    expect(screen.getByText('Unable to load weekly data')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('has accessible progressbar roles with aria-label', () => {
    render(<WeeklyOverview days={makeDays([3, 0, 5, 0, 0, 0, 0])} />)
    const bars = screen.getAllByRole('progressbar')
    expect(bars).toHaveLength(7)
    expect(bars[0]).toHaveAttribute('aria-label', 'Mon: 3 bookings')
  })

  it('shows empty state when days array is empty', () => {
    render(<WeeklyOverview days={[]} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })
})
