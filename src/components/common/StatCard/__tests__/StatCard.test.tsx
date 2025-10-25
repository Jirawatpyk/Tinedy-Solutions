/**
 * Test Suite: StatCard Component
 *
 * Tests for the StatCard display component used throughout dashboards.
 * Covers rendering with various props, loading states, trends, and actions.
 *
 * Coverage Target: 100% (presentation component)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Calendar, DollarSign } from 'lucide-react'
import { StatCard } from '../StatCard'

describe('StatCard', () => {
  describe('Basic Rendering', () => {
    it('should render with required props', () => {
      // Arrange & Act
      render(<StatCard title="Total Revenue" value="$12,345" />)

      // Assert
      expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      expect(screen.getByText('$12,345')).toBeInTheDocument()
    })

    it('should render with numeric value', () => {
      // Arrange & Act
      render(<StatCard title="Total Bookings" value={150} />)

      // Assert
      expect(screen.getByText('Total Bookings')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
    })

    it('should render with description', () => {
      // Arrange & Act
      render(
        <StatCard
          title="Pending Bookings"
          value={5}
          description="Awaiting confirmation"
        />
      )

      // Assert
      expect(screen.getByText('Pending Bookings')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Awaiting confirmation')).toBeInTheDocument()
    })

    it('should render zero value correctly', () => {
      // Arrange & Act
      render(<StatCard title="Cancelled" value={0} />)

      // Assert
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should render empty string value', () => {
      // Arrange & Act
      render(<StatCard title="Status" value="" />)

      // Assert
      expect(screen.getByText('Status')).toBeInTheDocument()
    })
  })

  describe('Icon Rendering', () => {
    it('should render with icon', () => {
      // Arrange & Act
      render(
        <StatCard
          title="Total Bookings"
          value={150}
          icon={Calendar}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
      )

      // Assert
      expect(screen.getByText('Total Bookings')).toBeInTheDocument()
      // Icon is rendered as SVG element
      const iconContainer = screen.getByText('Total Bookings').parentElement?.querySelector('svg')
      expect(iconContainer).toBeInTheDocument()
    })

    it('should apply custom icon colors', () => {
      // Arrange & Act
      const { container } = render(
        <StatCard
          title="Revenue"
          value="$10,000"
          icon={DollarSign}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
      )

      // Assert
      const iconDiv = container.querySelector('.bg-green-100')
      expect(iconDiv).toBeInTheDocument()
      const iconSvg = container.querySelector('.text-green-600')
      expect(iconSvg).toBeInTheDocument()
    })

    it('should render without icon when not provided', () => {
      // Arrange & Act
      render(<StatCard title="Total" value={100} />)

      // Assert
      expect(screen.getByText('Total')).toBeInTheDocument()
      // No icon container should be present
      const cardHeader = screen.getByText('Total').parentElement
      expect(cardHeader?.querySelectorAll('svg')).toHaveLength(0)
    })
  })

  describe('Trend Indicators', () => {
    it('should render upward trend', () => {
      // Arrange & Act
      render(
        <StatCard
          title="Revenue"
          value="$15,000"
          trend={{
            value: '+12%',
            direction: 'up',
            label: 'from last month',
          }}
        />
      )

      // Assert
      expect(screen.getByText('+12%')).toBeInTheDocument()
      expect(screen.getByText('from last month')).toBeInTheDocument()
    })

    it('should render downward trend', () => {
      // Arrange & Act
      render(
        <StatCard
          title="Cancellations"
          value={5}
          trend={{
            value: '-20%',
            direction: 'down',
            label: 'from last week',
          }}
        />
      )

      // Assert
      expect(screen.getByText('-20%')).toBeInTheDocument()
      expect(screen.getByText('from last week')).toBeInTheDocument()
    })

    it('should render neutral trend', () => {
      // Arrange & Act
      render(
        <StatCard
          title="Bookings"
          value={100}
          trend={{
            value: '0%',
            direction: 'neutral',
          }}
        />
      )

      // Assert
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('should render trend without label', () => {
      // Arrange & Act
      render(
        <StatCard
          title="Growth"
          value="$5,000"
          trend={{
            value: '+5%',
            direction: 'up',
          }}
        />
      )

      // Assert
      expect(screen.getByText('+5%')).toBeInTheDocument()
    })

    it('should render trend with description', () => {
      // Arrange & Act
      render(
        <StatCard
          title="Sales"
          value="$20,000"
          description="This month"
          trend={{
            value: '+15%',
            direction: 'up',
            label: 'vs last month',
          }}
        />
      )

      // Assert
      expect(screen.getByText('This month')).toBeInTheDocument()
      expect(screen.getByText('+15%')).toBeInTheDocument()
      expect(screen.getByText('vs last month')).toBeInTheDocument()
    })
  })

  describe('Action Button', () => {
    it('should render action button', () => {
      // Arrange
      const handleClick = vi.fn()

      // Act
      render(
        <StatCard
          title="Pending"
          value={10}
          action={{
            label: 'View all',
            onClick: handleClick,
          }}
        />
      )

      // Assert
      const button = screen.getByRole('button', { name: /view all/i })
      expect(button).toBeInTheDocument()
    })

    it('should call onClick when action button is clicked', async () => {
      // Arrange
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(
        <StatCard
          title="Pending"
          value={10}
          action={{
            label: 'View all',
            onClick: handleClick,
          }}
        />
      )

      // Act
      const button = screen.getByRole('button', { name: /view all/i })
      await user.click(button)

      // Assert
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should render without action button when not provided', () => {
      // Arrange & Act
      render(<StatCard title="Total" value={100} />)

      // Assert
      const buttons = screen.queryByRole('button')
      expect(buttons).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should render loading skeletons when isLoading is true', () => {
      // Arrange & Act
      render(<StatCard title="Loading" value={0} isLoading={true} />)

      // Assert
      // Should not render the actual content
      expect(screen.queryByText('Loading')).not.toBeInTheDocument()
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('should not render loading skeletons when isLoading is false', () => {
      // Arrange & Act
      render(<StatCard title="Revenue" value="$10,000" isLoading={false} />)

      // Assert
      expect(screen.getByText('Revenue')).toBeInTheDocument()
      expect(screen.getByText('$10,000')).toBeInTheDocument()
    })

    it('should render loading skeletons by default when isLoading is undefined', () => {
      // Arrange & Act
      render(<StatCard title="Test" value={123} />)

      // Assert
      // Default is false, so content should be visible
      expect(screen.getByText('Test')).toBeInTheDocument()
      expect(screen.getByText('123')).toBeInTheDocument()
    })
  })

  describe('Complex Scenarios', () => {
    it('should render with all props combined', () => {
      // Arrange
      const handleClick = vi.fn()

      // Act
      render(
        <StatCard
          title="Monthly Revenue"
          value="$45,000"
          description="From completed bookings"
          icon={DollarSign}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          trend={{
            value: '+25%',
            direction: 'up',
            label: 'from last month',
          }}
          action={{
            label: 'View Details',
            onClick: handleClick,
          }}
        />
      )

      // Assert
      expect(screen.getByText('Monthly Revenue')).toBeInTheDocument()
      expect(screen.getByText('$45,000')).toBeInTheDocument()
      expect(screen.getByText('From completed bookings')).toBeInTheDocument()
      expect(screen.getByText('+25%')).toBeInTheDocument()
      expect(screen.getByText('from last month')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument()
    })

    it('should render multiple StatCards independently', () => {
      // Arrange & Act
      render(
        <>
          <StatCard title="Card 1" value={100} />
          <StatCard title="Card 2" value={200} />
          <StatCard title="Card 3" value={300} />
        </>
      )

      // Assert
      expect(screen.getByText('Card 1')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('Card 2')).toBeInTheDocument()
      expect(screen.getByText('200')).toBeInTheDocument()
      expect(screen.getByText('Card 3')).toBeInTheDocument()
      expect(screen.getByText('300')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large numeric values', () => {
      // Arrange & Act
      render(<StatCard title="Large Number" value={999999999} />)

      // Assert
      expect(screen.getByText('999999999')).toBeInTheDocument()
    })

    it('should handle very long string values', () => {
      // Arrange
      const longValue = 'A'.repeat(100)

      // Act
      render(<StatCard title="Long Value" value={longValue} />)

      // Assert
      expect(screen.getByText(longValue)).toBeInTheDocument()
    })

    it('should handle very long description', () => {
      // Arrange
      const longDescription = 'This is a very long description. '.repeat(10)

      // Act
      render(<StatCard title="Test" value={123} description={longDescription} />)

      // Assert
      // Use regex for partial match as long text may be normalized differently
      expect(screen.getByText(/This is a very long description/i)).toBeInTheDocument()
    })

    it('should handle negative numeric values', () => {
      // Arrange & Act
      render(<StatCard title="Loss" value={-500} />)

      // Assert
      expect(screen.getByText('-500')).toBeInTheDocument()
    })

    it('should handle decimal values', () => {
      // Arrange & Act
      render(<StatCard title="Average" value="$1,234.56" />)

      // Assert
      expect(screen.getByText('$1,234.56')).toBeInTheDocument()
    })
  })
})
