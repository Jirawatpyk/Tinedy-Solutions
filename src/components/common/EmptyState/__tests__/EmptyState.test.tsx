/**
 * Test Suite: EmptyState Component
 *
 * Tests for the EmptyState component used when lists/collections are empty.
 * Covers rendering with various configurations, actions, and edge cases.
 *
 * Coverage Target: 100% (presentation component)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Calendar, Plus, Users } from 'lucide-react'
import { EmptyState } from '../EmptyState'

describe('EmptyState', () => {
  describe('Basic Rendering', () => {
    it('should render with required props', () => {
      // Arrange & Act
      render(<EmptyState title="No bookings found" />)

      // Assert
      expect(screen.getByText('No bookings found')).toBeInTheDocument()
    })

    it('should render with title and description', () => {
      // Arrange & Act
      render(
        <EmptyState
          title="No customers yet"
          description="Add your first customer to get started"
        />
      )

      // Assert
      expect(screen.getByText('No customers yet')).toBeInTheDocument()
      expect(screen.getByText('Add your first customer to get started')).toBeInTheDocument()
    })

    it('should render without description', () => {
      // Arrange & Act
      render(<EmptyState title="Empty list" />)

      // Assert
      expect(screen.getByText('Empty list')).toBeInTheDocument()
    })

    it('should render with empty string description', () => {
      // Arrange & Act
      render(<EmptyState title="No data" description="" />)

      // Assert
      expect(screen.getByText('No data')).toBeInTheDocument()
    })
  })

  describe('Icon Rendering', () => {
    it('should render with icon', () => {
      // Arrange & Act
      render(
        <EmptyState
          icon={Calendar}
          title="No bookings"
          description="Create your first booking"
        />
      )

      // Assert
      expect(screen.getByText('No bookings')).toBeInTheDocument()
      // Icon is rendered as SVG
      const container = screen.getByText('No bookings').parentElement
      const icon = container?.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should render without icon when not provided', () => {
      // Arrange & Act
      const { container } = render(<EmptyState title="No data" />)

      // Assert
      // No icon container should be present
      const iconContainer = container.querySelector('.bg-muted')
      expect(iconContainer).not.toBeInTheDocument()
    })

    it('should render with different icon types', () => {
      // Arrange & Act
      const { rerender } = render(
        <EmptyState icon={Users} title="No users" />
      )

      // Assert
      expect(screen.getByText('No users')).toBeInTheDocument()

      // Rerender with different icon
      rerender(<EmptyState icon={Calendar} title="No bookings" />)
      expect(screen.getByText('No bookings')).toBeInTheDocument()
    })
  })

  describe('Primary Action', () => {
    it('should render primary action button', () => {
      // Arrange
      const handleClick = vi.fn()

      // Act
      render(
        <EmptyState
          title="No bookings"
          action={{
            label: 'Create Booking',
            onClick: handleClick,
          }}
        />
      )

      // Assert
      expect(screen.getByRole('button', { name: /create booking/i })).toBeInTheDocument()
    })

    it('should call onClick when primary action is clicked', async () => {
      // Arrange
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(
        <EmptyState
          title="No data"
          action={{
            label: 'Add Data',
            onClick: handleClick,
          }}
        />
      )

      // Act
      const button = screen.getByRole('button', { name: /add data/i })
      await user.click(button)

      // Assert
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should render action with icon', () => {
      // Arrange
      const handleClick = vi.fn()

      // Act
      render(
        <EmptyState
          title="No bookings"
          action={{
            label: 'Create Booking',
            onClick: handleClick,
            icon: Plus,
          }}
        />
      )

      // Assert
      const button = screen.getByRole('button', { name: /create booking/i })
      expect(button).toBeInTheDocument()
      // Icon is rendered inside the button
      expect(button.querySelector('svg')).toBeInTheDocument()
    })

    it('should render action without icon', () => {
      // Arrange
      const handleClick = vi.fn()

      // Act
      render(
        <EmptyState
          title="No data"
          action={{
            label: 'Add Item',
            onClick: handleClick,
          }}
        />
      )

      // Assert
      const button = screen.getByRole('button', { name: /add item/i })
      expect(button).toBeInTheDocument()
    })

    it('should not render action button when action is not provided', () => {
      // Arrange & Act
      render(<EmptyState title="No data" />)

      // Assert
      const buttons = screen.queryAllByRole('button')
      expect(buttons).toHaveLength(0)
    })
  })

  describe('Secondary Action', () => {
    it('should render secondary action button', () => {
      // Arrange
      const handleSecondaryClick = vi.fn()

      // Act
      render(
        <EmptyState
          title="No customers"
          secondaryAction={{
            label: 'Import from CSV',
            onClick: handleSecondaryClick,
          }}
        />
      )

      // Assert
      expect(screen.getByRole('button', { name: /import from csv/i })).toBeInTheDocument()
    })

    it('should call onClick when secondary action is clicked', async () => {
      // Arrange
      const handleSecondaryClick = vi.fn()
      const user = userEvent.setup()

      render(
        <EmptyState
          title="No data"
          secondaryAction={{
            label: 'Import',
            onClick: handleSecondaryClick,
          }}
        />
      )

      // Act
      const button = screen.getByRole('button', { name: /import/i })
      await user.click(button)

      // Assert
      expect(handleSecondaryClick).toHaveBeenCalledTimes(1)
    })

    it('should render both primary and secondary actions', () => {
      // Arrange
      const handlePrimaryClick = vi.fn()
      const handleSecondaryClick = vi.fn()

      // Act
      render(
        <EmptyState
          title="No customers"
          action={{
            label: 'Add Customer',
            onClick: handlePrimaryClick,
          }}
          secondaryAction={{
            label: 'Import CSV',
            onClick: handleSecondaryClick,
          }}
        />
      )

      // Assert
      expect(screen.getByRole('button', { name: /add customer/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /import csv/i })).toBeInTheDocument()
    })

    it('should call correct handler for each action', async () => {
      // Arrange
      const handlePrimaryClick = vi.fn()
      const handleSecondaryClick = vi.fn()
      const user = userEvent.setup()

      render(
        <EmptyState
          title="No data"
          action={{
            label: 'Primary',
            onClick: handlePrimaryClick,
          }}
          secondaryAction={{
            label: 'Secondary',
            onClick: handleSecondaryClick,
          }}
        />
      )

      // Act
      await user.click(screen.getByRole('button', { name: /primary/i }))
      await user.click(screen.getByRole('button', { name: /secondary/i }))

      // Assert
      expect(handlePrimaryClick).toHaveBeenCalledTimes(1)
      expect(handleSecondaryClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Custom ClassName', () => {
    it('should accept and apply custom className', () => {
      // Arrange & Act
      const { container } = render(
        <EmptyState title="No data" className="custom-empty-state" />
      )

      // Assert
      const emptyState = container.querySelector('.custom-empty-state')
      expect(emptyState).toBeInTheDocument()
    })

    it('should merge custom className with default classes', () => {
      // Arrange & Act
      const { container } = render(
        <EmptyState title="No data" className="my-8 bg-white" />
      )

      // Assert
      const emptyState = container.querySelector('.my-8')
      expect(emptyState).toBeInTheDocument()
      expect(emptyState).toHaveClass('bg-white')
      expect(emptyState).toHaveClass('flex') // Default class
    })
  })

  describe('Complex Scenarios', () => {
    it('should render with all props combined', () => {
      // Arrange
      const handlePrimaryClick = vi.fn()
      const handleSecondaryClick = vi.fn()

      // Act
      render(
        <EmptyState
          icon={Users}
          title="No customers found"
          description="Add customers to start managing your client base"
          action={{
            label: 'Add Customer',
            onClick: handlePrimaryClick,
            icon: Plus,
          }}
          secondaryAction={{
            label: 'Import from CSV',
            onClick: handleSecondaryClick,
          }}
          className="my-custom-class"
        />
      )

      // Assert
      expect(screen.getByText('No customers found')).toBeInTheDocument()
      expect(screen.getByText('Add customers to start managing your client base')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add customer/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /import from csv/i })).toBeInTheDocument()
    })

    it('should render multiple instances independently', () => {
      // Arrange & Act
      render(
        <>
          <EmptyState title="Empty 1" description="Description 1" />
          <EmptyState title="Empty 2" description="Description 2" />
        </>
      )

      // Assert
      expect(screen.getByText('Empty 1')).toBeInTheDocument()
      expect(screen.getByText('Description 1')).toBeInTheDocument()
      expect(screen.getByText('Empty 2')).toBeInTheDocument()
      expect(screen.getByText('Description 2')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long title', () => {
      // Arrange
      const longTitle = 'A'.repeat(100)

      // Act
      render(<EmptyState title={longTitle} />)

      // Assert
      expect(screen.getByText(longTitle)).toBeInTheDocument()
    })

    it('should handle very long description', () => {
      // Arrange
      const longDescription = 'This is a very long description. '.repeat(20)

      // Act
      render(<EmptyState title="Title" description={longDescription} />)

      // Assert
      // Use regex for partial match as long text may be normalized differently
      expect(screen.getByText(/This is a very long description/i)).toBeInTheDocument()
    })

    it('should handle very long action labels', () => {
      // Arrange
      const longLabel = 'A'.repeat(50)

      // Act
      render(
        <EmptyState
          title="Title"
          action={{
            label: longLabel,
            onClick: vi.fn(),
          }}
        />
      )

      // Assert
      expect(screen.getByRole('button', { name: longLabel })).toBeInTheDocument()
    })

    it('should handle special characters in text', () => {
      // Arrange & Act
      render(
        <EmptyState
          title="No data found <>&"
          description="Try adjusting your filters (if any)"
        />
      )

      // Assert
      expect(screen.getByText('No data found <>&')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your filters (if any)')).toBeInTheDocument()
    })

    it('should handle unicode characters', () => {
      // Arrange & Act
      render(
        <EmptyState
          title="ไม่พบข้อมูล"
          description="กรุณาเพิ่มข้อมูลใหม่"
        />
      )

      // Assert
      expect(screen.getByText('ไม่พบข้อมูล')).toBeInTheDocument()
      expect(screen.getByText('กรุณาเพิ่มข้อมูลใหม่')).toBeInTheDocument()
    })
  })

  describe('Real-world Usage Scenarios', () => {
    it('should render empty bookings state', () => {
      // Arrange
      const handleCreate = vi.fn()

      // Act
      render(
        <EmptyState
          icon={Calendar}
          title="No bookings yet"
          description="Create your first booking to get started"
          action={{
            label: 'Create Booking',
            onClick: handleCreate,
            icon: Plus,
          }}
        />
      )

      // Assert
      expect(screen.getByText('No bookings yet')).toBeInTheDocument()
      expect(screen.getByText('Create your first booking to get started')).toBeInTheDocument()
    })

    it('should render empty customers state with import option', () => {
      // Arrange
      const handleAdd = vi.fn()
      const handleImport = vi.fn()

      // Act
      render(
        <EmptyState
          icon={Users}
          title="No customers found"
          description="Add customers to start managing your client base"
          action={{
            label: 'Add Customer',
            onClick: handleAdd,
            icon: Plus,
          }}
          secondaryAction={{
            label: 'Import from CSV',
            onClick: handleImport,
          }}
        />
      )

      // Assert
      expect(screen.getByText('No customers found')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add customer/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /import from csv/i })).toBeInTheDocument()
    })

    it('should render filtered empty state without actions', () => {
      // Arrange & Act
      render(
        <EmptyState
          title="No results found"
          description="Try adjusting your filters or search query"
        />
      )

      // Assert
      expect(screen.getByText('No results found')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your filters or search query')).toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })
})
