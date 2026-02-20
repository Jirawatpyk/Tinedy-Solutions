/**
 * Service Package V2 Type Definitions - Tiered Pricing System
 *
 * This module contains TypeScript types for the enhanced service packages
 * with area-based tiered pricing and frequency options.
 *
 * @module types/service-package-v2
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Pricing model type enumeration
 *
 * @enum {string}
 *
 * @property {string} Fixed - Traditional fixed pricing (single price point)
 * @property {string} Tiered - Area-based tiered pricing with multiple tiers
 */
export const PricingModel = {
  Fixed: 'fixed',
  Tiered: 'tiered'
} as const

export type PricingModel = typeof PricingModel[keyof typeof PricingModel]

/**
 * Service category enumeration
 *
 * @enum {string}
 *
 * @property {string} Office - Office buildings
 * @property {string} Condo - Condominiums
 * @property {string} House - Houses
 */
export const ServiceCategory = {
  Office: 'office',
  Condo: 'condo',
  House: 'house'
} as const

export type ServiceCategory = typeof ServiceCategory[keyof typeof ServiceCategory]

/**
 * Booking frequency — any positive integer (times per month)
 * Named constants kept for backward compatibility with existing booking forms
 */
export const BookingFrequency = {
  Once: 1,
  Twice: 2,
  Weekly: 4,
  BiWeekly: 8
} as const

export type BookingFrequency = number

/**
 * One entry in the dynamic frequency_prices array stored in JSONB.
 */
export interface FrequencyPrice {
  times: number
  price: number
}

// ============================================================================
// SERVICE PACKAGE V2 TYPES
// ============================================================================

/**
 * Service Package V2 Record
 *
 * Enhanced service package with support for both fixed and tiered pricing models.
 * Replaces the old service_packages table with more flexible pricing structure.
 *
 * @interface ServicePackageV2
 *
 * @property {string} id - Package UUID
 * @property {string} name - Package name (e.g., "Deep Cleaning Office")
 * @property {string | null} description - Detailed description
 * @property {'cleaning' | 'training'} service_type - Type of service
 * @property {ServiceCategory | null} category - Service category (office/condo/house)
 * @property {PricingModel} pricing_model - Pricing model ('fixed' or 'tiered')
 * @property {number | null} duration_minutes - For fixed pricing only
 * @property {number | null} base_price - For fixed pricing only
 * @property {boolean} is_active - Whether package is available
 * @property {string} created_at - ISO 8601 timestamp
 * @property {string} updated_at - ISO 8601 timestamp
 *
 * @example
 * // Fixed pricing package (legacy support)
 * const fixedPackage: ServicePackageV2 = {
 *   id: "uuid",
 *   name: "Basic Cleaning",
 *   description: "Standard cleaning service",
 *   service_type: "cleaning",
 *   category: null,
 *   pricing_model: "fixed",
 *   duration_minutes: 120,
 *   base_price: 2500,
 *   is_active: true,
 *   created_at: "2024-01-01T00:00:00Z",
 *   updated_at: "2024-01-01T00:00:00Z"
 * }
 *
 * @example
 * // Tiered pricing package
 * const tieredPackage: ServicePackageV2 = {
 *   id: "uuid",
 *   name: "Deep Cleaning Office",
 *   description: "Office cleaning with area-based pricing",
 *   service_type: "cleaning",
 *   category: "office",
 *   pricing_model: "tiered",
 *   duration_minutes: null,
 *   base_price: null,
 *   is_active: true,
 *   created_at: "2024-01-01T00:00:00Z",
 *   updated_at: "2024-01-01T00:00:00Z"
 * }
 */
export interface ServicePackageV2 {
  id: string
  name: string
  description: string | null
  service_type: 'cleaning' | 'training'
  category: ServiceCategory | null
  pricing_model: PricingModel
  duration_minutes: number | null
  base_price: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  /** Soft delete timestamp */
  deleted_at?: string | null
  /** User who soft deleted this package */
  deleted_by?: string | null
}

// ============================================================================
// PACKAGE PRICING TIER TYPES
// ============================================================================

/**
 * Package Pricing Tier Record
 *
 * Defines a single pricing tier for a tiered package.
 * Each tier covers a range of square meters with specific pricing and staff requirements.
 *
 * @interface PackagePricingTier
 *
 * @property {string} id - Tier UUID
 * @property {string} package_id - Reference to ServicePackageV2
 * @property {number} area_min - Minimum area in square meters (inclusive)
 * @property {number} area_max - Maximum area in square meters (inclusive)
 * @property {number} required_staff - Number of staff required for this tier
 * @property {number | null} estimated_hours - Estimated duration in hours
 * @property {number} price_1_time - Price for one-time service
 * @property {number | null} price_2_times - Price for 2 times/month
 * @property {number | null} price_4_times - Price for 4 times/month (weekly)
 * @property {number | null} price_8_times - Price for 8 times/month (bi-weekly)
 * @property {string} created_at - ISO 8601 timestamp
 * @property {string} updated_at - ISO 8601 timestamp
 *
 * @example
 * const tier: PackagePricingTier = {
 *   id: "uuid",
 *   package_id: "package-uuid",
 *   area_min: 0,
 *   area_max: 100,
 *   required_staff: 4,
 *   estimated_hours: 2.5,
 *   price_1_time: 1950,
 *   price_2_times: 3900,
 *   price_4_times: 7400,
 *   price_8_times: 14000,
 *   created_at: "2024-01-01T00:00:00Z",
 *   updated_at: "2024-01-01T00:00:00Z"
 * }
 */
export interface PackagePricingTier {
  id: string
  package_id: string
  area_min: number
  area_max: number
  required_staff: number
  estimated_hours: number | null
  /** Dynamic frequency pricing — the source of truth after migration */
  frequency_prices: FrequencyPrice[]
  /** Legacy columns kept for backward compat with DB function get_package_price */
  price_1_time: number
  price_2_times: number | null
  price_4_times: number | null
  price_8_times: number | null
  created_at: string
  updated_at: string
}

// ============================================================================
// EXTENDED TYPES WITH RELATIONS
// ============================================================================

/**
 * Service Package V2 with Pricing Tiers
 *
 * Extended version including all pricing tiers for a tiered package.
 *
 * @interface ServicePackageV2WithTiers
 * @extends ServicePackageV2
 *
 * @property {PackagePricingTier[]} [tiers] - Array of pricing tiers
 * @property {number} [tier_count] - Number of tiers (for overview)
 * @property {number} [min_price] - Minimum price across all tiers
 * @property {number} [max_price] - Maximum price across all tiers
 *
 * @example
 * const packageWithTiers: ServicePackageV2WithTiers = {
 *   ...tieredPackage,
 *   tiers: [tier1, tier2, tier3],
 *   tier_count: 3,
 *   min_price: 1950,
 *   max_price: 6900
 * }
 */
export interface ServicePackageV2WithTiers extends ServicePackageV2 {
  tiers?: PackagePricingTier[]
  tier_count?: number
  min_price?: number
  max_price?: number
}

// ============================================================================
// FORM INPUT TYPES
// ============================================================================

/**
 * Service Package V2 Form Input
 *
 * Type for creating new V2 packages.
 * Omits auto-generated fields.
 *
 * @type ServicePackageV2Input
 *
 * @example
 * const input: ServicePackageV2Input = {
 *   name: "Deep Cleaning Condo",
 *   description: "Condo cleaning service",
 *   service_type: "cleaning",
 *   category: "condo",
 *   pricing_model: "tiered",
 *   duration_minutes: null,
 *   base_price: null,
 *   is_active: true
 * }
 */
export type ServicePackageV2Input = Omit<
  ServicePackageV2,
  'id' | 'created_at' | 'updated_at'
>

/**
 * Service Package V2 Update Input
 *
 * Type for partial updates.
 *
 * @type ServicePackageV2Update
 */
export type ServicePackageV2Update = Partial<ServicePackageV2Input>

/**
 * Pricing Tier Form Input
 *
 * Type for creating new pricing tiers.
 *
 * @type PricingTierInput
 *
 * @example
 * const tierInput: PricingTierInput = {
 *   package_id: "package-uuid",
 *   area_min: 101,
 *   area_max: 200,
 *   required_staff: 4,
 *   estimated_hours: 3.5,
 *   price_1_time: 3900,
 *   price_2_times: 7800,
 *   price_4_times: 14900,
 *   price_8_times: 28000
 * }
 */
export type PricingTierInput = Omit<
  PackagePricingTier,
  'id' | 'created_at' | 'updated_at'
>

/**
 * Pricing Tier Update Input
 *
 * Type for partial tier updates.
 *
 * @type PricingTierUpdate
 */
export type PricingTierUpdate = Partial<Omit<PricingTierInput, 'package_id'>>

// ============================================================================
// PRICING CALCULATION TYPES
// ============================================================================

/**
 * Pricing Calculation Request
 *
 * Input for calculating price based on area and frequency.
 *
 * @interface PricingCalculationRequest
 *
 * @property {string} package_id - Package UUID
 * @property {number} area_sqm - Area in square meters
 * @property {BookingFrequency} frequency - Booking frequency (any positive integer, e.g. 1, 2, 3, 4)
 *
 * @example
 * const request: PricingCalculationRequest = {
 *   package_id: "package-uuid",
 *   area_sqm: 150,
 *   frequency: 4
 * }
 */
export interface PricingCalculationRequest {
  package_id: string
  area_sqm: number
  frequency: BookingFrequency
}

/**
 * Pricing Calculation Result
 *
 * Result of price calculation including staff requirements.
 *
 * @interface PricingCalculationResult
 *
 * @property {number} price - Calculated price in Thai Baht
 * @property {number} required_staff - Number of staff required
 * @property {number | null} estimated_hours - Estimated duration in hours from tier
 * @property {PackagePricingTier | null} tier - Matched pricing tier (if found)
 * @property {boolean} found - Whether a matching tier was found
 *
 * @example
 * const result: PricingCalculationResult = {
 *   price: 14900,
 *   required_staff: 4,
 *   estimated_hours: 3,
 *   tier: matchedTier,
 *   found: true
 * }
 */
export interface PricingCalculationResult {
  price: number
  required_staff: number
  estimated_hours: number | null
  tier: PackagePricingTier | null
  found: boolean
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Type guard to check if package uses tiered pricing
 *
 * @param package - Service package to check
 * @returns True if package uses tiered pricing
 *
 * @example
 * if (isTieredPackage(package)) {
 *   // Handle tiered pricing logic
 *   const price = await calculatePrice(package.id, area, frequency)
 * }
 */
export function isTieredPackage(
  pkg: ServicePackageV2
): boolean {
  return pkg.pricing_model === PricingModel.Tiered
}

/**
 * Type guard to check if package uses fixed pricing
 *
 * @param package - Service package to check
 * @returns True if package uses fixed pricing
 *
 * @example
 * if (isFixedPackage(package)) {
 *   // Use base_price directly
 *   const price = package.base_price
 * }
 */
export function isFixedPackage(
  pkg: ServicePackageV2
): boolean {
  return pkg.pricing_model === PricingModel.Fixed
}

/**
 * Format area range for display
 *
 * @param tier - Pricing tier
 * @returns Formatted area range string
 *
 * @example
 * formatAreaRange(tier) // "0-100 sqm"
 * formatAreaRange(tier2) // "101-200 sqm"
 */
export function formatAreaRange(tier: PackagePricingTier): string {
  return `${tier.area_min}-${tier.area_max} sqm`
}

/**
 * Get frequency label in Thai
 *
 * @param frequency - Booking frequency
 * @returns Thai label for frequency
 *
 * @example
 * getFrequencyLabel(1) // "1 ครั้ง"
 * getFrequencyLabel(4) // "แพ็ก 4 ครั้ง"
 */
export function getFrequencyLabel(frequency: BookingFrequency): string {
  switch (frequency) {
    case 1:
      return '1 time'
    case 2:
      return '2 times'
    case 4:
      return '4 times'
    case 8:
      return '8 times'
    default:
      return `${frequency} times`
  }
}
