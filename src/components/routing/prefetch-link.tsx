/**
 * PrefetchLink Component
 *
 * Enhanced Link component with route prefetching
 * ใช้แทน React Router's Link เพื่อ prefetch routes อัตโนมัติ
 *
 * Features:
 * - Hover prefetching (configurable delay)
 * - Visibility-based prefetching (Intersection Observer)
 * - Network-aware (respects Save-Data, slow connections)
 * - Fully compatible with React Router Link API
 *
 * @module prefetch-link
 */

import { useRef, useEffect, useCallback, useMemo } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import {
  prefetchRoute,
  shouldEnablePrefetch,
  type PrefetchConfig,
} from '@/lib/route-prefetch'

interface PrefetchLinkProps extends LinkProps {
  /**
   * Prefetch on hover (default: true)
   */
  prefetchOnHover?: boolean

  /**
   * Prefetch เมื่อ link ปรากฏใน viewport (default: false)
   */
  prefetchOnVisible?: boolean

  /**
   * Hover delay ก่อน prefetch (milliseconds)
   * Default: 50ms
   */
  hoverDelay?: number

  /**
   * Prefetch priority
   * Default: 'low'
   */
  priority?: 'high' | 'low'

  /**
   * Respect Save-Data header (default: true)
   */
  respectSaveData?: boolean

  /**
   * Disable on slow connections (default: true)
   */
  disableOnSlowConnection?: boolean
}

/**
 * PrefetchLink Component
 *
 * Enhanced Link component ที่ prefetch routes อัตโนมัติ
 *
 * @example
 * ```tsx
 * // Basic usage - prefetch on hover
 * <PrefetchLink to="/admin/customers">
 *   Customers
 * </PrefetchLink>
 *
 * // Prefetch เมื่อ visible
 * <PrefetchLink
 *   to="/admin/reports"
 *   prefetchOnHover={false}
 *   prefetchOnVisible={true}
 * >
 *   Reports
 * </PrefetchLink>
 *
 * // High priority prefetch
 * <PrefetchLink
 *   to="/admin/dashboard"
 *   priority="high"
 * >
 *   Dashboard
 * </PrefetchLink>
 * ```
 */
export function PrefetchLink({
  to,
  prefetchOnHover = true,
  prefetchOnVisible = false,
  hoverDelay = 50,
  priority = 'low',
  respectSaveData = true,
  disableOnSlowConnection = true,
  onMouseEnter,
  onFocus,
  ...linkProps
}: PrefetchLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null)
  const hoverTimerRef = useRef<NodeJS.Timeout>()

  // แปลง `to` เป็น string path
  const path = typeof to === 'string' ? to : to.pathname || ''

  // Prefetch configuration
  const config: Partial<PrefetchConfig> = useMemo(() => ({
    priority,
    respectSaveData,
    disableOnSlowConnection,
    hoverDelay,
  }), [priority, respectSaveData, disableOnSlowConnection, hoverDelay])

  /**
   * Execute prefetch
   */
  const executePrefetch = useCallback(() => {
    if (shouldEnablePrefetch(config)) {
      prefetchRoute(path, config)
    }
  }, [path, config])

  /**
   * Handle mouse enter (hover)
   */
  const handleMouseEnter = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (prefetchOnHover) {
      // Clear existing timer
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }

      // Start hover delay timer
      hoverTimerRef.current = setTimeout(executePrefetch, hoverDelay)
    }

    // Call original onMouseEnter
    onMouseEnter?.(event)
  }

  /**
   * Handle focus (keyboard navigation)
   */
  const handleFocus = (event: React.FocusEvent<HTMLAnchorElement>) => {
    if (prefetchOnHover) {
      executePrefetch()
    }

    // Call original onFocus
    onFocus?.(event)
  }

  /**
   * Visibility-based prefetch using Intersection Observer
   */
  useEffect(() => {
    if (!prefetchOnVisible || !linkRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            executePrefetch()
            // Unobserve หลัง prefetch แล้ว
            observer.unobserve(entry.target)
          }
        })
      },
      {
        // Prefetch เมื่อ link เริ่มปรากฏใน viewport
        rootMargin: '50px',
        threshold: 0.1,
      }
    )

    observer.observe(linkRef.current)

    return () => {
      observer.disconnect()
    }
  }, [prefetchOnVisible, path, executePrefetch])

  /**
   * Cleanup hover timer on unmount
   */
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
    }
  }, [])

  return (
    <Link
      ref={linkRef}
      to={to}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      {...linkProps}
    />
  )
}

/**
 * usePrefetchOnMount Hook
 *
 * Hook สำหรับ prefetch routes เมื่อ component mount
 * ใช้สำหรับ predictive prefetching
 *
 * @param paths - Array of route paths to prefetch
 * @param config - Prefetch configuration
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   // Prefetch likely next routes
 *   usePrefetchOnMount([
 *     '/admin/customers',
 *     '/admin/bookings',
 *   ])
 *
 *   return <div>Dashboard</div>
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function usePrefetchOnMount(
  paths: string[],
  config: Partial<PrefetchConfig> = {}
) {
  useEffect(() => {
    if (!shouldEnablePrefetch(config)) return

    // Prefetch แต่ละ path
    paths.forEach((path) => {
      prefetchRoute(path, config)
    })
  }, [config, paths]) // Include all dependencies
}

/**
 * usePrefetchOnIdle Hook
 *
 * Hook สำหรับ prefetch routes เมื่อ browser idle
 * ใช้ requestIdleCallback API
 *
 * @param paths - Array of route paths to prefetch
 * @param config - Prefetch configuration
 *
 * @example
 * ```tsx
 * function HomePage() {
 *   // Prefetch routes เมื่อ browser ว่าง
 *   usePrefetchOnIdle([
 *     '/admin/reports',
 *     '/admin/settings',
 *   ])
 *
 *   return <div>Home Page</div>
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function usePrefetchOnIdle(
  paths: string[],
  config: Partial<PrefetchConfig> = {}
) {
  useEffect(() => {
    if (!shouldEnablePrefetch(config)) return

    // ตรวจสอบว่า browser support requestIdleCallback หรือไม่
    if (typeof requestIdleCallback === 'undefined') {
      // Fallback: ใช้ setTimeout
      const timer = setTimeout(() => {
        paths.forEach((path) => {
          prefetchRoute(path, config)
        })
      }, 1000)

      return () => clearTimeout(timer)
    }

    // ใช้ requestIdleCallback
    const idleCallbackId = requestIdleCallback(
      () => {
        paths.forEach((path) => {
          prefetchRoute(path, config)
        })
      },
      { timeout: 2000 } // Timeout หลัง 2 วินาที
    )

    return () => cancelIdleCallback(idleCallbackId)
  }, [config, paths])
}

/**
 * PrefetchOnHover Component
 *
 * Wrapper component สำหรับ prefetch เมื่อ hover บน element ใดก็ได้
 * (ไม่จำเป็นต้องเป็น Link)
 *
 * @example
 * ```tsx
 * <PrefetchOnHover path="/admin/customers">
 *   <button>View Customers</button>
 * </PrefetchOnHover>
 * ```
 */
interface PrefetchOnHoverProps {
  path: string
  children: React.ReactNode
  hoverDelay?: number
  priority?: 'high' | 'low'
}

export function PrefetchOnHover({
  path,
  children,
  hoverDelay = 50,
  priority = 'low',
}: PrefetchOnHoverProps) {
  const hoverTimerRef = useRef<NodeJS.Timeout>()

  const handleMouseEnter = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
    }

    hoverTimerRef.current = setTimeout(() => {
      if (shouldEnablePrefetch({ priority })) {
        prefetchRoute(path, { priority })
      }
    }, hoverDelay)
  }

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
    }
  }

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
    }
  }, [])

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'inline-block' }}
    >
      {children}
    </div>
  )
}
