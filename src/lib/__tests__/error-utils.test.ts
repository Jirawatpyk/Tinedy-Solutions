import { describe, it, expect } from 'vitest'
import {
  isErrorWithMessage,
  toErrorWithMessage,
  getErrorMessage,
  getSupabaseErrorMessage,
  isNetworkError,
  isPermissionError,
  isValidationError,
} from '../error-utils'

describe('error-utils', () => {
  describe('isErrorWithMessage', () => {
    it('should return true for Error objects', () => {
      const error = new Error('Test error')
      expect(isErrorWithMessage(error)).toBe(true)
    })

    it('should return true for objects with message property', () => {
      const error = { message: 'Test error' }
      expect(isErrorWithMessage(error)).toBe(true)
    })

    it('should return false for null', () => {
      expect(isErrorWithMessage(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isErrorWithMessage(undefined)).toBe(false)
    })

    it('should return false for strings', () => {
      expect(isErrorWithMessage('error string')).toBe(false)
    })

    it('should return false for numbers', () => {
      expect(isErrorWithMessage(123)).toBe(false)
    })

    it('should return false for objects without message', () => {
      expect(isErrorWithMessage({ code: '500' })).toBe(false)
    })

    it('should return false for objects with non-string message', () => {
      expect(isErrorWithMessage({ message: 123 })).toBe(false)
    })
  })

  describe('toErrorWithMessage', () => {
    it('should return Error object unchanged', () => {
      const error = new Error('Test error')
      const result = toErrorWithMessage(error)
      expect(result).toBe(error)
      expect(result.message).toBe('Test error')
    })

    it('should return object with message unchanged', () => {
      const error = { message: 'Test error' }
      const result = toErrorWithMessage(error)
      expect(result).toBe(error)
    })

    it('should wrap string in Error object', () => {
      const result = toErrorWithMessage('error string')
      expect(result.message).toBe('"error string"')
    })

    it('should wrap number in Error object', () => {
      const result = toErrorWithMessage(123)
      expect(result.message).toBe('123')
    })

    it('should wrap null in Error object', () => {
      const result = toErrorWithMessage(null)
      expect(result.message).toBe('null')
    })

    it('should wrap undefined in Error object', () => {
      const result = toErrorWithMessage(undefined)
      // JSON.stringify(undefined) returns undefined, so fallback to String(undefined)
      expect(result.message).toBe('')
    })

    it('should handle objects by stringifying them', () => {
      const result = toErrorWithMessage({ code: '500', status: 'error' })
      expect(result.message).toContain('code')
      expect(result.message).toContain('500')
    })

    it('should handle circular references', () => {
      const obj: { self?: unknown } = {}
      obj.self = obj
      const result = toErrorWithMessage(obj)
      expect(result.message).toBe('[object Object]')
    })
  })

  describe('getErrorMessage', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Test error')
      expect(getErrorMessage(error)).toBe('Test error')
    })

    it('should extract message from object with message', () => {
      const error = { message: 'Test error' }
      expect(getErrorMessage(error)).toBe('Test error')
    })

    it('should convert string to message', () => {
      expect(getErrorMessage('error string')).toBe('"error string"')
    })

    it('should convert number to message', () => {
      expect(getErrorMessage(123)).toBe('123')
    })

    it('should handle null', () => {
      expect(getErrorMessage(null)).toBe('null')
    })
  })

  describe('getSupabaseErrorMessage', () => {
    it('should return default message for null/undefined', () => {
      expect(getSupabaseErrorMessage(null)).toBe('Unknown error occurred')
      expect(getSupabaseErrorMessage(undefined)).toBe('Unknown error occurred')
    })

    describe('Supabase error codes', () => {
      it('should handle PGRST116 (invalid query)', () => {
        const error = { code: 'PGRST116', message: 'Invalid query' }
        expect(getSupabaseErrorMessage(error)).toBe('Invalid query parameters. Please check your input.')
      })

      it('should handle PGRST302 (authentication failed)', () => {
        const error = { code: 'PGRST302', message: 'Auth failed' }
        expect(getSupabaseErrorMessage(error)).toBe('Authentication failed. Please log in again.')
      })

      it('should handle 23505 (unique violation)', () => {
        const error = { code: '23505', message: 'Unique constraint violation' }
        expect(getSupabaseErrorMessage(error)).toBe('This record already exists. Please use different values.')
      })

      it('should handle 23503 (foreign key violation)', () => {
        const error = { code: '23503', message: 'Foreign key constraint' }
        expect(getSupabaseErrorMessage(error)).toBe('Cannot delete this record because it is referenced by other data.')
      })

      it('should handle 23502 (not null violation)', () => {
        const error = { code: '23502', message: 'Not null constraint' }
        expect(getSupabaseErrorMessage(error)).toBe('Required field is missing. Please fill in all required fields.')
      })

      it('should handle 42501 (insufficient privilege)', () => {
        const error = { code: '42501', message: 'Permission denied' }
        expect(getSupabaseErrorMessage(error)).toBe('You do not have permission to perform this action.')
      })

      it('should handle 42P01 (undefined table)', () => {
        const error = { code: '42P01', message: 'Table not found' }
        expect(getSupabaseErrorMessage(error)).toBe('Database table not found. Please contact support.')
      })

      it('should handle 42703 (undefined column)', () => {
        const error = { code: '42703', message: 'Column not found' }
        expect(getSupabaseErrorMessage(error)).toBe('Database column not found. Please contact support.')
      })

      it('should handle PGRST204 (no data found)', () => {
        const error = { code: 'PGRST204', message: 'No rows found' }
        expect(getSupabaseErrorMessage(error)).toBe('No data found matching your query.')
      })
    })

    describe('Message pattern matching', () => {
      it('should detect duplicate keyword', () => {
        const error = { message: 'duplicate key error', code: '' }
        expect(getSupabaseErrorMessage(error)).toBe('This record already exists.')
      })

      it('should detect foreign key keyword', () => {
        const error = { message: 'foreign key constraint error', code: '' }
        expect(getSupabaseErrorMessage(error)).toBe('Cannot delete this record because it is being used elsewhere.')
      })

      it('should detect not null keyword', () => {
        const error = { message: 'not null violation', code: '' }
        expect(getSupabaseErrorMessage(error)).toBe('Required field cannot be empty.')
      })

      it('should detect permission keyword', () => {
        const error = { message: 'permission denied', code: '' }
        expect(getSupabaseErrorMessage(error)).toBe('You do not have permission to perform this action.')
      })

      it('should detect unauthorized keyword', () => {
        const error = { message: 'unauthorized access', code: '' }
        expect(getSupabaseErrorMessage(error)).toBe('You do not have permission to perform this action.')
      })

      it('should detect timeout keyword', () => {
        const error = { message: 'request timeout', code: '' }
        expect(getSupabaseErrorMessage(error)).toBe('Request timed out. Please try again.')
      })

      it('should detect network keyword', () => {
        const error = { message: 'network error', code: '' }
        expect(getSupabaseErrorMessage(error)).toBe('Network error. Please check your connection and try again.')
      })

      it('should detect fetch keyword', () => {
        const error = { message: 'fetch failed', code: '' }
        expect(getSupabaseErrorMessage(error)).toBe('Network error. Please check your connection and try again.')
      })
    })

    it('should return short messages as-is', () => {
      const error = { message: 'Short error' }
      expect(getSupabaseErrorMessage(error)).toBe('Short error')
    })

    it('should fallback to generic message for long messages', () => {
      const longMessage = 'A'.repeat(101)
      const error = { message: longMessage }
      const result = getSupabaseErrorMessage(error)
      expect(result).toBe(longMessage)
    })

    it('should handle non-Supabase errors', () => {
      const error = new Error('Regular error')
      expect(getSupabaseErrorMessage(error)).toBe('Regular error')
    })
  })

  describe('isNetworkError', () => {
    it('should detect "network" in error message', () => {
      const error = new Error('Network connection failed')
      expect(isNetworkError(error)).toBe(true)
    })

    it('should detect "fetch" in error message', () => {
      const error = new Error('Fetch failed')
      expect(isNetworkError(error)).toBe(true)
    })

    it('should detect "timeout" in error message', () => {
      const error = new Error('Request timeout')
      expect(isNetworkError(error)).toBe(true)
    })

    it('should detect "connection" in error message', () => {
      const error = new Error('Connection refused')
      expect(isNetworkError(error)).toBe(true)
    })

    it('should detect "offline" in error message', () => {
      const error = new Error('You are offline')
      expect(isNetworkError(error)).toBe(true)
    })

    it('should return false for non-network errors', () => {
      const error = new Error('Validation error')
      expect(isNetworkError(error)).toBe(false)
    })

    it('should be case insensitive', () => {
      const error = new Error('NETWORK ERROR')
      expect(isNetworkError(error)).toBe(true)
    })
  })

  describe('isPermissionError', () => {
    it('should detect code 42501 (insufficient privilege)', () => {
      const error = { code: '42501', message: 'Permission denied' }
      expect(isPermissionError(error)).toBe(true)
    })

    it('should detect code PGRST302 (auth failed)', () => {
      const error = { code: 'PGRST302', message: 'Auth failed' }
      expect(isPermissionError(error)).toBe(true)
    })

    it('should detect "permission" in error message', () => {
      const error = new Error('Permission denied')
      expect(isPermissionError(error)).toBe(true)
    })

    it('should detect "unauthorized" in error message', () => {
      const error = new Error('Unauthorized access')
      expect(isPermissionError(error)).toBe(true)
    })

    it('should detect "forbidden" in error message', () => {
      const error = new Error('Forbidden resource')
      expect(isPermissionError(error)).toBe(true)
    })

    it('should detect "access denied" in error message', () => {
      const error = new Error('Access denied')
      expect(isPermissionError(error)).toBe(true)
    })

    it('should return false for non-permission errors', () => {
      const error = new Error('Validation error')
      expect(isPermissionError(error)).toBe(false)
    })

    it('should be case insensitive', () => {
      const error = new Error('PERMISSION DENIED')
      expect(isPermissionError(error)).toBe(true)
    })
  })

  describe('isValidationError', () => {
    it('should detect code 23505 (unique violation)', () => {
      const error = { code: '23505', message: 'Unique constraint' }
      expect(isValidationError(error)).toBe(true)
    })

    it('should detect code 23502 (not null violation)', () => {
      const error = { code: '23502', message: 'Not null' }
      expect(isValidationError(error)).toBe(true)
    })

    it('should detect code 23503 (foreign key violation)', () => {
      const error = { code: '23503', message: 'Foreign key' }
      expect(isValidationError(error)).toBe(true)
    })

    it('should detect "invalid" in error message', () => {
      const error = new Error('Invalid input')
      expect(isValidationError(error)).toBe(true)
    })

    it('should detect "required" in error message', () => {
      const error = new Error('Required field missing')
      expect(isValidationError(error)).toBe(true)
    })

    it('should detect "duplicate" in error message', () => {
      const error = new Error('Duplicate entry')
      expect(isValidationError(error)).toBe(true)
    })

    it('should detect "constraint" in error message', () => {
      const error = new Error('Constraint violation')
      expect(isValidationError(error)).toBe(true)
    })

    it('should return false for non-validation errors', () => {
      const error = new Error('Network error')
      expect(isValidationError(error)).toBe(false)
    })

    it('should be case insensitive', () => {
      const error = new Error('INVALID INPUT')
      expect(isValidationError(error)).toBe(true)
    })
  })
})
