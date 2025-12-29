/**
 * Package Query Functions
 *
 * React Query functions สำหรับ Service Packages
 * รองรับทั้ง V1 และ V2 packages
 *
 * Features:
 * - Automatic caching (30 minutes stale time)
 * - Shared cache across components
 * - Type-safe query keys
 * - Error handling
 */

import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { ServicePackage } from '@/types'

/**
 * Package Pricing Tier type
 */
export interface PackagePricingTier {
  id: string
  package_id: string
  area_min: number
  area_max: number
  required_staff: number
  estimated_hours: number | null
  price_1_time: number
  price_2_times: number | null
  price_4_times: number | null
  price_8_times: number | null
  created_at: string
  updated_at: string
}

/**
 * Service Package V2 type (base)
 */
export interface ServicePackageV2 {
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
 * Service Package V2 with Tiers (extended)
 */
export interface ServicePackageV2WithTiers extends ServicePackageV2 {
  tiers: PackagePricingTier[]
  tier_count: number
  min_price?: number
  max_price?: number
  /** Soft delete timestamp */
  deleted_at?: string | null
  /** User who soft deleted this package */
  deleted_by?: string | null
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
  tiers?: PackagePricingTier[]
  tier_count?: number
  min_price?: number
  max_price?: number
  // Original type marker
  _source: 'v1' | 'v2'
}

/**
 * Fetch V1 Service Packages
 */
export async function fetchServicePackagesV1(): Promise<ServicePackage[]> {
  const { data, error } = await supabase
    .from('service_packages')
    .select('id, name, description, service_type, duration_minutes, price, is_active, created_at')
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch V1 packages: ${error.message}`)
  }

  return data || []
}

/**
 * Fetch V2 Service Packages (with tiers)
 * Excludes soft-deleted packages (deleted_at IS NULL)
 */
export async function fetchServicePackagesV2(): Promise<ServicePackageV2WithTiers[]> {
  // Fetch packages (exclude soft-deleted)
  const { data: packages, error: pkgError } = await supabase
    .from('service_packages_v2')
    .select('*')
    .is('deleted_at', null)
    .order('name')

  if (pkgError) {
    throw new Error(`Failed to fetch V2 packages: ${pkgError.message}`)
  }

  if (!packages || packages.length === 0) {
    return []
  }

  // Fetch all tiers for these packages
  const packageIds = packages.map(pkg => pkg.id)
  const { data: allTiers, error: tiersError } = await supabase
    .from('package_pricing_tiers')
    .select('*')
    .in('package_id', packageIds)
    .order('area_min', { ascending: true })

  if (tiersError) {
    console.error('Failed to fetch tiers:', tiersError.message)
    // Continue without tiers rather than failing completely
  }

  // Map packages with their tiers
  const packagesWithTiers: ServicePackageV2WithTiers[] = packages.map(pkg => {
    const pkgTiers = (allTiers || []).filter(tier => tier.package_id === pkg.id)

    // Calculate min/max prices from tiers (exclude 0 values)
    let min_price: number | undefined
    let max_price: number | undefined

    if (pkg.pricing_model === 'tiered' && pkgTiers.length > 0) {
      const prices = pkgTiers.flatMap(tier => [
        tier.price_1_time,
        tier.price_2_times,
        tier.price_4_times,
        tier.price_8_times
      ]).filter((p): p is number => p !== null && p > 0)

      if (prices.length > 0) {
        min_price = Math.min(...prices)
        max_price = Math.max(...prices)
      }
    } else if (pkg.pricing_model === 'fixed' && pkg.base_price && pkg.base_price > 0) {
      // For fixed pricing, use base_price
      min_price = pkg.base_price
      max_price = pkg.base_price
    }

    return {
      ...pkg,
      tiers: pkgTiers,
      tier_count: pkgTiers.length,
      min_price,
      max_price,
    }
  })

  return packagesWithTiers
}

/**
 * Fetch V2 Service Packages including archived (for Admin)
 */
export async function fetchServicePackagesV2WithArchived(): Promise<ServicePackageV2WithTiers[]> {
  // Fetch ALL packages (including soft-deleted)
  const { data: packages, error: pkgError } = await supabase
    .from('service_packages_v2')
    .select('*')
    .order('name')

  if (pkgError) {
    throw new Error(`Failed to fetch V2 packages: ${pkgError.message}`)
  }

  if (!packages || packages.length === 0) {
    return []
  }

  // Fetch all tiers for these packages
  const packageIds = packages.map(pkg => pkg.id)
  const { data: allTiers, error: tiersError } = await supabase
    .from('package_pricing_tiers')
    .select('*')
    .in('package_id', packageIds)
    .order('area_min', { ascending: true })

  if (tiersError) {
    console.error('Failed to fetch tiers:', tiersError.message)
  }

  // Map packages with their tiers
  const packagesWithTiers: ServicePackageV2WithTiers[] = packages.map(pkg => {
    const pkgTiers = (allTiers || []).filter(tier => tier.package_id === pkg.id)

    let min_price: number | undefined
    let max_price: number | undefined

    if (pkg.pricing_model === 'tiered' && pkgTiers.length > 0) {
      const prices = pkgTiers.flatMap(tier => [
        tier.price_1_time,
        tier.price_2_times,
        tier.price_4_times,
        tier.price_8_times
      ]).filter((p): p is number => p !== null && p > 0)

      if (prices.length > 0) {
        min_price = Math.min(...prices)
        max_price = Math.max(...prices)
      }
    } else if (pkg.pricing_model === 'fixed' && pkg.base_price && pkg.base_price > 0) {
      min_price = pkg.base_price
      max_price = pkg.base_price
    }

    return {
      ...pkg,
      tiers: pkgTiers,
      tier_count: pkgTiers.length,
      min_price,
      max_price,
    }
  })

  return packagesWithTiers
}

/**
 * Fetch Unified Service Packages (V1 + V2 รวมกัน)
 * สำหรับใช้ในการสร้าง Booking - กรองเฉพาะ active packages
 */
export async function fetchUnifiedServicePackages(): Promise<UnifiedServicePackage[]> {
  // Fetch both V1 and V2 in parallel
  const [packagesV1, packagesV2] = await Promise.all([
    fetchServicePackagesV1(),
    fetchServicePackagesV2(),
  ])

  // Normalize V1 packages (filter only active)
  const normalizedV1: UnifiedServicePackage[] = packagesV1
    .filter(pkg => pkg.is_active)
    .map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      service_type: pkg.service_type,
      pricing_model: 'fixed' as const,
      base_price: pkg.price,
      duration_minutes: pkg.duration_minutes,
      is_active: pkg.is_active,
      created_at: pkg.created_at,
      updated_at: pkg.created_at, // V1 ไม่มี updated_at
      tiers: [],
      tier_count: 0,
      min_price: pkg.price && pkg.price > 0 ? pkg.price : undefined,
      max_price: pkg.price && pkg.price > 0 ? pkg.price : undefined,
      _source: 'v1' as const,
    }))

  // Normalize V2 packages (filter only active)
  const normalizedV2: UnifiedServicePackage[] = packagesV2
    .filter(pkg => pkg.is_active)
    .map((pkg) => ({
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
      tiers: pkg.tiers,
      tier_count: pkg.tier_count,
      min_price: pkg.min_price,
      max_price: pkg.max_price,
      _source: 'v2' as const,
    }))

  // รวมกัน
  return [...normalizedV1, ...normalizedV2]
}

/**
 * Fetch All Service Packages (V1 + V2 รวมกัน) รวมทั้ง inactive
 * สำหรับใช้ในหน้า Admin จัดการ packages - แสดงทุก package
 */
export async function fetchAllServicePackagesForAdmin(): Promise<UnifiedServicePackage[]> {
  // Fetch both V1 and V2 in parallel
  const [packagesV1, packagesV2] = await Promise.all([
    fetchServicePackagesV1(),
    fetchServicePackagesV2(),
  ])

  // Normalize V1 packages (ไม่ filter - แสดงทั้ง active และ inactive)
  const normalizedV1: UnifiedServicePackage[] = packagesV1
    .map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      service_type: pkg.service_type,
      pricing_model: 'fixed' as const,
      base_price: pkg.price,
      duration_minutes: pkg.duration_minutes,
      is_active: pkg.is_active,
      created_at: pkg.created_at,
      updated_at: pkg.created_at, // V1 ไม่มี updated_at
      tiers: [],
      tier_count: 0,
      min_price: pkg.price && pkg.price > 0 ? pkg.price : undefined,
      max_price: pkg.price && pkg.price > 0 ? pkg.price : undefined,
      _source: 'v1' as const,
    }))

  // Normalize V2 packages (ไม่ filter - แสดงทั้ง active และ inactive)
  const normalizedV2: UnifiedServicePackage[] = packagesV2
    .map((pkg) => ({
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
      tiers: pkg.tiers,
      tier_count: pkg.tier_count,
      min_price: pkg.min_price,
      max_price: pkg.max_price,
      _source: 'v2' as const,
    }))

  // รวมกัน
  return [...normalizedV1, ...normalizedV2]
}

/**
 * Query Options สำหรับ Service Packages
 *
 * staleTime: 30 minutes - packages ไม่ค่อยเปลี่ยนบ่อย
 */
export const packageQueryOptions = {
  v1: {
    queryKey: queryKeys.packages.v1(),
    queryFn: fetchServicePackagesV1,
    staleTime: 30 * 60 * 1000, // 30 minutes
  },
  v2: {
    queryKey: queryKeys.packages.v2(),
    queryFn: fetchServicePackagesV2,
    staleTime: 30 * 60 * 1000, // 30 minutes
  },
  unified: {
    queryKey: queryKeys.packages.unified(),
    queryFn: fetchUnifiedServicePackages,
    staleTime: 30 * 60 * 1000, // 30 minutes
  },
  allForAdmin: {
    queryKey: [...queryKeys.packages.unified(), 'all-for-admin'],
    queryFn: fetchAllServicePackagesForAdmin,
    staleTime: 0, // Always refetch when invalidated (for admin package management)
  },
  v2WithArchived: {
    queryKey: [...queryKeys.packages.v2(), 'with-archived'],
    queryFn: fetchServicePackagesV2WithArchived,
    staleTime: 0, // Always refetch for admin
  },
}
