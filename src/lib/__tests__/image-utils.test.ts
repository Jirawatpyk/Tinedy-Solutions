import { describe, it, expect } from 'vitest'
import { getOptimizedUrl } from '../image-utils'

describe('getOptimizedUrl', () => {
  it('should add transform params to Supabase URL', () => {
    const src = 'https://abc.supabase.co/storage/v1/object/public/avatars/photo.jpg'
    const result = getOptimizedUrl(src, 64)

    expect(result).toContain('width=64')
    expect(result).toContain('height=64')
    expect(result).toContain('resize=cover')
  })

  it('should handle Supabase URL with existing query params', () => {
    const src = 'https://abc.supabase.co/storage/v1/object/public/avatars/photo.jpg?token=abc123'
    const result = getOptimizedUrl(src, 128)

    expect(result).toContain('token=abc123')
    expect(result).toContain('width=128')
    expect(result).toContain('height=128')
    expect(result).toContain('resize=cover')
  })

  it('should return non-Supabase URLs unchanged', () => {
    const src = 'https://example.com/photo.jpg'
    const result = getOptimizedUrl(src, 64)

    expect(result).toBe(src)
  })

  it('should return invalid URLs unchanged', () => {
    const src = 'not-a-valid-url'
    const result = getOptimizedUrl(src, 64)

    expect(result).toBe(src)
  })

  it('should return relative paths unchanged', () => {
    const src = '/images/photo.jpg'
    const result = getOptimizedUrl(src, 64)

    expect(result).toBe(src)
  })

  it('should handle empty string', () => {
    const result = getOptimizedUrl('', 64)
    expect(result).toBe('')
  })

  it('should use correct size parameter', () => {
    const src = 'https://abc.supabase.co/storage/v1/object/public/avatars/photo.jpg'

    const small = getOptimizedUrl(src, 32)
    expect(small).toContain('width=32')
    expect(small).toContain('height=32')

    const large = getOptimizedUrl(src, 256)
    expect(large).toContain('width=256')
    expect(large).toContain('height=256')
  })
})
