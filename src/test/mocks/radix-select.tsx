/**
 * Mock implementation of Radix UI Select for testing
 *
 * Radix UI Select doesn't work properly in happy-dom test environment
 * This mock provides a simplified version that works in tests
 */

import { vi } from 'vitest'

export const mockRadixSelect = {
  Root: ({ children, onValueChange, value, defaultValue }: any) => {
    return (
      <div data-testid="select-root" data-value={value || defaultValue}>
        {typeof children === 'function' ? children({ value: value || defaultValue }) : children}
      </div>
    )
  },

  Trigger: ({ children, ...props }: any) => (
    <button data-testid="select-trigger" type="button" {...props}>
      {children}
    </button>
  ),

  Value: ({ children, placeholder }: any) => (
    <span data-testid="select-value">{children || placeholder}</span>
  ),

  Content: ({ children }: any) => (
    <div data-testid="select-content">{children}</div>
  ),

  Item: ({ children, value, onSelect }: any) => (
    <div
      data-testid={`select-item-${value}`}
      data-value={value}
      onClick={() => onSelect?.(value)}
      role="option"
    >
      {children}
    </div>
  ),

  Portal: ({ children }: any) => <div>{children}</div>,
  Group: ({ children }: any) => <div>{children}</div>,
  Label: ({ children }: any) => <div>{children}</div>,
  Separator: () => <div />,
  Icon: ({ children }: any) => <span>{children}</span>,
  ScrollUpButton: () => <div />,
  ScrollDownButton: () => <div />,
  Viewport: ({ children }: any) => <div>{children}</div>,
}

// Export for use in vi.mock()
export default mockRadixSelect
