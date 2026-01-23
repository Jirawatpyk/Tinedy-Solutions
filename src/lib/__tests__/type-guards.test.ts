/**
 * Type Guards Tests
 *
 * Comprehensive tests for type-guards.ts runtime type validation
 */

import { describe, it, expect } from 'vitest'
import {
  isCustomer,
  isBooking,
  isTeam,
  isStaff,
  isServicePackage,
  isArrayOf,
  isNonEmptyArrayOf,
  assertType,
  assertArrayType,
  isNonNullable,
  isDefined,
  isString,
  isNumber,
  isBoolean,
  isObject,
  ensureArray,
  ensureSingle,
} from '../type-guards'

describe('type-guards', () => {
  // ==========================================================================
  // CUSTOMER TYPE GUARDS
  // ==========================================================================

  describe('isCustomer', () => {
    it('should return true for valid customer object', () => {
      const validCustomer = {
        id: 'customer-001',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '0812345678',
      }

      expect(isCustomer(validCustomer)).toBe(true)
    })

    it('should return false for object missing id', () => {
      const invalidCustomer = {
        full_name: 'John Doe',
        email: 'john@example.com',
      }

      expect(isCustomer(invalidCustomer)).toBe(false)
    })

    it('should return false for object missing full_name', () => {
      const invalidCustomer = {
        id: 'customer-001',
        email: 'john@example.com',
      }

      expect(isCustomer(invalidCustomer)).toBe(false)
    })

    it('should return false for object missing email', () => {
      const invalidCustomer = {
        id: 'customer-001',
        full_name: 'John Doe',
      }

      expect(isCustomer(invalidCustomer)).toBe(false)
    })

    it('should return false for null', () => {
      expect(isCustomer(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isCustomer(undefined)).toBe(false)
    })

    it('should return false for non-object types', () => {
      expect(isCustomer('string')).toBe(false)
      expect(isCustomer(123)).toBe(false)
      expect(isCustomer(true)).toBe(false)
      expect(isCustomer([])).toBe(false)
    })

    it('should return false for object with wrong property types', () => {
      const invalidCustomer = {
        id: 123, // Should be string
        full_name: 'John Doe',
        email: 'john@example.com',
      }

      expect(isCustomer(invalidCustomer)).toBe(false)
    })
  })

  // ==========================================================================
  // BOOKING TYPE GUARDS
  // ==========================================================================

  describe('isBooking', () => {
    it('should return true for valid booking object', () => {
      const validBooking = {
        id: 'booking-001',
        booking_date: '2025-01-23',
        status: 'confirmed',
        start_time: '09:00:00',
        end_time: '11:00:00',
        customer_id: 'customer-001',
      }

      expect(isBooking(validBooking)).toBe(true)
    })

    it('should return false for object missing required fields', () => {
      const invalidBooking = {
        id: 'booking-001',
        status: 'confirmed',
      }

      expect(isBooking(invalidBooking)).toBe(false)
    })

    it('should return false for null', () => {
      expect(isBooking(null)).toBe(false)
    })

    it('should return false for non-object types', () => {
      expect(isBooking('string')).toBe(false)
      expect(isBooking(123)).toBe(false)
    })

    it('should return false for object with wrong property types', () => {
      const invalidBooking = {
        id: 'booking-001',
        booking_date: 123, // Should be string
        status: 'confirmed',
        start_time: '09:00:00',
        end_time: '11:00:00',
      }

      expect(isBooking(invalidBooking)).toBe(false)
    })
  })

  // ==========================================================================
  // TEAM TYPE GUARDS
  // ==========================================================================

  describe('isTeam', () => {
    it('should return true for valid team object', () => {
      const validTeam = {
        id: 'team-001',
        name: 'Team Alpha',
        is_active: true,
      }

      expect(isTeam(validTeam)).toBe(true)
    })

    it('should return false for object missing id', () => {
      const invalidTeam = {
        name: 'Team Alpha',
        is_active: true,
      }

      expect(isTeam(invalidTeam)).toBe(false)
    })

    it('should return false for object missing name', () => {
      const invalidTeam = {
        id: 'team-001',
        is_active: true,
      }

      expect(isTeam(invalidTeam)).toBe(false)
    })

    it('should return false for object missing is_active', () => {
      const invalidTeam = {
        id: 'team-001',
        name: 'Team Alpha',
      }

      expect(isTeam(invalidTeam)).toBe(false)
    })

    it('should return false for object with wrong property types', () => {
      const invalidTeam = {
        id: 'team-001',
        name: 'Team Alpha',
        is_active: 'true', // Should be boolean
      }

      expect(isTeam(invalidTeam)).toBe(false)
    })

    it('should return false for null', () => {
      expect(isTeam(null)).toBe(false)
    })
  })

  // ==========================================================================
  // STAFF TYPE GUARDS
  // ==========================================================================

  describe('isStaff', () => {
    it('should return true for valid staff object', () => {
      const validStaff = {
        id: 'staff-001',
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'staff',
        is_active: true,
      }

      expect(isStaff(validStaff)).toBe(true)
    })

    it('should return false for object missing required fields', () => {
      const invalidStaff = {
        id: 'staff-001',
        full_name: 'Jane Doe',
      }

      expect(isStaff(invalidStaff)).toBe(false)
    })

    it('should return false for object with wrong property types', () => {
      const invalidStaff = {
        id: 'staff-001',
        full_name: 123, // Should be string
        email: 'jane@example.com',
        role: 'staff',
        is_active: true,
      }

      expect(isStaff(invalidStaff)).toBe(false)
    })

    it('should return false for null', () => {
      expect(isStaff(null)).toBe(false)
    })
  })

  // ==========================================================================
  // SERVICE PACKAGE TYPE GUARDS
  // ==========================================================================

  describe('isServicePackage', () => {
    it('should return true for valid service package', () => {
      const validPackage = {
        id: 'pkg-001',
        name: 'Basic Cleaning',
        price: 1500,
      }

      expect(isServicePackage(validPackage)).toBe(true)
    })

    it('should return false for object missing required fields', () => {
      const invalidPackage = {
        id: 'pkg-001',
        name: 'Basic Cleaning',
      }

      expect(isServicePackage(invalidPackage)).toBe(false)
    })

    it('should return false for object with wrong property types', () => {
      const invalidPackage = {
        id: 'pkg-001',
        name: 'Basic Cleaning',
        price: '1500', // Should be number
      }

      expect(isServicePackage(invalidPackage)).toBe(false)
    })

    it('should return false for null', () => {
      expect(isServicePackage(null)).toBe(false)
    })
  })

  // ==========================================================================
  // ARRAY TYPE GUARDS
  // ==========================================================================

  describe('isArrayOf', () => {
    it('should return true for array of valid items', () => {
      const customers = [
        { id: '1', full_name: 'John', email: 'john@example.com' },
        { id: '2', full_name: 'Jane', email: 'jane@example.com' },
      ]

      expect(isArrayOf(customers, isCustomer)).toBe(true)
    })

    it('should return false for array with invalid items', () => {
      const mixedArray = [
        { id: '1', full_name: 'John', email: 'john@example.com' },
        { id: '2' }, // Missing required fields
      ]

      expect(isArrayOf(mixedArray, isCustomer)).toBe(false)
    })

    it('should return true for empty array', () => {
      expect(isArrayOf([], isCustomer)).toBe(true)
    })

    it('should return false for non-array', () => {
      expect(isArrayOf('not an array', isCustomer)).toBe(false)
      expect(isArrayOf({ not: 'array' }, isCustomer)).toBe(false)
      expect(isArrayOf(null, isCustomer)).toBe(false)
    })
  })

  describe('isNonEmptyArrayOf', () => {
    it('should return true for non-empty array of valid items', () => {
      const customers = [
        { id: '1', full_name: 'John', email: 'john@example.com' },
      ]

      expect(isNonEmptyArrayOf(customers, isCustomer)).toBe(true)
    })

    it('should return false for empty array', () => {
      expect(isNonEmptyArrayOf([], isCustomer)).toBe(false)
    })

    it('should return false for array with invalid items', () => {
      const mixedArray = [
        { id: '1' }, // Missing required fields
      ]

      expect(isNonEmptyArrayOf(mixedArray, isCustomer)).toBe(false)
    })

    it('should return false for non-array', () => {
      expect(isNonEmptyArrayOf('not an array', isCustomer)).toBe(false)
    })
  })

  // ==========================================================================
  // ASSERTION UTILITIES
  // ==========================================================================

  describe('assertType', () => {
    it('should not throw for valid type', () => {
      const validCustomer = {
        id: 'customer-001',
        full_name: 'John Doe',
        email: 'john@example.com',
      }

      expect(() => assertType(validCustomer, isCustomer)).not.toThrow()
    })

    it('should throw TypeError for invalid type', () => {
      const invalidCustomer = { id: 'customer-001' }

      expect(() => assertType(invalidCustomer, isCustomer)).toThrow(TypeError)
    })

    it('should throw with custom error message', () => {
      const invalidCustomer = { id: 'customer-001' }
      const customMessage = 'Custom error message'

      expect(() => assertType(invalidCustomer, isCustomer, customMessage))
        .toThrow(customMessage)
    })

    it('should throw with default message when not provided', () => {
      const invalidCustomer = { id: 'customer-001' }

      expect(() => assertType(invalidCustomer, isCustomer))
        .toThrow('Type assertion failed')
    })
  })

  describe('assertArrayType', () => {
    it('should not throw for valid array', () => {
      const validCustomers = [
        { id: '1', full_name: 'John', email: 'john@example.com' },
        { id: '2', full_name: 'Jane', email: 'jane@example.com' },
      ]

      expect(() => assertArrayType(validCustomers, isCustomer)).not.toThrow()
    })

    it('should throw TypeError for invalid array', () => {
      const invalidCustomers = [
        { id: '1', full_name: 'John', email: 'john@example.com' },
        { id: '2' }, // Invalid
      ]

      expect(() => assertArrayType(invalidCustomers, isCustomer)).toThrow(TypeError)
    })

    it('should throw TypeError for non-array', () => {
      expect(() => assertArrayType('not an array', isCustomer)).toThrow(TypeError)
    })

    it('should throw with custom error message', () => {
      const customMessage = 'Custom array error'

      expect(() => assertArrayType('invalid', isCustomer, customMessage))
        .toThrow(customMessage)
    })

    it('should not throw for empty array', () => {
      expect(() => assertArrayType([], isCustomer)).not.toThrow()
    })
  })

  // ==========================================================================
  // NULLABLE TYPE GUARDS
  // ==========================================================================

  describe('isNonNullable', () => {
    it('should return true for non-null, non-undefined values', () => {
      expect(isNonNullable(0)).toBe(true)
      expect(isNonNullable('')).toBe(true)
      expect(isNonNullable(false)).toBe(true)
      expect(isNonNullable([])).toBe(true)
      expect(isNonNullable({})).toBe(true)
      expect(isNonNullable('value')).toBe(true)
      expect(isNonNullable(123)).toBe(true)
    })

    it('should return false for null', () => {
      expect(isNonNullable(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isNonNullable(undefined)).toBe(false)
    })

    it('should filter array correctly', () => {
      const values = [1, null, 2, undefined, 3, null, 4]
      const filtered = values.filter(isNonNullable)

      expect(filtered).toEqual([1, 2, 3, 4])
      expect(filtered.length).toBe(4)
    })
  })

  describe('isDefined', () => {
    it('should return true for defined values', () => {
      expect(isDefined(0)).toBe(true)
      expect(isDefined('')).toBe(true)
      expect(isDefined(false)).toBe(true)
      expect(isDefined(null)).toBe(true) // null is defined, not undefined
      expect(isDefined([])).toBe(true)
      expect(isDefined({})).toBe(true)
    })

    it('should return false for undefined', () => {
      expect(isDefined(undefined)).toBe(false)
    })

    it('should filter array correctly', () => {
      const values = [1, undefined, 2, undefined, 3]
      const filtered = values.filter(isDefined)

      expect(filtered).toEqual([1, 2, 3])
      expect(filtered.length).toBe(3)
    })
  })

  // ==========================================================================
  // UTILITY TYPE GUARDS
  // ==========================================================================

  describe('isString', () => {
    it('should return true for strings', () => {
      expect(isString('')).toBe(true)
      expect(isString('hello')).toBe(true)
      expect(isString('123')).toBe(true)
      expect(isString(String(123))).toBe(true)
    })

    it('should return false for non-strings', () => {
      expect(isString(123)).toBe(false)
      expect(isString(true)).toBe(false)
      expect(isString(null)).toBe(false)
      expect(isString(undefined)).toBe(false)
      expect(isString([])).toBe(false)
      expect(isString({})).toBe(false)
    })
  })

  describe('isNumber', () => {
    it('should return true for valid numbers', () => {
      expect(isNumber(0)).toBe(true)
      expect(isNumber(123)).toBe(true)
      expect(isNumber(-456)).toBe(true)
      expect(isNumber(3.14)).toBe(true)
      expect(isNumber(Infinity)).toBe(true)
      expect(isNumber(-Infinity)).toBe(true)
    })

    it('should return false for NaN', () => {
      expect(isNumber(NaN)).toBe(false)
    })

    it('should return false for non-numbers', () => {
      expect(isNumber('123')).toBe(false)
      expect(isNumber(true)).toBe(false)
      expect(isNumber(null)).toBe(false)
      expect(isNumber(undefined)).toBe(false)
      expect(isNumber([])).toBe(false)
      expect(isNumber({})).toBe(false)
    })
  })

  describe('isBoolean', () => {
    it('should return true for booleans', () => {
      expect(isBoolean(true)).toBe(true)
      expect(isBoolean(false)).toBe(true)
      expect(isBoolean(Boolean(1))).toBe(true)
    })

    it('should return false for non-booleans', () => {
      expect(isBoolean(1)).toBe(false)
      expect(isBoolean(0)).toBe(false)
      expect(isBoolean('true')).toBe(false)
      expect(isBoolean('false')).toBe(false)
      expect(isBoolean(null)).toBe(false)
      expect(isBoolean(undefined)).toBe(false)
      expect(isBoolean([])).toBe(false)
      expect(isBoolean({})).toBe(false)
    })
  })

  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true)
      expect(isObject({ key: 'value' })).toBe(true)
      expect(isObject(new Object())).toBe(true)
      expect(isObject(Object.create(null))).toBe(true)
    })

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false)
    })

    it('should return false for arrays', () => {
      expect(isObject([])).toBe(false)
      expect(isObject([1, 2, 3])).toBe(false)
    })

    it('should return false for primitives', () => {
      expect(isObject('string')).toBe(false)
      expect(isObject(123)).toBe(false)
      expect(isObject(true)).toBe(false)
      expect(isObject(undefined)).toBe(false)
    })

    it('should return true for function objects', () => {
      expect(isObject(new Date())).toBe(true)
      expect(isObject(new RegExp('test'))).toBe(true)
    })
  })

  // ==========================================================================
  // SUPABASE QUERY RESULT GUARDS
  // ==========================================================================

  describe('ensureArray', () => {
    it('should return array as-is', () => {
      const arr = [1, 2, 3]
      expect(ensureArray(arr)).toEqual([1, 2, 3])
      expect(ensureArray(arr)).toBe(arr) // Same reference
    })

    it('should return empty array for null', () => {
      expect(ensureArray(null)).toEqual([])
    })

    it('should return empty array for undefined', () => {
      expect(ensureArray(undefined)).toEqual([])
    })

    it('should handle array of objects', () => {
      const customers = [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ]

      expect(ensureArray(customers)).toEqual(customers)
    })

    it('should return empty array for null with no default', () => {
      const result = ensureArray<{ id: string }>(null)
      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('ensureSingle', () => {
    it('should return value as-is', () => {
      const value = { id: '1', name: 'John' }
      expect(ensureSingle(value)).toBe(value)
    })

    it('should return null for null input with default null', () => {
      expect(ensureSingle(null)).toBe(null)
    })

    it('should return null for undefined input with default null', () => {
      expect(ensureSingle(undefined)).toBe(null)
    })

    it('should return custom default value', () => {
      const defaultValue = { id: 'default', name: 'Default' }

      expect(ensureSingle(null, defaultValue)).toBe(defaultValue)
      expect(ensureSingle(undefined, defaultValue)).toBe(defaultValue)
    })

    it('should return value even if default provided', () => {
      const value = { id: '1', name: 'John' }
      const defaultValue = { id: 'default', name: 'Default' }

      expect(ensureSingle(value, defaultValue)).toBe(value)
    })

    it('should handle primitive values', () => {
      expect(ensureSingle(0, 1)).toBe(0)
      expect(ensureSingle('', 'default')).toBe('')
      expect(ensureSingle(false, true)).toBe(false)
    })
  })

  // ==========================================================================
  // INTEGRATION TESTS
  // ==========================================================================

  describe('integration scenarios', () => {
    it('should work with filter and type guards together', () => {
      const mixedData = [
        { id: '1', full_name: 'John', email: 'john@example.com' },
        { id: '2' }, // Invalid
        { id: '3', full_name: 'Jane', email: 'jane@example.com' },
        null,
        undefined,
      ]

      const validCustomers = mixedData.filter(isNonNullable).filter(isCustomer)

      expect(validCustomers).toHaveLength(2)
      expect(validCustomers[0].full_name).toBe('John')
      expect(validCustomers[1].full_name).toBe('Jane')
    })

    it('should work with assertion and array processing', () => {
      const data = [
        { id: '1', full_name: 'John', email: 'john@example.com' },
        { id: '2', full_name: 'Jane', email: 'jane@example.com' },
      ]

      expect(() => assertArrayType(data, isCustomer)).not.toThrow()

      // After assertion, TypeScript knows data is Customer[]
      const names = data.map((c) => c.full_name)
      expect(names).toEqual(['John', 'Jane'])
    })

    it('should handle Supabase-like null responses', () => {
      // Simulate Supabase returning null
      const supabaseResponse = null

      const customers = ensureArray(supabaseResponse)

      expect(customers).toEqual([])
      expect(customers.length).toBe(0)
    })
  })
})
