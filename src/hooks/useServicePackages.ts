/**
 * useServicePackages Hook
 *
 * Hook สำหรับโหลด Service Packages ทั้ง V1 และ V2
 * รวม packages เข้าด้วยกัน และ normalize field names
 *
 * Features:
 * - โหลด V1 packages (service_packages table)
 * - โหลด V2 packages (service_packages_v2 table)
 * - รวม packages เป็น array เดียว
 * - Normalize field names (price -> base_price)
 * - Auto-refresh เมื่อ mount
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ServicePackage } from '@/types'

interface ServicePackageV2 {
  id: string
  name: string
  description: string | null
  service_type: 'cleaning' | 'training'
  pricing_model: 'fixed' | 'tiered'
  base_price: number | null
  category: string | null
  duration_minutes: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Unified package type (รวม V1 + V2)
 */
export interface UnifiedServicePackage {
  id: string
  name: string
  description: string | null
  service_type: 'cleaning' | 'training'
  pricing_model: 'fixed' | 'tiered'
  base_price: number | null
  duration_minutes: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  // V2-specific fields
  category?: string | null
  // Original type marker
  _source: 'v1' | 'v2'
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
 * Hook สำหรับโหลด Service Packages ทั้ง V1 และ V2
 */
export function useServicePackages(): UseServicePackagesReturn {
  const [packagesV1, setPackagesV1] = useState<ServicePackage[]>([])
  const [packagesV2, setPackagesV2] = useState<ServicePackageV2[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch packages from both tables
   */
  const fetchPackages = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch V1 packages
      const { data: dataV1, error: errorV1 } = await supabase
        .from('service_packages')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (errorV1) throw new Error(`V1 Error: ${errorV1.message}`)

      // Fetch V2 packages
      const { data: dataV2, error: errorV2 } = await supabase
        .from('service_packages_v2')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (errorV2) throw new Error(`V2 Error: ${errorV2.message}`)

      setPackagesV1(dataV1 || [])
      setPackagesV2(dataV2 || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch packages'
      setError(message)
      console.error('Error fetching service packages:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-fetch on mount
  useEffect(() => {
    fetchPackages()
  }, [fetchPackages])

  /**
   * Normalize V1 package to unified format
   */
  const normalizeV1Package = (pkg: ServicePackage): UnifiedServicePackage => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    service_type: pkg.service_type,
    pricing_model: 'fixed',
    base_price: pkg.price, // V1 uses 'price' field
    duration_minutes: pkg.duration_minutes,
    is_active: pkg.is_active,
    created_at: pkg.created_at,
    updated_at: pkg.created_at, // V1 ไม่มี updated_at ใช้ created_at แทน
    _source: 'v1',
  })

  /**
   * Normalize V2 package to unified format
   */
  const normalizeV2Package = (pkg: ServicePackageV2): UnifiedServicePackage => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    service_type: pkg.service_type,
    pricing_model: pkg.pricing_model,
    base_price: pkg.base_price,
    duration_minutes: pkg.duration_minutes,
    is_active: pkg.is_active,
    created_at: pkg.created_at,
    updated_at: pkg.updated_at,
    category: pkg.category,
    _source: 'v2',
  })

  /**
   * รวม V1 + V2 packages เป็น array เดียว
   */
  const packages: UnifiedServicePackage[] = [
    ...packagesV1.map(normalizeV1Package),
    ...packagesV2.map(normalizeV2Package),
  ]

  return {
    packages,
    packagesV1,
    packagesV2,
    loading,
    error,
    refresh: fetchPackages,
  }
}
