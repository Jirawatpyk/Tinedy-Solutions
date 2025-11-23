/**
 * Service Package API Schemas (Phase 7)
 *
 * Zod schemas for validating service package API requests and responses.
 * Covers both V1 (simple packages) and V2 (packages with pricing tiers).
 */

import { z } from 'zod'

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const PackageStatusEnum = z.enum(['active', 'inactive', 'archived'])

export const PackageCategoryEnum = z.enum([
  'massage',
  'facial',
  'body_treatment',
  'spa',
  'wellness',
  'beauty',
  'other',
])

// ============================================================================
// V1 PACKAGE SCHEMAS (Simple Packages)
// ============================================================================

/**
 * V1 Package response schema
 */
export const PackageV1ResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number().min(0, 'Price must be non-negative'),
  duration_minutes: z.number().int().min(1, 'Duration must be at least 1 minute'),
  category: PackageCategoryEnum.nullable(),
  status: PackageStatusEnum,
  image_url: z.string().nullable(),

  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
})

// ============================================================================
// V2 PACKAGE SCHEMAS (Packages with Pricing Tiers)
// ============================================================================

/**
 * Pricing tier schema
 */
export const PricingTierSchema = z.object({
  id: z.string().uuid(),
  package_v2_id: z.string().uuid(),
  tier_name: z.string()
    .min(1, 'Tier name is required')
    .max(100, 'Tier name must be less than 100 characters'),
  price: z.number().min(0, 'Price must be non-negative'),
  duration_minutes: z.number().int().min(1, 'Duration must be at least 1 minute'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable(),
  sort_order: z.number().int().min(0, 'Sort order must be non-negative'),

  created_at: z.string(),
  updated_at: z.string(),
})

/**
 * Schema for creating a pricing tier
 */
export const PricingTierCreateRequestSchema = z.object({
  tier_name: z.string()
    .min(1, 'Tier name is required')
    .max(100, 'Tier name must be less than 100 characters')
    .trim(),

  price: z.number()
    .min(0, 'Price must be non-negative')
    .max(1000000, 'Price seems unreasonably high'),

  duration_minutes: z.number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 minute')
    .max(1440, 'Duration must be less than 24 hours'),

  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable(),

  sort_order: z.number()
    .int('Sort order must be an integer')
    .min(0, 'Sort order must be non-negative')
    .default(0),
})

/**
 * Schema for updating a pricing tier
 */
export const PricingTierUpdateRequestSchema = PricingTierCreateRequestSchema.partial()

/**
 * V2 Package base response schema
 */
export const PackageV2BaseResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  base_duration_minutes: z.number().int().min(1),
  category: PackageCategoryEnum.nullable(),
  status: PackageStatusEnum,
  image_url: z.string().nullable(),

  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
})

/**
 * V2 Package with pricing tiers response schema
 */
export const PackageV2ResponseSchema = PackageV2BaseResponseSchema.extend({
  pricing_tiers: z.array(PricingTierSchema),
})

/**
 * Schema for creating a V2 package with tiers
 */
export const PackageV2CreateRequestSchema = z.object({
  name: z.string()
    .min(2, 'Package name must be at least 2 characters')
    .max(200, 'Package name must be less than 200 characters')
    .trim(),

  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .nullable(),

  base_duration_minutes: z.number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 minute')
    .max(1440, 'Duration must be less than 24 hours'),

  category: PackageCategoryEnum.nullable(),

  status: PackageStatusEnum.default('active'),

  image_url: z.string()
    .url('Invalid image URL')
    .nullable(),

  // Pricing tiers (at least one tier required)
  pricing_tiers: z.array(PricingTierCreateRequestSchema)
    .min(1, 'At least one pricing tier is required')
    .max(10, 'Maximum 10 pricing tiers allowed'),
}).refine(
  (data) => {
    // Ensure tier names are unique
    const tierNames = data.pricing_tiers.map(t => t.tier_name.toLowerCase())
    return tierNames.length === new Set(tierNames).size
  },
  {
    message: 'Tier names must be unique',
    path: ['pricing_tiers'],
  }
).refine(
  (data) => {
    // Ensure sort orders are unique
    const sortOrders = data.pricing_tiers.map(t => t.sort_order)
    return sortOrders.length === new Set(sortOrders).size
  },
  {
    message: 'Sort orders must be unique',
    path: ['pricing_tiers'],
  }
)

/**
 * Schema for updating a V2 package (without tiers)
 */
export const PackageV2UpdateRequestSchema = z.object({
  name: z.string()
    .min(2, 'Package name must be at least 2 characters')
    .max(200, 'Package name must be less than 200 characters')
    .trim()
    .optional(),

  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .nullable()
    .optional(),

  base_duration_minutes: z.number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 minute')
    .max(1440, 'Duration must be less than 24 hours')
    .optional(),

  category: PackageCategoryEnum.nullable().optional(),

  status: PackageStatusEnum.optional(),

  image_url: z.string()
    .url('Invalid image URL')
    .nullable()
    .optional(),
})

// ============================================================================
// UNIFIED PACKAGE RESPONSE (V1 + V2 Combined)
// ============================================================================

/**
 * Unified package response that supports both V1 and V2
 */
export const UnifiedPackageResponseSchema = z.discriminatedUnion('version', [
  z.object({
    version: z.literal('v1'),
    data: PackageV1ResponseSchema,
  }),
  z.object({
    version: z.literal('v2'),
    data: PackageV2ResponseSchema,
  }),
])

/**
 * Package list item (minimal info for dropdowns)
 */
export const PackageListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: PackageCategoryEnum.nullable(),
  status: PackageStatusEnum,
  version: z.enum(['v1', 'v2']),

  // V1 fields
  price: z.number().nullable(),
  duration_minutes: z.number().nullable(),

  // V2 fields
  base_duration_minutes: z.number().nullable(),
  tier_count: z.number().nullable(),
  price_range: z.object({
    min: z.number(),
    max: z.number(),
  }).nullable(),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// V1 Types
export type PackageV1Response = z.infer<typeof PackageV1ResponseSchema>

// V2 Types
export type PackageV2Response = z.infer<typeof PackageV2ResponseSchema>
export type PackageV2BaseResponse = z.infer<typeof PackageV2BaseResponseSchema>
export type PackageV2CreateRequest = z.infer<typeof PackageV2CreateRequestSchema>
export type PackageV2UpdateRequest = z.infer<typeof PackageV2UpdateRequestSchema>

// Pricing Tier Types
export type PricingTier = z.infer<typeof PricingTierSchema>
export type PricingTierCreateRequest = z.infer<typeof PricingTierCreateRequestSchema>
export type PricingTierUpdateRequest = z.infer<typeof PricingTierUpdateRequestSchema>

// Unified Types
export type UnifiedPackageResponse = z.infer<typeof UnifiedPackageResponseSchema>
export type PackageListItem = z.infer<typeof PackageListItemSchema>

// Enum Types
export type PackageStatus = z.infer<typeof PackageStatusEnum>
export type PackageCategory = z.infer<typeof PackageCategoryEnum>
