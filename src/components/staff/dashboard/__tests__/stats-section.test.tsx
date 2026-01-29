/**
 * Tests for StatsSection component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsSection } from '../stats-section'
import type { StaffStats } from '@/lib/queries/staff-bookings-queries'

// Mock child components
vi.mock('@/components/staff/stats-card', () => ({
  StatsCard: ({ title, value }: { title: string; value: string | number }) => (
    <div data-testid={`stat-${title}`}>{value}</div>
  ),
}))

vi.mock('@/components/staff/performance-chart', () => ({
  PerformanceChart: ({ stats }: { stats: { completedJobs: number } }) => (
    <div data-testid="performance-chart" data-completed-jobs={stats.completedJobs}>Performance Chart</div>
  ),
}))

describe('StatsSection', () => {
  const mockStats: StaffStats = {
    jobsToday: 3,
    jobsThisWeek: 12,
    totalTasks6Months: 145,
    completionRate: 92,
    averageRating: 4.5,
    reviewCount: 23,
    totalEarnings: 85000,
    monthlyData: [
      { month: 'Jan', jobs: 20, revenue: 15000 },
      { month: 'Feb', jobs: 25, revenue: 18000 },
    ],
  }

  it('should render loading skeletons when loading', () => {
    const { container } = render(<StatsSection stats={undefined} loading={true} />)

    // Should render 6 skeleton elements
    expect(container.querySelectorAll('.h-28, .h-32').length).toBeGreaterThanOrEqual(6)
  })

  it('should render all stat cards with correct values', () => {
    render(<StatsSection stats={mockStats} loading={false} />)

    expect(screen.getByTestId("stat-Today's Tasks")).toHaveTextContent('3')
    expect(screen.getByTestId('stat-This Week')).toHaveTextContent('12')
    expect(screen.getByTestId('stat-Total Tasks')).toHaveTextContent('145')
    expect(screen.getByTestId('stat-Completion')).toHaveTextContent('92%')
    expect(screen.getByTestId('stat-Rating')).toHaveTextContent('4.5')
    expect(screen.getByTestId('stat-Earnings')).toHaveTextContent('฿85,000')
  })

  it('should show N/A for rating when no reviews', () => {
    const noReviewStats = { ...mockStats, averageRating: 0, reviewCount: 0 }

    render(<StatsSection stats={noReviewStats} loading={false} />)

    expect(screen.getByTestId('stat-Rating')).toHaveTextContent('N/A')
  })

  it('should render performance chart when monthlyData exists', () => {
    render(<StatsSection stats={mockStats} loading={false} />)

    expect(screen.getByTestId('performance-chart')).toBeInTheDocument()
  })

  it('should compute completedJobs from totalTasks6Months and completionRate', () => {
    render(<StatsSection stats={mockStats} loading={false} />)

    const chart = screen.getByTestId('performance-chart')
    // 145 * 92 / 100 = 133.4 → rounded to 133
    expect(chart.getAttribute('data-completed-jobs')).toBe('133')
  })

  it('should not render performance chart when no monthlyData', () => {
    const noMonthlyStats = { ...mockStats, monthlyData: [] }

    render(<StatsSection stats={noMonthlyStats} loading={false} />)

    expect(screen.queryByTestId('performance-chart')).not.toBeInTheDocument()
  })

  it('should handle undefined stats gracefully', () => {
    render(<StatsSection stats={undefined} loading={false} />)

    expect(screen.getByTestId("stat-Today's Tasks")).toHaveTextContent('0')
    expect(screen.getByTestId('stat-Earnings')).toHaveTextContent('฿0')
  })
})
