/**
 * Tests for string-utils.ts
 */

import { describe, expect, it } from 'vitest'
import { getInitials } from '../string-utils'

describe('getInitials', () => {
  it('returns initials for a full name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('returns single initial for a single name', () => {
    expect(getInitials('Alice')).toBe('A')
  })

  it('limits to 2 characters', () => {
    expect(getInitials('John Michael Doe')).toBe('JM')
  })

  it('returns uppercase initials', () => {
    expect(getInitials('john doe')).toBe('JD')
  })

  it('returns ? for null', () => {
    expect(getInitials(null)).toBe('?')
  })

  it('returns ? for undefined', () => {
    expect(getInitials(undefined)).toBe('?')
  })

  it('returns ? for empty string', () => {
    expect(getInitials('')).toBe('?')
  })

  it('handles names with multiple spaces', () => {
    expect(getInitials('John  Doe')).toBe('JD')
  })

  it('handles single character name parts', () => {
    expect(getInitials('A B C')).toBe('AB')
  })
})
