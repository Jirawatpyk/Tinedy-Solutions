/**
 * useServicePackages Hook
 *
 * Hook สำหรับโหลด Service Packages ทั้ง V1 และ V2 ด้วย React Query
 * รวม packages เข้าด้วยกัน และ normalize field names
 *
 * Features:
 * - ใช้ React Query สำหรับ caching และ data fetching
 * - Cache อัตโนมัติ 30 นาที
 * - แชร์ cache ข้ามหน้าต่างๆ
 * - โหลด V1 packages (service_packages table)
 * - โหลด V2 packages (service_packages_v2 table)
 * - รวม packages เป็น array เดียว
 * - Normalize field names (price -> base_price)
 * - Realtime subscription สำหรับ auto-update
 */

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import {
  packageQueryOptions,
  type ServicePackageV2,
  type UnifiedServicePackage,
} from '@/lib/queries/package-queries'
import type { ServicePackage } from '@/types'

interface UseServicePackagesOptions {
  /** Enable realtime subscription หรือไม่ (default: true) */
  enableRealtime?: boolean
}

interface UseServicePackagesReturn {
  /** รวม V1 + V2 packages ทั้งหมด */
  packages: UnifiedServicePackage[]
  /** V1 packages เท่านั้น (backward compatibility) */
  packagesV1: ServicePackage[]
  /** V2 packages เท่านั้น */
  packagesV2: ServicePackageV2[]
  /** กำลังโหลดหรือไม่ */
  loading: boolean
  /** Error message (ถ้ามี) */
  error: string | null
  /** Refresh packages manually */
  refresh: () => Promise<void>
}

/**
 * Hook สำหรับโหลด Service Packages ทั้ง V1 และ V2 ด้วย React Query
 *
 * @example
 * ```tsx
 * const { packages, loading, error, refresh } = useServicePackages({ enableRealtime: true })
 *
 * if (loading) return <div>Loading...</div>
 * if (error) return <div>Error: {error}</div>
 *
 * return (
 *   <div>
 *     {packages.map(pkg => (
 *       <div key={pkg.id}>{pkg.name}</div>
 *     ))}
 *     <button onClick={refresh}>Refresh</button>
 *   </div>
 * )
 * ```
 */
export function useServicePackages(
  options: UseServicePackagesOptions = {}
): UseServicePackagesReturn {
  const { enableRealtime = true } = options
  const queryClient = useQueryClient()

  // Fetch V1 packages
  const {
    data: packagesV1 = [],
    isLoading: loadingV1,
    error: errorV1,
    refetch: refetchV1,
  } = useQuery({
    ...packageQueryOptions.v1,
  })

  // Fetch V2 packages
  const {
    data: packagesV2 = [],
    isLoading: loadingV2,
    error: errorV2,
    refetch: refetchV2,
  } = useQuery({
    ...packageQueryOptions.v2,
  })

  // Fetch unified packages (V1 + V2 combined)
  const {
    data: packages = [],
    isLoading: loadingUnified,
    error: errorUnified,
    refetch: refetchUnified,
  } = useQuery({
    ...packageQueryOptions.unified,
  })

  // Realtime subscription - invalidate queries when packages change
  useEffect(() => {
    if (!enableRealtime) return

    // Subscribe to service_packages_v2 changes
    const packagesV2Channel = supabase
      .channel('packages-v2-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_packages_v2',
        },
        () => {
          // Invalidate all package-related queries
          queryClient.invalidateQueries({ queryKey: queryKeys.packages.all })
        }
      )
      .subscribe()

    // Subscribe to package_pricing_tiers changes (for tiered pricing)
    const tiersChannel = supabase
      .channel('package-tiers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'package_pricing_tiers',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.packages.all })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(packagesV2Channel)
      supabase.removeChannel(tiersChannel)
    }
  }, [queryClient, enableRealtime])

  // Combined loading state
  const loading = loadingV1 || loadingV2 || loadingUnified

  // Combined error state
  const error =
    errorV1?.message || errorV2?.message || errorUnified?.message || null

  // Refresh function - refetch ทั้งหมด
  const refresh = async () => {
    await Promise.all([refetchV1(), refetchV2(), refetchUnified()])
  }

  return {
    packages,
    packagesV1,
    packagesV2,
    loading,
    error,
    refresh,
  }
}

// Re-export types for convenience
export type { ServicePackageV2, UnifiedServicePackage } from '@/lib/queries/package-queries'
