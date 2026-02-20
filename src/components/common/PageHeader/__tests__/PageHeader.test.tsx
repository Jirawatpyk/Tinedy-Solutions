import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { PageHeader } from '../PageHeader'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('PageHeader', () => {
  describe('rendering', () => {
    it('renders title as h1 element', () => {
      renderWithRouter(<PageHeader title="Test Title" />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('Test Title')
    })

    it('renders title with correct typography classes', () => {
      renderWithRouter(<PageHeader title="Test Title" />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveClass('text-2xl', 'sm:text-3xl', 'font-display', 'font-bold', 'text-tinedy-dark')
    })

    it('renders subtitle when provided', () => {
      renderWithRouter(<PageHeader title="Test" subtitle="Test Description" />)

      expect(screen.getByText('Test Description')).toBeInTheDocument()
    })

    it('renders subtitle with muted styling', () => {
      renderWithRouter(<PageHeader title="Test" subtitle="Test Description" />)

      const subtitle = screen.getByText('Test Description')
      expect(subtitle).toHaveClass('text-muted-foreground')
    })

    it('subtitle truncates on overflow', () => {
      renderWithRouter(<PageHeader title="Test" subtitle="Test Description" />)

      const subtitle = screen.getByText('Test Description')
      expect(subtitle).toHaveClass('truncate')
    })

    it('does not render subtitle element when not provided', () => {
      const { container } = renderWithRouter(<PageHeader title="Test" />)

      const paragraphs = container.querySelectorAll('p')
      expect(paragraphs.length).toBe(0)
    })
  })

  describe('back navigation', () => {
    it('renders back link when backHref is provided', () => {
      renderWithRouter(<PageHeader title="Test" backHref="/admin/customers" />)

      const backLink = screen.getByRole('link', { name: /go back/i })
      expect(backLink).toBeInTheDocument()
    })

    it('back link navigates to correct href', () => {
      renderWithRouter(<PageHeader title="Test" backHref="/admin/customers" />)

      const backLink = screen.getByRole('link', { name: /go back/i })
      expect(backLink).toHaveAttribute('href', '/admin/customers')
    })

    it('does not render back link when backHref is not provided', () => {
      renderWithRouter(<PageHeader title="Test" />)

      const backLink = screen.queryByRole('link', { name: /go back/i })
      expect(backLink).not.toBeInTheDocument()
    })

    it('back link has accessible label', () => {
      renderWithRouter(<PageHeader title="Test" backHref="/back" />)

      const backLink = screen.getByRole('link', { name: /go back/i })
      expect(backLink).toHaveAttribute('aria-label', 'Go back')
    })
  })

  describe('actions slot', () => {
    it('renders actions when provided', () => {
      renderWithRouter(
        <PageHeader
          title="Test"
          actions={<button data-testid="action-button">Action</button>}
        />
      )

      expect(screen.getByTestId('action-button')).toBeInTheDocument()
    })

    it('renders multiple actions', () => {
      renderWithRouter(
        <PageHeader
          title="Test"
          actions={
            <>
              <button data-testid="action-1">Action 1</button>
              <button data-testid="action-2">Action 2</button>
            </>
          }
        />
      )

      expect(screen.getByTestId('action-1')).toBeInTheDocument()
      expect(screen.getByTestId('action-2')).toBeInTheDocument()
    })

    it('does not render actions wrapper when actions not provided', () => {
      const { container } = renderWithRouter(<PageHeader title="Test" />)

      // Should only have one direct child div (the title section)
      const wrapper = container.firstChild as HTMLElement
      const directChildren = wrapper?.querySelectorAll(':scope > div')
      expect(directChildren?.length).toBe(1)
    })
  })

  describe('className override', () => {
    it('applies custom className', () => {
      const { container } = renderWithRouter(
        <PageHeader title="Test" className="custom-class" />
      )

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('custom-class')
    })

    it('preserves default classes when custom className applied', () => {
      const { container } = renderWithRouter(
        <PageHeader title="Test" className="custom-class" />
      )

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('flex', 'items-center', 'justify-between', 'gap-2')
    })
  })

  describe('layout behavior', () => {
    it('always uses flex-row layout (no mobile stack)', () => {
      const { container } = renderWithRouter(<PageHeader title="Test" />)

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('flex', 'items-center', 'justify-between')
      expect(wrapper).not.toHaveClass('flex-col', 'sm:flex-row')
    })

    it('actions stay right-aligned via justify-between', () => {
      const { container } = renderWithRouter(<PageHeader title="Test" />)

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('justify-between')
    })

    it('has responsive title sizing', () => {
      renderWithRouter(<PageHeader title="Test" />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveClass('text-2xl', 'sm:text-3xl')
    })
  })

  describe('full integration', () => {
    it('renders complete header with all props', () => {
      renderWithRouter(
        <PageHeader
          title="Customer Details"
          subtitle="View and manage customer information"
          backHref="/admin/customers"
          actions={<button>Edit</button>}
          className="mb-6"
        />
      )

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Customer Details')
      expect(screen.getByText('View and manage customer information')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /go back/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })
  })
})
