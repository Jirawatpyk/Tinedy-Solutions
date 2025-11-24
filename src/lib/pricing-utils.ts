/**
 * Pricing Utilities for Service Package V2 - Tiered Pricing System
 *
 * This module provides helper functions for calculating prices, staff requirements,
 * and managing tiered pricing for service packages.
 *
 * @module lib/pricing-utils
 */

import { supabase } from './supabase'
import type {
  ServicePackageV2,
  PackagePricingTier,
  BookingFrequency,
  PricingCalculationResult,
  ServicePackageV2WithTiers
} from '@/types/service-package-v2'

// ============================================================================
// PRICE CALCULATION
// ============================================================================

/**
 * Calculate package price based on area and frequency
 *
 * Calls the PostgreSQL function `get_package_price` which:
 * 1. Finds the appropriate pricing tier for the given area
 * 2. Returns the price for the specified frequency
 * 3. Returns 0 if no matching tier found
 *
 * @param packageId - Package UUID
 * @param areaSqm - Area in square meters
 * @param frequency - Booking frequency (1, 2, 4, or 8)
 * @returns Calculated price in Thai Baht, or 0 if not found
 *
 * @example
 * ```typescript
 * const price = await calculatePackagePrice(
 *   'package-uuid',
 *   150,  // 150 ตร.ม.
 *   4     // แพ็ก 4 ครั้ง
 * )
 * // Returns: 14900
 * ```
 */
export async function calculatePackagePrice(
  packageId: string,
  areaSqm: number,
  frequency: BookingFrequency
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_package_price', {
      p_package_id: packageId,
      p_area_sqm: areaSqm,
      p_frequency: frequency
    })

    if (error) {
      console.error('Error calculating package price:', error)
      throw new Error(`Failed to calculate price: ${error.message}`)
    }

    return data ?? 0
  } catch (err) {
    console.error('Unexpected error in calculatePackagePrice:', err)
    return 0
  }
}

/**
 * Get required staff count based on area
 *
 * Calls the PostgreSQL function `get_required_staff` which:
 * 1. Finds the appropriate pricing tier for the given area
 * 2. Returns the required staff count
 * 3. Returns 1 (minimum) if no matching tier found
 *
 * @param packageId - Package UUID
 * @param areaSqm - Area in square meters
 * @returns Required number of staff members
 *
 * @example
 * ```typescript
 * const staff = await getRequiredStaff('package-uuid', 250)
 * // Returns: 5 (for large area)
 * ```
 */
export async function getRequiredStaff(
  packageId: string,
  areaSqm: number
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_required_staff', {
      p_package_id: packageId,
      p_area_sqm: areaSqm
    })

    if (error) {
      console.error('Error getting required staff:', error)
      throw new Error(`Failed to get required staff: ${error.message}`)
    }

    return data ?? 1
  } catch (err) {
    console.error('Unexpected error in getRequiredStaff:', err)
    return 1
  }
}

/**
 * Get complete pricing calculation including price, staff, and matched tier
 *
 * Combines price calculation and tier lookup into a single result.
 *
 * @param packageId - Package UUID
 * @param areaSqm - Area in square meters
 * @param frequency - Booking frequency
 * @returns Complete pricing calculation result
 *
 * @example
 * ```typescript
 * const result = await calculatePricing('package-uuid', 150, 4)
 * // Returns: {
 * //   price: 14900,
 * //   required_staff: 4,
 * //   estimated_hours: 3,
 * //   tier: { area_min: 101, area_max: 200, ... },
 * //   found: true
 * // }
 * ```
 */
export async function calculatePricing(
  packageId: string,
  areaSqm: number,
  frequency: BookingFrequency
): Promise<PricingCalculationResult> {
  try {
    // Get price and tier in parallel
    const [price, tier] = await Promise.all([
      calculatePackagePrice(packageId, areaSqm, frequency),
      getPricingTierForArea(packageId, areaSqm)
    ])

    if (!tier) {
      return {
        price: 0,
        required_staff: 1,
        estimated_hours: null,
        tier: null,
        found: false
      }
    }

    return {
      price,
      required_staff: tier.required_staff,
      estimated_hours: tier.estimated_hours,
      tier,
      found: true
    }
  } catch (err) {
    console.error('Error in calculatePricing:', err)
    return {
      price: 0,
      required_staff: 1,
      estimated_hours: null,
      tier: null,
      found: false
    }
  }
}

// ============================================================================
// TIER MANAGEMENT
// ============================================================================

/**
 * Get pricing tier that matches the given area
 *
 * Finds the tier where area_min <= areaSqm <= area_max
 *
 * @param packageId - Package UUID
 * @param areaSqm - Area in square meters
 * @returns Matching pricing tier or null if not found
 *
 * @example
 * ```typescript
 * const tier = await getPricingTierForArea('package-uuid', 150)
 * // Returns: { area_min: 101, area_max: 200, price_1_time: 3900, ... }
 * ```
 */
export async function getPricingTierForArea(
  packageId: string,
  areaSqm: number
): Promise<PackagePricingTier | null> {
  try {
    const { data, error } = await supabase
      .from('package_pricing_tiers')
      .select('*')
      .eq('package_id', packageId)
      .lte('area_min', areaSqm)
      .gte('area_max', areaSqm)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No matching tier found
        return null
      }
      console.error('Error getting pricing tier:', error)
      throw new Error(`Failed to get pricing tier: ${error.message}`)
    }

    return data
  } catch (err) {
    console.error('Unexpected error in getPricingTierForArea:', err)
    return null
  }
}

/**
 * Get all pricing tiers for a package
 *
 * Returns tiers ordered by area_min ascending.
 *
 * @param packageId - Package UUID
 * @returns Array of pricing tiers
 *
 * @example
 * ```typescript
 * const tiers = await getPackageTiers('package-uuid')
 * // Returns: [
 * //   { area_min: 0, area_max: 100, ... },
 * //   { area_min: 101, area_max: 200, ... },
 * //   { area_min: 201, area_max: 300, ... }
 * // ]
 * ```
 */
export async function getPackageTiers(
  packageId: string
): Promise<PackagePricingTier[]> {
  try {
    const { data, error } = await supabase
      .from('package_pricing_tiers')
      .select('*')
      .eq('package_id', packageId)
      .order('area_min', { ascending: true })

    if (error) {
      console.error('Error getting package tiers:', error)
      throw new Error(`Failed to get package tiers: ${error.message}`)
    }

    return data ?? []
  } catch (err) {
    console.error('Unexpected error in getPackageTiers:', err)
    return []
  }
}

/**
 * Get package with all its pricing tiers
 *
 * Fetches package and tiers in a single query using join.
 *
 * @param packageId - Package UUID
 * @returns Package with tiers or null if not found
 *
 * @example
 * ```typescript
 * const pkg = await getPackageWithTiers('package-uuid')
 * // Returns: {
 * //   id: 'uuid',
 * //   name: 'Deep Cleaning Office',
 * //   pricing_model: 'tiered',
 * //   tiers: [tier1, tier2, tier3],
 * //   tier_count: 3,
 * //   min_price: 1950,
 * //   max_price: 35000
 * // }
 * ```
 */
export async function getPackageWithTiers(
  packageId: string
): Promise<ServicePackageV2WithTiers | null> {
  try {
    // Fetch package
    const { data: pkg, error: pkgError } = await supabase
      .from('service_packages_v2')
      .select('*')
      .eq('id', packageId)
      .single()

    if (pkgError) {
      console.error('Error getting package:', pkgError)
      throw new Error(`Failed to get package: ${pkgError.message}`)
    }

    if (!pkg) {
      return null
    }

    // Fetch tiers
    const tiers = await getPackageTiers(packageId)

    // Calculate min/max prices from tiers
    const prices = tiers.flatMap(tier => [
      tier.price_1_time,
      tier.price_2_times,
      tier.price_4_times,
      tier.price_8_times
    ].filter((p): p is number => p !== null))

    const min_price = prices.length > 0 ? Math.min(...prices) : undefined
    const max_price = prices.length > 0 ? Math.max(...prices) : undefined

    return {
      ...pkg,
      tiers,
      tier_count: tiers.length,
      min_price,
      max_price
    }
  } catch (err) {
    console.error('Unexpected error in getPackageWithTiers:', err)
    return null
  }
}

// ============================================================================
// PACKAGE QUERIES
// ============================================================================

/**
 * Get all active service packages V2
 *
 * @param serviceType - Optional filter by service type ('cleaning' or 'training')
 * @returns Array of active packages
 *
 * @example
 * ```typescript
 * const cleaningPackages = await getActivePackagesV2('cleaning')
 * ```
 */
export async function getActivePackagesV2(
  serviceType?: 'cleaning' | 'training'
): Promise<ServicePackageV2[]> {
  try {
    let query = supabase
      .from('service_packages_v2')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (serviceType) {
      query = query.eq('service_type', serviceType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting active packages:', error)
      throw new Error(`Failed to get active packages: ${error.message}`)
    }

    return data ?? []
  } catch (err) {
    console.error('Unexpected error in getActivePackagesV2:', err)
    return []
  }
}

/**
 * Get all packages with their tier counts and price ranges
 *
 * Uses the `service_packages_overview` view for optimized queries.
 *
 * @param serviceType - Optional filter by service type
 * @returns Array of packages with tier summaries
 *
 * @example
 * ```typescript
 * const overview = await getPackagesOverview('cleaning')
 * // Returns: [
 * //   {
 * //     id: 'uuid',
 * //     name: 'Deep Cleaning Office',
 * //     tier_count: 3,
 * //     min_price: 1950,
 * //     max_price: 35000
 * //   }
 * // ]
 * ```
 */
export async function getPackagesOverview(
  serviceType?: 'cleaning' | 'training'
): Promise<Array<ServicePackageV2WithTiers>> {
  try {
    let query = supabase
      .from('service_packages_overview')
      .select('*')
      .order('display_order', { ascending: true })

    if (serviceType) {
      query = query.eq('service_type', serviceType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting packages overview:', error)
      throw new Error(`Failed to get packages overview: ${error.message}`)
    }

    return data ?? []
  } catch (err) {
    console.error('Unexpected error in getPackagesOverview:', err)
    return []
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate area is within available tier ranges
 *
 * Checks if there's a tier that covers the given area.
 *
 * @param packageId - Package UUID
 * @param areaSqm - Area to validate
 * @returns True if area is covered by a tier
 *
 * @example
 * ```typescript
 * const isValid = await validateArea('package-uuid', 150)
 * // Returns: true (if tier 101-200 exists)
 *
 * const isValid2 = await validateArea('package-uuid', 500)
 * // Returns: false (if no tier covers 500)
 * ```
 */
export async function validateArea(
  packageId: string,
  areaSqm: number
): Promise<boolean> {
  const tier = await getPricingTierForArea(packageId, areaSqm)
  return tier !== null
}

/**
 * Get available frequency options for a tier
 *
 * Returns which frequency options (1, 2, 4, 8) have prices defined.
 *
 * @param tier - Pricing tier
 * @returns Array of available frequencies
 *
 * @example
 * ```typescript
 * const tier = await getPricingTierForArea('pkg-id', 100)
 * const frequencies = getAvailableFrequencies(tier)
 * // Returns: [1, 2, 4, 8] (if all prices are defined)
 * // Returns: [1, 4] (if only price_1_time and price_4_times are set)
 * ```
 */
export function getAvailableFrequencies(
  tier: PackagePricingTier
): BookingFrequency[] {
  const frequencies: BookingFrequency[] = []

  if (tier.price_1_time) frequencies.push(1)
  if (tier.price_2_times !== null) frequencies.push(2)
  if (tier.price_4_times !== null) frequencies.push(4)
  if (tier.price_8_times !== null) frequencies.push(8)

  return frequencies
}

/**
 * Get price for specific frequency from tier
 *
 * Helper to extract the correct price field based on frequency.
 *
 * @param tier - Pricing tier
 * @param frequency - Booking frequency
 * @returns Price for that frequency or null if not defined
 *
 * @example
 * ```typescript
 * const tier = { price_1_time: 1950, price_4_times: 7400, ... }
 * const price = getPriceForFrequency(tier, 4)
 * // Returns: 7400
 * ```
 */
export function getPriceForFrequency(
  tier: PackagePricingTier,
  frequency: BookingFrequency
): number | null {
  switch (frequency) {
    case 1:
      return tier.price_1_time
    case 2:
      return tier.price_2_times
    case 4:
      return tier.price_4_times
    case 8:
      return tier.price_8_times
    default:
      return null
  }
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format price in Thai Baht
 *
 * @param price - Price in THB (or null/undefined)
 * @returns Formatted price string
 *
 * @example
 * ```typescript
 * formatPrice(14900)  // "14,900 ฿"
 * formatPrice(1950)   // "1,950 ฿"
 * formatPrice(null)   // "-"
 * ```
 */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '-'
  return `${price.toLocaleString('th-TH')} ฿`
}

/**
 * Format area in Thai
 *
 * @param areaSqm - Area in square meters
 * @returns Formatted area string
 *
 * @example
 * ```typescript
 * formatArea(150)  // "150 sqm"
 * ```
 */
export function formatArea(areaSqm: number): string {
  return `${areaSqm} sqm`
}

/**
 * Format staff count in Thai
 *
 * @param count - Number of staff
 * @returns Formatted staff string
 *
 * @example
 * ```typescript
 * formatStaffCount(4)  // "4 คน"
 * ```
 */
export function formatStaffCount(count: number): string {
  return `${count} คน`
}
