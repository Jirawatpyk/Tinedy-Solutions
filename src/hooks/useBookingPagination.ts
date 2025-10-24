import { useState, useMemo, useCallback } from 'react'

export interface UsePaginationOptions {
  initialPage?: number
  itemsPerPage?: number
}

/**
 * Generic pagination hook
 *
 * Can be used for any paginated list (bookings, customers, staff, etc.)
 *
 * @example
 * ```tsx
 * const { items, currentPage, totalPages, nextPage, prevPage } = usePagination(
 *   bookings,
 *   { itemsPerPage: 10 }
 * )
 * ```
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
) {
  const { initialPage = 1, itemsPerPage = 10 } = options

  const [currentPage, setCurrentPage] = useState(initialPage)

  /**
   * Calculate total number of pages
   */
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(items.length / itemsPerPage))
  }, [items.length, itemsPerPage])

  /**
   * Get paginated items for current page
   */
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return items.slice(startIndex, endIndex)
  }, [items, currentPage, itemsPerPage])

  /**
   * Go to next page
   */
  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }, [totalPages])

  /**
   * Go to previous page
   */
  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }, [])

  /**
   * Go to specific page
   */
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages))
      setCurrentPage(validPage)
    },
    [totalPages]
  )

  /**
   * Go to first page
   */
  const goToFirst = useCallback(() => {
    setCurrentPage(1)
  }, [])

  /**
   * Go to last page
   */
  const goToLast = useCallback(() => {
    setCurrentPage(totalPages)
  }, [totalPages])

  /**
   * Reset to first page (useful when filters change)
   */
  const resetPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  /**
   * Calculate pagination metadata
   */
  const metadata = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = Math.min(startIndex + itemsPerPage, items.length)

    return {
      currentPage,
      totalPages,
      totalItems: items.length,
      itemsPerPage,
      startIndex: startIndex + 1, // 1-indexed for display
      endIndex,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      isFirstPage: currentPage === 1,
      isLastPage: currentPage === totalPages,
    }
  }, [currentPage, totalPages, items.length, itemsPerPage])

  return {
    // Paginated data
    items: paginatedItems,

    // Page state
    currentPage,
    totalPages,

    // Navigation
    nextPage,
    prevPage,
    goToPage,
    goToFirst,
    goToLast,
    resetPage,
    setCurrentPage,

    // Metadata
    metadata,
  }
}

// Export alias for backward compatibility
export const useBookingPagination = usePagination
