/**
 * Standardized Error Handling Utilities
 *
 * Provides consistent error handling patterns across the application:
 * - Standard try-catch wrappers
 * - Error logging and reporting
 * - User-friendly error messages
 * - Error recovery strategies
 */

import { toast } from '@/hooks/use-toast'
import {
  getSupabaseErrorMessage,
  isPermissionError,
  isValidationError,
} from './error-utils'

/**
 * Error severity levels for logging and reporting
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const

export type ErrorSeverity = (typeof ErrorSeverity)[keyof typeof ErrorSeverity]

/**
 * Error context for better debugging
 */
export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  metadata?: Record<string, unknown>
}

/**
 * Standard error handler configuration
 */
export interface ErrorHandlerConfig {
  showToast?: boolean
  logToConsole?: boolean
  reportToService?: boolean
  severity?: ErrorSeverity
  context?: ErrorContext
  fallbackMessage?: string
  onError?: (error: Error) => void
}

/**
 * Default error handler configuration
 */
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  showToast: true,
  logToConsole: true,
  reportToService: false,
  severity: ErrorSeverity.MEDIUM,
  fallbackMessage: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
}

/**
 * Log error to console with context
 */
function logError(error: Error, context?: ErrorContext, severity: ErrorSeverity = ErrorSeverity.MEDIUM) {
  const logData = {
    message: error.message,
    stack: error.stack,
    severity,
    timestamp: new Date().toISOString(),
    ...context,
  }

  // Use different console methods based on severity
  switch (severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      console.error('[ERROR]', logData)
      break
    case ErrorSeverity.MEDIUM:
      console.warn('[WARNING]', logData)
      break
    case ErrorSeverity.LOW:
      console.log('[INFO]', logData)
      break
  }
}

/**
 * Report error to external service (placeholder for future integration)
 */
function reportError(error: Error, context?: ErrorContext, severity: ErrorSeverity = ErrorSeverity.MEDIUM) {
  if (!import.meta.env.PROD) {
    return // Only report in production
  }

  // TODO: Integrate with error tracking service (e.g., Sentry, LogRocket)
  // Example:
  // Sentry.captureException(error, {
  //   level: severity,
  //   contexts: { custom: context },
  // })

  console.log('[Report to service]', { error, context, severity })
}

/**
 * Show error toast to user
 */
function showErrorToast(message: string, description?: string) {
  toast({
    variant: 'destructive',
    title: message,
    description,
  })
}

/**
 * Handle error with standard pattern
 */
export function handleError(error: unknown, config: ErrorHandlerConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  const errorObj = error instanceof Error ? error : new Error(String(error))

  // Get user-friendly message
  const userMessage = getSupabaseErrorMessage(error) || mergedConfig.fallbackMessage

  // Log error
  if (mergedConfig.logToConsole) {
    logError(errorObj, mergedConfig.context, mergedConfig.severity)
  }

  // Report error
  if (mergedConfig.reportToService) {
    reportError(errorObj, mergedConfig.context, mergedConfig.severity)
  }

  // Show toast
  if (mergedConfig.showToast) {
    showErrorToast(userMessage || 'เกิดข้อผิดพลาด')
  }

  // Call custom error handler
  if (mergedConfig.onError) {
    mergedConfig.onError(errorObj)
  }

  return { error: errorObj, message: userMessage }
}

/**
 * Async function wrapper with standard error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  config: ErrorHandlerConfig = {}
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (error) {
    const { error: handledError } = handleError(error, config)
    return { data: null, error: handledError }
  }
}

/**
 * Sync function wrapper with standard error handling
 */
export function withErrorHandlingSync<T>(
  fn: () => T,
  config: ErrorHandlerConfig = {}
): { data: T | null; error: Error | null } {
  try {
    const data = fn()
    return { data, error: null }
  } catch (error) {
    const { error: handledError } = handleError(error, config)
    return { data: null, error: handledError }
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    delay?: number
    backoff?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = 2, onRetry } = options

  let lastError: Error

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on validation or permission errors
      if (isValidationError(error) || isPermissionError(error)) {
        throw lastError
      }

      // Call retry callback
      if (onRetry) {
        onRetry(attempt + 1, lastError)
      }

      // Don't wait after last attempt
      if (attempt < maxRetries - 1) {
        const waitTime = delay * Math.pow(backoff, attempt)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError!
}

/**
 * Specialized handlers for common error types
 */
export const errorHandlers = {
  /**
   * Handle network errors
   */
  network: (error: unknown, context?: ErrorContext) => {
    return handleError(error, {
      showToast: true,
      severity: ErrorSeverity.HIGH,
      context: { ...context, action: 'network_request' },
      fallbackMessage: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
    })
  },

  /**
   * Handle validation errors
   */
  validation: (error: unknown, context?: ErrorContext) => {
    return handleError(error, {
      showToast: true,
      severity: ErrorSeverity.LOW,
      context: { ...context, action: 'validation' },
      fallbackMessage: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองอีกครั้ง',
    })
  },

  /**
   * Handle permission errors
   */
  permission: (error: unknown, context?: ErrorContext) => {
    return handleError(error, {
      showToast: true,
      severity: ErrorSeverity.MEDIUM,
      context: { ...context, action: 'permission_check' },
      fallbackMessage: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้',
    })
  },

  /**
   * Handle database errors
   */
  database: (error: unknown, context?: ErrorContext) => {
    return handleError(error, {
      showToast: true,
      reportToService: true,
      severity: ErrorSeverity.HIGH,
      context: { ...context, action: 'database_operation' },
      fallbackMessage: 'เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล กรุณาลองอีกครั้ง',
    })
  },

  /**
   * Handle authentication errors
   */
  auth: (error: unknown, context?: ErrorContext) => {
    return handleError(error, {
      showToast: true,
      severity: ErrorSeverity.HIGH,
      context: { ...context, action: 'authentication' },
      fallbackMessage: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง',
      onError: () => {
        // Redirect to login after a delay
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      },
    })
  },
}

/**
 * Standard try-catch pattern decorator (for class methods)
 */
export function catchErrors(config: ErrorHandlerConfig = {}) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args)
      } catch (error) {
        handleError(error, {
          ...config,
          context: {
            ...config.context,
            component: target?.constructor?.name,
            action: propertyKey,
          },
        })
        throw error
      }
    }

    return descriptor
  }
}
