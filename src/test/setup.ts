import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock Radix UI Select - doesn't work properly in happy-dom
// Note: Cannot use JSX in vi.mock(), must use createElement
vi.mock('@radix-ui/react-select', () => {
  const React = require('react')
  return {
    Root: ({ children, value, defaultValue }: any) =>
      React.createElement('div', {
        'data-testid': 'select-root',
        'data-value': value || defaultValue
      }, typeof children === 'function' ? children({ value: value || defaultValue }) : children),
    Trigger: ({ children, ...props }: any) =>
      React.createElement('button', {
        ...props,
        'data-testid': 'select-trigger',
        type: 'button',
        role: 'combobox',
        'aria-expanded': 'false'
      }, children),
    Value: ({ children, placeholder }: any) =>
      React.createElement('span', { 'data-testid': 'select-value' }, children || placeholder),
    Content: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'select-content' }, children),
    Item: ({ children, value }: any) =>
      React.createElement('div', {
        'data-testid': `select-item-${value}`,
        'data-value': value,
        role: 'option'
      }, children),
    Portal: ({ children }: any) => React.createElement('div', {}, children),
    Group: ({ children }: any) => React.createElement('div', {}, children),
    Label: ({ children }: any) => React.createElement('div', {}, children),
    Separator: () => React.createElement('div', {}),
    Icon: ({ children }: any) => React.createElement('span', {}, children),
    ItemIndicator: ({ children }: any) => React.createElement('span', {}, children),
    ItemText: ({ children }: any) => React.createElement('span', {}, children),
    ScrollUpButton: () => React.createElement('div', {}),
    ScrollDownButton: () => React.createElement('div', {}),
    Viewport: ({ children }: any) => React.createElement('div', {}, children),
  }
})

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
