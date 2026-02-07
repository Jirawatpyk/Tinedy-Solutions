/**
 * usePageMetadata Hook
 *
 * Automatically manages page title based on current route.
 * Updates document.title when pathname changes.
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getPageMetadata, type PageMetadata } from '@/lib/route-utils'

/**
 * Hook to get and automatically update page metadata
 *
 * Features:
 * - Automatically sets document.title based on route
 * - Returns page metadata (title, description)
 * - Updates on route changes
 *
 * @returns Page metadata for current route
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const { title } = usePageMetadata()
 *   return <h1>{title}</h1>
 * }
 * ```
 */
export function usePageMetadata(): PageMetadata {
  const location = useLocation()
  const metadata = getPageMetadata(location.pathname)

  // Update document title when route changes
  useEffect(() => {
    const fullTitle = metadata.title
      ? `${metadata.title} - Tinedy CRM`
      : 'Tinedy CRM'

    document.title = fullTitle
  }, [metadata.title])

  return metadata
}
