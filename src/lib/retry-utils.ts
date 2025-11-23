/**
 * Retry Utility for Network Operations
 *
 * Provides automatic retry logic with exponential backoff
 * for handling transient network errors and temporary failures.
 */

interface RetryOptions {
  maxAttempts?: number
  delayMs?: number
  backoffMultiplier?: number
  shouldRetry?: (error: unknown) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  shouldRetry: (error: unknown) => {
    // Retry only for network errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    return (
      errorMessage.includes('fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT')
    )
  },
}

/**
 * Execute an async operation with automatic retry logic
 *
 * @param operation - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries fail
 *
 * @example
 * ```typescript
 * const data = await withRetry(
 *   async () => {
 *     const { data, error } = await supabase.from('bookings').select()
 *     if (error) throw error
 *     return data
 *   },
 *   { maxAttempts: 3, delayMs: 1000 }
 * )
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Check if we should retry this error
      if (attempt >= opts.maxAttempts || !opts.shouldRetry(error)) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt - 1)

      console.log(
        `[Retry] Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${delay}ms...`,
        error instanceof Error ? error.message : String(error)
      )

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Create a retry wrapper for a specific operation
 *
 * @param options - Default retry options for this wrapper
 * @returns A function that wraps operations with retry logic
 *
 * @example
 * ```typescript
 * const retryBookingOperation = createRetryWrapper({ maxAttempts: 5 })
 *
 * const booking = await retryBookingOperation(async () => {
 *   return await fetchBooking(id)
 * })
 * ```
 */
export function createRetryWrapper(defaultOptions: RetryOptions = {}) {
  return async <T>(
    operation: () => Promise<T>,
    overrideOptions?: RetryOptions
  ): Promise<T> => {
    return withRetry(operation, { ...defaultOptions, ...overrideOptions })
  }
}
