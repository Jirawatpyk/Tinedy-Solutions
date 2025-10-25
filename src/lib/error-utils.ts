/**
 * Utility functions for safe error handling
 */

export interface ErrorWithMessage {
  message: string
}

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError

  try {
    return new Error(JSON.stringify(maybeError))
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example
    return new Error(String(maybeError))
  }
}

export function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message
}

/**
 * Supabase-specific error code mappings
 */
interface SupabaseError {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'details' in error || 'hint' in error)
  )
}

/**
 * Get user-friendly error message from Supabase errors
 */
export function getSupabaseErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error occurred'

  // Check if it's a Supabase error
  if (isSupabaseError(error)) {
    const message = error.message || ''
    const code = error.code || ''

    // Handle specific Supabase error codes
    switch (code) {
      case 'PGRST116':
        return 'Invalid query parameters. Please check your input.'

      case 'PGRST302':
        return 'Authentication failed. Please log in again.'

      case '23505': // unique_violation
        return 'This record already exists. Please use different values.'

      case '23503': // foreign_key_violation
        return 'Cannot delete this record because it is referenced by other data.'

      case '23502': // not_null_violation
        return 'Required field is missing. Please fill in all required fields.'

      case '42501': // insufficient_privilege
        return 'You do not have permission to perform this action.'

      case '42P01': // undefined_table
        return 'Database table not found. Please contact support.'

      case '42703': // undefined_column
        return 'Database column not found. Please contact support.'

      case 'PGRST204':
        return 'No data found matching your query.'

      default:
        break
    }

    // Check for common error patterns in message
    if (message.toLowerCase().includes('duplicate')) {
      return 'This record already exists.'
    }
    if (message.toLowerCase().includes('foreign key')) {
      return 'Cannot delete this record because it is being used elsewhere.'
    }
    if (message.toLowerCase().includes('not null')) {
      return 'Required field cannot be empty.'
    }
    if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('unauthorized')) {
      return 'You do not have permission to perform this action.'
    }
    if (message.toLowerCase().includes('timeout')) {
      return 'Request timed out. Please try again.'
    }
    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
      return 'Network error. Please check your connection and try again.'
    }

    // Return the original message if it's user-friendly
    if (error.message && error.message.length < 100) {
      return error.message
    }
  }

  // Fallback to generic error message
  return getErrorMessage(error)
}

/**
 * Check if error is a network/connectivity error
 */
export function isNetworkError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('offline')
  )
}

/**
 * Check if error is a permission error
 */
export function isPermissionError(error: unknown): boolean {
  if (isSupabaseError(error)) {
    const code = error.code || ''
    if (code === '42501' || code === 'PGRST302') return true
  }

  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('access denied')
  )
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (isSupabaseError(error)) {
    const code = error.code || ''
    if (['23505', '23502', '23503'].includes(code)) return true
  }

  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('invalid') ||
    message.includes('required') ||
    message.includes('duplicate') ||
    message.includes('constraint')
  )
}
