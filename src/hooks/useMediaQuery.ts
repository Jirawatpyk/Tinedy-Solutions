/**
 * useMediaQuery Hook
 *
 * React hook for responsive design using CSS media queries.
 * Returns true if the media query matches, false otherwise.
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery('(max-width: 1023px)')
 * const isDesktop = useMediaQuery('(min-width: 1024px)')
 *
 * return isMobile ? <MobileView /> : <DesktopView />
 * ```
 */

import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    // Check if window is available (for SSR)
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)

    // Update state when query matches change
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Set initial value
    setMatches(mediaQuery.matches)

    // Add listener
    mediaQuery.addEventListener('change', handleChange)

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  return matches
}
