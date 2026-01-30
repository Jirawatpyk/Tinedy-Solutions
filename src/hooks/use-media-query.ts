/**
 * useMediaQuery Hook
 *
 * React hook for responsive design - detects media query matches
 * Based on shadcn/ui patterns
 *
 * @param query - CSS media query string (e.g., "(min-width: 768px)")
 * @returns boolean - true if media query matches
 */

import { useState, useEffect } from 'react'

/**
 * Tailwind CSS breakpoints (in pixels)
 * Keep in sync with tailwind.config.js
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

/**
 * Pre-built media queries matching Tailwind breakpoints
 */
export const MEDIA_QUERIES = {
  /** Mobile: < 1024px (below lg breakpoint) */
  mobile: `(max-width: ${BREAKPOINTS.lg - 1}px)`,
  /** Desktop: >= 1024px (lg breakpoint and above) */
  desktop: `(min-width: ${BREAKPOINTS.lg}px)`,
  /** Tablet: >= 768px and < 1024px */
  tablet: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
} as const

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    // SSR safety check
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') return

    // Create media query list
    const media = window.matchMedia(query)

    // Set initial value
    setMatches(media.matches)

    // Create event listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener (using deprecated addListener for wider browser support)
    if (media.addEventListener) {
      media.addEventListener('change', listener)
    } else {
      // Fallback for older browsers
      media.addListener(listener)
    }

    // Cleanup
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener)
      } else {
        // Fallback for older browsers
        media.removeListener(listener)
      }
    }
  }, [query])

  return matches
}

/**
 * Convenience hook for mobile detection
 * @returns true if viewport is below lg breakpoint (< 1024px)
 */
export function useIsMobile(): boolean {
  return useMediaQuery(MEDIA_QUERIES.mobile)
}
