/**
 * usePageMetadata Hook
 *
 * Automatically manages page title and provides metadata based on current route.
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
 * - Returns page metadata (title, description, breadcrumbs)
 * - Updates on route changes
 *
 * @returns Page metadata for current route
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const { title, breadcrumbs } = usePageMetadata()
 *
 *   return (
 *     <div>
 *       <h1>{title}</h1>
 *       <Breadcrumbs items={breadcrumbs} />
 *     </div>
 *   )
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

/**
 * Hook variant that only returns specific metadata field
 *
 * @param field - Metadata field to return
 * @returns Single metadata field value
 *
 * @example
 * ```tsx
 * const title = usePageMetadataField('title')
 * const breadcrumbs = usePageMetadataField('breadcrumbs')
 * ```
 */
export function usePageMetadataField<K extends keyof PageMetadata>(
  field: K
): PageMetadata[K] {
  const metadata = usePageMetadata()
  return metadata[field]
}

/**
 * Hook to get only page title
 *
 * Convenience hook for when you only need the title
 *
 * @returns Current page title
 *
 * @example
 * ```tsx
 * const title = usePageTitle()
 * ```
 */
export function usePageTitle(): string {
  return usePageMetadataField('title')
}

/**
 * Hook to get only breadcrumbs
 *
 * Convenience hook for when you only need breadcrumbs
 *
 * @returns Current page breadcrumbs
 *
 * @example
 * ```tsx
 * const breadcrumbs = useBreadcrumbs()
 * ```
 */
export function useBreadcrumbs(): string[] {
  return usePageMetadataField('breadcrumbs')
}
