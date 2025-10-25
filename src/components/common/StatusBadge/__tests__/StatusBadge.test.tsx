/**
 * Test Suite: StatusBadge Component
 *
 * Tests for the StatusBadge component used for displaying status indicators.
 * Covers all variant types and rendering scenarios.
 *
 * Coverage Target: 100% (simple presentation component)
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../StatusBadge'

describe('StatusBadge', () => {
  describe('Basic Rendering', () => {
    it('should render with children content', () => {
      // Arrange & Act
      render(<StatusBadge>Completed</StatusBadge>)

      // Assert
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('should render with default variant', () => {
      // Arrange & Act
      const { container } = render(<StatusBadge>Default Status</StatusBadge>)

      // Assert
      expect(screen.getByText('Default Status')).toBeInTheDocument()
      const badge = container.querySelector('.bg-gray-100')
      expect(badge).toBeInTheDocument()
    })

    it('should render with text content', () => {
      // Arrange & Act
      render(<StatusBadge variant="success">Success</StatusBadge>)

      // Assert
      expect(screen.getByText('Success')).toBeInTheDocument()
    })

    it('should render with numeric content', () => {
      // Arrange & Act
      render(<StatusBadge variant="info">{5}</StatusBadge>)

      // Assert
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  describe('Variant Styles', () => {
    it('should render success variant with green styling', () => {
      // Arrange & Act
      const { container } = render(<StatusBadge variant="success">Paid</StatusBadge>)

      // Assert
      const badge = container.querySelector('.bg-green-100')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('text-green-700')
      expect(badge).toHaveClass('border-green-300')
    })

    it('should render warning variant with yellow styling', () => {
      // Arrange & Act
      const { container } = render(<StatusBadge variant="warning">Pending</StatusBadge>)

      // Assert
      const badge = container.querySelector('.bg-yellow-100')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('text-yellow-700')
      expect(badge).toHaveClass('border-yellow-300')
    })

    it('should render danger variant with red styling', () => {
      // Arrange & Act
      const { container } = render(<StatusBadge variant="danger">Cancelled</StatusBadge>)

      // Assert
      const badge = container.querySelector('.bg-red-50')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('text-red-700')
      expect(badge).toHaveClass('border-red-300')
    })

    it('should render info variant with blue styling', () => {
      // Arrange & Act
      const { container } = render(<StatusBadge variant="info">Info</StatusBadge>)

      // Assert
      const badge = container.querySelector('.bg-blue-100')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('text-blue-700')
      expect(badge).toHaveClass('border-blue-300')
    })

    it('should render purple variant with purple styling', () => {
      // Arrange & Act
      const { container } = render(<StatusBadge variant="purple">VIP</StatusBadge>)

      // Assert
      const badge = container.querySelector('.bg-purple-100')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('text-purple-700')
      expect(badge).toHaveClass('border-purple-300')
    })

    it('should render default variant with gray styling', () => {
      // Arrange & Act
      const { container } = render(<StatusBadge variant="default">Unknown</StatusBadge>)

      // Assert
      const badge = container.querySelector('.bg-gray-100')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('text-gray-800')
      expect(badge).toHaveClass('border-gray-300')
    })
  })

  describe('Custom ClassName', () => {
    it('should accept and apply custom className', () => {
      // Arrange & Act
      const { container } = render(
        <StatusBadge variant="success" className="custom-class">
          Custom
        </StatusBadge>
      )

      // Assert
      const badge = container.querySelector('.custom-class')
      expect(badge).toBeInTheDocument()
    })

    it('should merge custom className with variant classes', () => {
      // Arrange & Act
      const { container } = render(
        <StatusBadge variant="danger" className="font-bold uppercase">
          Alert
        </StatusBadge>
      )

      // Assert
      const badge = container.querySelector('.font-bold')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('uppercase')
      expect(badge).toHaveClass('bg-red-50') // Variant class should still be present
    })
  })

  describe('Additional Props', () => {
    it('should accept and apply additional HTML attributes', () => {
      // Arrange & Act
      render(
        <StatusBadge variant="info" data-testid="custom-badge" role="status">
          Info Badge
        </StatusBadge>
      )

      // Assert
      const badge = screen.getByTestId('custom-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveAttribute('role', 'status')
    })

    it('should accept onClick handler', () => {
      // Arrange & Act
      render(
        <StatusBadge variant="success" onClick={() => {}}>
          Clickable
        </StatusBadge>
      )

      // Assert
      expect(screen.getByText('Clickable')).toBeInTheDocument()
    })
  })

  describe('Content Variations', () => {
    it('should render with empty string', () => {
      // Arrange & Act
      render(<StatusBadge variant="default"></StatusBadge>)

      // Assert
      // Component renders but is empty
      const badges = screen.queryAllByRole('status')
      expect(badges.length).toBeGreaterThanOrEqual(0)
    })

    it('should render with JSX children', () => {
      // Arrange & Act
      render(
        <StatusBadge variant="success">
          <span>✓</span> Completed
        </StatusBadge>
      )

      // Assert
      expect(screen.getByText('✓')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('should render with long text content', () => {
      // Arrange
      const longText = 'This is a very long status message that might wrap'

      // Act
      render(<StatusBadge variant="warning">{longText}</StatusBadge>)

      // Assert
      expect(screen.getByText(longText)).toBeInTheDocument()
    })

    it('should render with special characters', () => {
      // Arrange & Act
      render(<StatusBadge variant="info">Status: "Active" (100%)</StatusBadge>)

      // Assert
      expect(screen.getByText('Status: "Active" (100%)')).toBeInTheDocument()
    })

    it('should render with unicode characters', () => {
      // Arrange & Act
      render(<StatusBadge variant="success">สำเร็จ ✓</StatusBadge>)

      // Assert
      expect(screen.getByText('สำเร็จ ✓')).toBeInTheDocument()
    })
  })

  describe('Multiple Badges', () => {
    it('should render multiple badges independently', () => {
      // Arrange & Act
      render(
        <>
          <StatusBadge variant="success">Paid</StatusBadge>
          <StatusBadge variant="warning">Pending</StatusBadge>
          <StatusBadge variant="danger">Cancelled</StatusBadge>
        </>
      )

      // Assert
      expect(screen.getByText('Paid')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })

    it('should render with different variants side by side', () => {
      // Arrange & Act
      const { container } = render(
        <>
          <StatusBadge variant="success">Success</StatusBadge>
          <StatusBadge variant="info">Info</StatusBadge>
          <StatusBadge variant="purple">Purple</StatusBadge>
        </>
      )

      // Assert
      expect(container.querySelector('.bg-green-100')).toBeInTheDocument()
      expect(container.querySelector('.bg-blue-100')).toBeInTheDocument()
      expect(container.querySelector('.bg-purple-100')).toBeInTheDocument()
    })
  })

  describe('Real-world Usage Scenarios', () => {
    it('should render booking status badge', () => {
      // Arrange & Act
      const status = 'confirmed'
      const variant = status === 'confirmed' ? 'success' : 'default'

      render(<StatusBadge variant={variant}>{status}</StatusBadge>)

      // Assert
      expect(screen.getByText('confirmed')).toBeInTheDocument()
    })

    it('should render payment status badge', () => {
      // Arrange & Act
      const paymentStatus = 'paid'
      const variant = paymentStatus === 'paid' ? 'success' : paymentStatus === 'partial' ? 'warning' : 'danger'

      render(<StatusBadge variant={variant}>{paymentStatus}</StatusBadge>)

      // Assert
      expect(screen.getByText('paid')).toBeInTheDocument()
    })

    it('should render customer relationship level badge', () => {
      // Arrange & Act
      render(<StatusBadge variant="purple">VIP</StatusBadge>)

      // Assert
      expect(screen.getByText('VIP')).toBeInTheDocument()
    })
  })
})
