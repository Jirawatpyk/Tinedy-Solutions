import { describe, it, expect } from 'vitest'
import { BookingStatus } from '../booking'

describe('BookingStatus const object', () => {
  it('should have lowercase values matching DB', () => {
    expect(BookingStatus.Pending).toBe('pending')
    expect(BookingStatus.Confirmed).toBe('confirmed')
    expect(BookingStatus.InProgress).toBe('in_progress')
    expect(BookingStatus.Completed).toBe('completed')
    expect(BookingStatus.Cancelled).toBe('cancelled')
    expect(BookingStatus.NoShow).toBe('no_show')
  })

  it('should be usable as type', () => {
    const status: BookingStatus = BookingStatus.Pending
    expect(status).toBe('pending')
  })

  it('should have exactly 6 statuses', () => {
    const keys = Object.keys(BookingStatus)
    expect(keys).toHaveLength(6)
  })
})
