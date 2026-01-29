/**
 * Image optimization utilities for Supabase storage
 */

/**
 * Get optimized URL with Supabase image transforms.
 * Safely handles URLs that already have query parameters.
 *
 * @param src - The source URL of the image
 * @param size - The desired width/height in pixels
 * @returns The optimized URL with transform parameters (Supabase only) or original URL
 */
export function getOptimizedUrl(src: string, size: number): string {
  try {
    const url = new URL(src)
    if (url.hostname.includes('supabase')) {
      url.searchParams.set('width', String(size))
      url.searchParams.set('height', String(size))
      url.searchParams.set('resize', 'cover')
      return url.toString()
    }
  } catch {
    // Not a valid URL, return as-is
  }
  return src
}
