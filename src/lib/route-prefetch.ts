/**
 * Route Prefetch Utilities
 *
 * ระบบสำหรับ prefetch routes เพื่อเพิ่ม perceived performance
 * ใช้ lazy loading และ network-aware prefetching
 *
 * Features:
 * - Network condition detection (Save-Data, connection type)
 * - Configurable prefetch strategies (hover, visible, predictive)
 * - Resource priority management
 * - Memory-efficient caching
 *
 * @module route-prefetch
 */

/**
 * Network connection types
 */
type ConnectionType = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown'

/**
 * Network Information API (experimental)
 * https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */
interface NetworkInformation {
  effectiveType?: ConnectionType
  saveData?: boolean
  downlink?: number
  rtt?: number
}

/**
 * Extended Navigator interface with Network Information API
 */
interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
  mozConnection?: NetworkInformation
  webkitConnection?: NetworkInformation
}

/**
 * Prefetch strategy types
 */
export type PrefetchStrategy = 'hover' | 'visible' | 'instant' | 'none'

/**
 * Prefetch configuration
 */
export interface PrefetchConfig {
  /**
   * Strategy สำหรับ prefetch
   * - hover: Prefetch เมื่อ hover (delay 50ms)
   * - visible: Prefetch เมื่อปรากฏใน viewport
   * - instant: Prefetch ทันที
   * - none: ไม่ prefetch
   */
  strategy: PrefetchStrategy

  /**
   * Hover delay (milliseconds)
   * Default: 50ms
   */
  hoverDelay?: number

  /**
   * Respect Save-Data header
   * Default: true
   */
  respectSaveData?: boolean

  /**
   * Disable on slow connections
   * Default: true
   */
  disableOnSlowConnection?: boolean

  /**
   * Prefetch priority
   * Default: 'low'
   */
  priority?: 'high' | 'low'
}

/**
 * Default prefetch configuration
 */
export const DEFAULT_PREFETCH_CONFIG: Required<PrefetchConfig> = {
  strategy: 'hover',
  hoverDelay: 50,
  respectSaveData: true,
  disableOnSlowConnection: true,
  priority: 'low',
}

/**
 * ดึง network information จาก browser API
 *
 * @returns Network information object หรือ null ถ้าไม่ support
 */
function getNetworkInformation(): NetworkInformation | null {
  if (typeof navigator === 'undefined') return null

  const nav = navigator as NavigatorWithConnection
  return nav.connection || nav.mozConnection || nav.webkitConnection || null
}

/**
 * ตรวจสอบว่า user เปิด Save-Data mode หรือไม่
 *
 * @returns true ถ้าเปิด Save-Data
 *
 * @example
 * ```ts
 * if (isSaveDataEnabled()) {
 *   // ข้าม prefetch เพื่อประหยัด bandwidth
 * }
 * ```
 */
export function isSaveDataEnabled(): boolean {
  const networkInfo = getNetworkInformation()
  return networkInfo?.saveData === true
}

/**
 * ตรวจสอบว่าเป็น slow connection หรือไม่
 *
 * @returns true ถ้าเป็น slow connection (2G, slow-2g)
 *
 * @example
 * ```ts
 * if (isSlowConnection()) {
 *   // ปิด prefetch บน slow connection
 * }
 * ```
 */
export function isSlowConnection(): boolean {
  const networkInfo = getNetworkInformation()

  if (!networkInfo) return false

  const slowTypes: ConnectionType[] = ['slow-2g', '2g']
  return slowTypes.includes(networkInfo.effectiveType || 'unknown')
}

/**
 * ตรวจสอบว่าควร enable prefetch หรือไม่
 * ตาม Save-Data และ connection type
 *
 * @param config - Prefetch configuration
 * @returns true ถ้าควร enable prefetch
 *
 * @example
 * ```ts
 * if (shouldEnablePrefetch({ respectSaveData: true })) {
 *   prefetchRoute('/admin/customers')
 * }
 * ```
 */
export function shouldEnablePrefetch(
  config: Partial<PrefetchConfig> = {}
): boolean {
  const fullConfig = { ...DEFAULT_PREFETCH_CONFIG, ...config }

  // ตรวจสอบ Save-Data
  if (fullConfig.respectSaveData && isSaveDataEnabled()) {
    return false
  }

  // ตรวจสอบ slow connection
  if (fullConfig.disableOnSlowConnection && isSlowConnection()) {
    return false
  }

  return true
}

/**
 * Prefetch Manager Class
 *
 * จัดการ prefetch requests และ caching
 */
class PrefetchManager {
  private prefetchedRoutes = new Set<string>()
  private pendingPrefetches = new Map<string, Promise<void>>()

  /**
   * Prefetch a route module
   *
   * @param path - Route path to prefetch
   * @param priority - Prefetch priority
   * @returns Promise that resolves when prefetch completes
   *
   * @example
   * ```ts
   * await prefetchManager.prefetch('/admin/customers', 'low')
   * ```
   */
  async prefetch(
    path: string,
    priority: 'high' | 'low' = 'low'
  ): Promise<void> {
    // ถ้า prefetch แล้ว ข้าม
    if (this.prefetchedRoutes.has(path)) {
      return
    }

    // ถ้ากำลัง prefetch อยู่ ให้รอ promise เดิม
    if (this.pendingPrefetches.has(path)) {
      return this.pendingPrefetches.get(path)
    }

    // สร้าง prefetch promise
    const prefetchPromise = this.executePrefetch(path, priority)

    // เก็บไว้ใน pending
    this.pendingPrefetches.set(path, prefetchPromise)

    try {
      await prefetchPromise
      this.prefetchedRoutes.add(path)
    } finally {
      this.pendingPrefetches.delete(path)
    }
  }

  /**
   * Execute actual prefetch logic
   *
   * @param path - Route path
   * @param priority - Prefetch priority
   */
  private async executePrefetch(
    path: string,
    priority: 'high' | 'low'
  ): Promise<void> {
    try {
      // ใน React Router, การ prefetch ทำได้โดยการ import lazy component
      // แต่เนื่องจากเราไม่มี direct access ถึง lazy imports ที่นี่
      // เราจะใช้ link prefetch approach แทน

      // สร้าง invisible link element
      const link = document.createElement('link')
      link.rel = priority === 'high' ? 'prefetch' : 'prefetch'
      link.as = 'fetch'
      link.href = path

      // เพิ่ม link ลงใน document head
      document.head.appendChild(link)

      // รอให้ prefetch เสร็จ
      await new Promise<void>((resolve) => {
        link.onload = () => resolve()
        link.onerror = () => resolve() // Ignore errors

        // Timeout หลัง 5 วินาที
        setTimeout(resolve, 5000)
      })

      // ลบ link ออกจาก DOM
      document.head.removeChild(link)
    } catch (error) {
      console.warn(`Failed to prefetch ${path}:`, error)
    }
  }

  /**
   * ตรวจสอบว่า route ถูก prefetch แล้วหรือยัง
   *
   * @param path - Route path
   * @returns true ถ้า prefetch แล้ว
   */
  isPrefetched(path: string): boolean {
    return this.prefetchedRoutes.has(path)
  }

  /**
   * Clear prefetch cache
   */
  clear(): void {
    this.prefetchedRoutes.clear()
    this.pendingPrefetches.clear()
  }

  /**
   * Get prefetch statistics
   */
  getStats() {
    return {
      prefetchedCount: this.prefetchedRoutes.size,
      pendingCount: this.pendingPrefetches.size,
      prefetchedRoutes: Array.from(this.prefetchedRoutes),
    }
  }
}

/**
 * Global prefetch manager instance
 */
export const prefetchManager = new PrefetchManager()

/**
 * Prefetch a route with configuration
 *
 * @param path - Route path to prefetch
 * @param config - Prefetch configuration
 *
 * @example
 * ```ts
 * // Prefetch on hover with delay
 * prefetchRoute('/admin/customers', {
 *   strategy: 'hover',
 *   hoverDelay: 100,
 * })
 *
 * // Instant prefetch
 * prefetchRoute('/admin/dashboard', {
 *   strategy: 'instant',
 *   priority: 'high',
 * })
 * ```
 */
export async function prefetchRoute(
  path: string,
  config: Partial<PrefetchConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_PREFETCH_CONFIG, ...config }

  // ตรวจสอบว่าควร prefetch หรือไม่
  if (!shouldEnablePrefetch(fullConfig)) {
    return
  }

  // Prefetch
  await prefetchManager.prefetch(path, fullConfig.priority)
}

/**
 * Predictive Prefetch Storage
 *
 * เก็บ navigation patterns สำหรับ predictive prefetching
 */
interface NavigationPattern {
  from: string
  to: string
  count: number
  lastVisited: number
}

const NAVIGATION_PATTERNS_KEY = 'tinedy-navigation-patterns'
const MAX_PATTERNS = 100

/**
 * บันทึก navigation pattern
 *
 * @param from - Route ต้นทาง
 * @param to - Route ปลายทาง
 */
export function recordNavigation(from: string, to: string): void {
  try {
    const patterns = getNavigationPatterns()

    // หา pattern ที่ตรง
    const existingPattern = patterns.find(
      (p) => p.from === from && p.to === to
    )

    if (existingPattern) {
      existingPattern.count++
      existingPattern.lastVisited = Date.now()
    } else {
      patterns.push({
        from,
        to,
        count: 1,
        lastVisited: Date.now(),
      })
    }

    // จำกัดจำนวน patterns
    if (patterns.length > MAX_PATTERNS) {
      // เรียงตาม count แล้วเก็บแค่ top patterns
      patterns.sort((a, b) => b.count - a.count)
      patterns.splice(MAX_PATTERNS)
    }

    // บันทึกลง localStorage
    localStorage.setItem(NAVIGATION_PATTERNS_KEY, JSON.stringify(patterns))
  } catch (error) {
    console.warn('Failed to record navigation pattern:', error)
  }
}

/**
 * ดึง navigation patterns จาก localStorage
 *
 * @returns Array of navigation patterns
 */
export function getNavigationPatterns(): NavigationPattern[] {
  try {
    const stored = localStorage.getItem(NAVIGATION_PATTERNS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    return []
  }
}

/**
 * ทำนาย routes ที่ user น่าจะไปต่อ
 *
 * @param currentPath - Route path ปัจจุบัน
 * @param limit - จำนวน predictions สูงสุด
 * @returns Array of predicted route paths
 */
export function predictNextRoutes(
  currentPath: string,
  limit: number = 3
): string[] {
  const patterns = getNavigationPatterns()

  // กรอง patterns ที่เริ่มจาก current path
  const relevantPatterns = patterns
    .filter((p) => p.from === currentPath)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  return relevantPatterns.map((p) => p.to)
}
