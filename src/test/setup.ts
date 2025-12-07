import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import * as React from 'react'

// ========== Types for Radix UI Select Mock ==========
interface SelectRootProps {
  children: ReactNode | ((props: { value: string }) => ReactNode)
  value?: string
  defaultValue?: string
}

interface SelectTriggerProps {
  children: ReactNode
  [key: string]: unknown
}

interface SelectValueProps {
  children?: ReactNode
  placeholder?: string
}

interface SelectItemProps {
  children: ReactNode
  value: string
}

interface ChildrenOnlyProps {
  children?: ReactNode
}

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock Radix UI Select - doesn't work properly in happy-dom
// Note: Cannot use JSX in vi.mock(), must use createElement
vi.mock('@radix-ui/react-select', () => ({
  Root: ({ children, value, defaultValue }: SelectRootProps) =>
    React.createElement('div', {
      'data-testid': 'select-root',
      'data-value': value || defaultValue
    }, typeof children === 'function' ? children({ value: value || defaultValue || '' }) : children),
  Trigger: ({ children, ...props }: SelectTriggerProps) =>
    React.createElement('button', {
      ...props,
      'data-testid': 'select-trigger',
      type: 'button',
      role: 'combobox',
      'aria-expanded': 'false'
    }, children),
  Value: ({ children, placeholder }: SelectValueProps) =>
    React.createElement('span', { 'data-testid': 'select-value' }, children || placeholder),
  Content: ({ children }: ChildrenOnlyProps) =>
    React.createElement('div', { 'data-testid': 'select-content' }, children),
  Item: ({ children, value }: SelectItemProps) =>
    React.createElement('div', {
      'data-testid': `select-item-${value}`,
      'data-value': value,
      role: 'option'
    }, children),
  Portal: ({ children }: ChildrenOnlyProps) => React.createElement('div', {}, children),
  Group: ({ children }: ChildrenOnlyProps) => React.createElement('div', {}, children),
  Label: ({ children }: ChildrenOnlyProps) => React.createElement('div', {}, children),
  Separator: () => React.createElement('div', {}),
  Icon: ({ children }: ChildrenOnlyProps) => React.createElement('span', {}, children),
  ItemIndicator: ({ children }: ChildrenOnlyProps) => React.createElement('span', {}, children),
  ItemText: ({ children }: ChildrenOnlyProps) => React.createElement('span', {}, children),
  ScrollUpButton: () => React.createElement('div', {}),
  ScrollDownButton: () => React.createElement('div', {}),
  Viewport: ({ children }: ChildrenOnlyProps) => React.createElement('div', {}, children),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as unknown as typeof global.IntersectionObserver

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof global.ResizeObserver

// Extend expect matchers
expect.extend({
  toBeInTheDocument(received) {
    const pass = received !== null && received !== undefined
    return {
      pass,
      message: () =>
        pass
          ? `expected element not to be in the document`
          : `expected element to be in the document`,
    }
  },
})
