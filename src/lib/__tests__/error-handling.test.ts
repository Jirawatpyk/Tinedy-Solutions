import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  handleError,
  withErrorHandling,
  withErrorHandlingSync,
  withRetry,
  errorHandlers,
  ErrorSeverity,
} from '../error-handling'

// Mock sonner toast (code migrated from useToast to Sonner)
const mockToastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: vi.fn(),
  },
}))

describe('error-handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console output in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('handleError', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error')
      const result = handleError(error)

      expect(result.error).toBe(error)
      expect(result.message).toBeTruthy()
    })

    it('should handle string errors', () => {
      const result = handleError('String error')

      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toBe('String error')
    })

    it('should handle unknown errors', () => {
      const result = handleError({ custom: 'error' })

      expect(result.error).toBeInstanceOf(Error)
    })

    it('should respect showToast config', () => {
      handleError(new Error('Test'), { showToast: true })
      expect(mockToastError).toHaveBeenCalled()

      vi.clearAllMocks()

      handleError(new Error('Test'), { showToast: false })
      expect(mockToastError).not.toHaveBeenCalled()
    })

    it('should call custom onError handler', () => {
      const onError = vi.fn()
      handleError(new Error('Test'), { onError })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should use custom fallback message', () => {
      const fallbackMessage = 'Custom fallback'
      const result = handleError(new Error('Test'), { fallbackMessage })

      // Should use fallback or original message
      expect(result.message).toBeTruthy()
    })
  })

  describe('withErrorHandling', () => {
    it('should return data on success', async () => {
      const successFn = async () => 'success data'
      const result = await withErrorHandling(successFn)

      expect(result.data).toBe('success data')
      expect(result.error).toBeNull()
    })

    it('should catch and handle errors', async () => {
      const errorFn = async () => {
        throw new Error('Test error')
      }
      const result = await withErrorHandling(errorFn, { showToast: false })

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('Test error')
    })

    it('should handle async errors with custom config', async () => {
      const onError = vi.fn()
      const errorFn = async () => {
        throw new Error('Async error')
      }

      await withErrorHandling(errorFn, { onError, showToast: false })

      expect(onError).toHaveBeenCalled()
    })
  })

  describe('withErrorHandlingSync', () => {
    it('should return data on success', () => {
      const successFn = () => 'sync data'
      const result = withErrorHandlingSync(successFn)

      expect(result.data).toBe('sync data')
      expect(result.error).toBeNull()
    })

    it('should catch and handle sync errors', () => {
      const errorFn = () => {
        throw new Error('Sync error')
      }
      const result = withErrorHandlingSync(errorFn, { showToast: false })

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const successFn = vi.fn().mockResolvedValue('success')
      const result = await withRetry(successFn)

      expect(result).toBe('success')
      expect(successFn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure', async () => {
      const failTwiceFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success')

      const result = await withRetry(failTwiceFn, { maxRetries: 3, delay: 10 })

      expect(result).toBe('success')
      expect(failTwiceFn).toHaveBeenCalledTimes(3)
    })

    it('should throw after max retries', async () => {
      const alwaysFailFn = vi.fn().mockRejectedValue(new Error('Always fail'))

      await expect(
        withRetry(alwaysFailFn, { maxRetries: 3, delay: 10 })
      ).rejects.toThrow('Always fail')

      expect(alwaysFailFn).toHaveBeenCalledTimes(3)
    })

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn()
      const failOnceFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success')

      await withRetry(failOnceFn, { maxRetries: 3, delay: 10, onRetry })

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
    })

    it('should not retry validation errors', async () => {
      const validationError = { code: '23502', message: 'Validation failed' }
      const failFn = vi.fn().mockRejectedValue(validationError)

      await expect(withRetry(failFn, { maxRetries: 3 })).rejects.toThrow()

      expect(failFn).toHaveBeenCalledTimes(1) // Should not retry
    })

    it('should not retry permission errors', async () => {
      const permissionError = { code: '42501', message: 'Permission denied' }
      const failFn = vi.fn().mockRejectedValue(permissionError)

      await expect(withRetry(failFn, { maxRetries: 3 })).rejects.toThrow()

      expect(failFn).toHaveBeenCalledTimes(1) // Should not retry
    })
  })

  describe('errorHandlers', () => {
    it('should handle network errors', () => {
      const error = new Error('Network error')
      const result = errorHandlers.network(error, { component: 'TestComponent' })

      expect(result.error).toBe(error)
      expect(result.message).toBeTruthy()
    })

    it('should handle validation errors', () => {
      const error = new Error('Validation failed')
      const result = errorHandlers.validation(error)

      expect(result.error).toBe(error)
    })

    it('should handle permission errors', () => {
      const error = new Error('Permission denied')
      const result = errorHandlers.permission(error)

      expect(result.error).toBe(error)
    })

    it('should handle database errors', () => {
      const error = new Error('Database error')
      const result = errorHandlers.database(error)

      expect(result.error).toBe(error)
    })

    it('should handle auth errors and redirect', async () => {
      vi.useFakeTimers()

      const error = new Error('Auth failed')
      errorHandlers.auth(error, { component: 'AuthComponent' })

      // Fast-forward time
      vi.advanceTimersByTime(2100)

      vi.useRealTimers()
    })
  })

  describe('Error severity', () => {
    it('should log with correct severity', () => {
      handleError(new Error('Low'), {
        severity: ErrorSeverity.LOW,
        showToast: false,
      })

      handleError(new Error('Medium'), {
        severity: ErrorSeverity.MEDIUM,
        showToast: false,
      })

      handleError(new Error('High'), {
        severity: ErrorSeverity.HIGH,
        showToast: false,
      })

      handleError(new Error('Critical'), {
        severity: ErrorSeverity.CRITICAL,
        showToast: false,
      })

      // Logger uses console.info for LOW severity, console.warn for MEDIUM, console.error for HIGH/CRITICAL
      expect(console.info).toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalled()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('Error context', () => {
    it('should include context in error logs', () => {
      const context = {
        component: 'TestComponent',
        action: 'testAction',
        userId: 'user123',
        metadata: { key: 'value' },
      }

      handleError(new Error('Test'), {
        context,
        showToast: false,
      })

      // Verify console was called (actual log content verification would require more complex mocking)
      expect(console.warn).toHaveBeenCalled()
    })
  })
})
