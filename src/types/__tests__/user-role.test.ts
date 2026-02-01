import { describe, it, expect } from 'vitest'
import { UserRole } from '../common'

describe('UserRole const object', () => {
  it('should have lowercase values matching DB', () => {
    expect(UserRole.Admin).toBe('admin')
    expect(UserRole.Manager).toBe('manager')
    expect(UserRole.Staff).toBe('staff')
    expect(UserRole.Customer).toBe('customer')
  })

  it('should be usable as type', () => {
    const role: UserRole = UserRole.Admin
    expect(role).toBe('admin')
  })

  it('should have exactly 4 roles', () => {
    const keys = Object.keys(UserRole)
    expect(keys).toHaveLength(4)
  })
})
