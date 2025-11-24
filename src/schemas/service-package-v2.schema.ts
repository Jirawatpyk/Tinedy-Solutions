import { z } from 'zod'

/**
 * Service Package V2 Schemas with Tiered Pricing Support
 *
 * Architecture:
 * - ServicePackageV2Schema: Main package schema with conditional validation
 * - PackagePricingTierSchema: Individual pricing tier for area-based pricing
 * - ServicePackageV2FormSchema: Complete form schema (package + tiers)
 *
 * Pricing Models:
 * - Fixed: Single price with duration (legacy V1 compatibility)
 * - Tiered: Multiple pricing tiers based on area ranges
 */

// ============================================================================
// ENUMS
// ============================================================================

export const ServiceTypeEnum = z.enum(['cleaning', 'training'])

export const PricingModelEnum = z.enum(['fixed', 'tiered'])

export const ServiceCategoryEnum = z.enum(['office', 'condo', 'house'])

// ============================================================================
// PRICING TIER SCHEMA
// ============================================================================

export const PackagePricingTierSchema = z.object({
  area_min: z
    .number({ message: 'Minimum area is required' })
    .int('Area must be a whole number')
    .min(0, 'Minimum area must be greater than or equal to 0'),

  area_max: z
    .number({ message: 'Maximum area is required' })
    .int('Area must be a whole number')
    .positive('Maximum area must be greater than 0'),

  required_staff: z
    .number({ message: 'Required staff count is required' })
    .int('Staff count must be a whole number')
    .min(1, 'At least 1 staff member is required'),

  estimated_hours: z
    .number()
    .positive('Estimated hours must be greater than 0')
    .nullable()
    .optional(),

  price_1_time: z
    .number({ message: '1-time price is required' })
    .min(0, '1-time price cannot be negative'),

  price_2_times: z
    .number()
    .min(0, '2-times price cannot be negative')
    .nullable()
    .optional(),

  price_4_times: z
    .number()
    .min(0, '4-times price cannot be negative')
    .nullable()
    .optional(),

  price_8_times: z
    .number()
    .min(0, '8-times price cannot be negative')
    .nullable()
    .optional(),
}).refine(
  (data) => data.area_max > data.area_min,
  {
    message: 'Maximum area must be greater than minimum area',
    path: ['area_max']
  }
)

// ============================================================================
// SERVICE PACKAGE V2 BASE SCHEMA
// ============================================================================

const ServicePackageV2BaseSchema = z.object({
  name: z
    .string({ message: 'Package name is required' })
    .trim()
    .min(1, 'Package name must not be empty')
    .max(200, 'Package name must not exceed 200 characters'),

  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
    .nullable()
    .optional(),

  service_type: ServiceTypeEnum,

  category: ServiceCategoryEnum.nullable().optional(),

  pricing_model: PricingModelEnum,

  duration_minutes: z
    .number()
    .int('Duration must be a whole number')
    .positive('Duration must be greater than 0')
    .nullable()
    .optional(),

  base_price: z
    .number()
    .min(0, 'Price cannot be negative')
    .nullable()
    .optional(),

  is_active: z.boolean(),
})

// ============================================================================
// SERVICE PACKAGE V2 SCHEMA WITH CONDITIONAL VALIDATION
// ============================================================================

export const ServicePackageV2Schema = ServicePackageV2BaseSchema
  .refine(
    (data) => {
      // If Fixed Pricing: duration_minutes and base_price are required
      if (data.pricing_model === 'fixed') {
        return data.duration_minutes !== null &&
               data.duration_minutes !== undefined &&
               data.base_price !== null &&
               data.base_price !== undefined
      }
      return true
    },
    {
      message: 'Please specify duration and price for fixed pricing packages',
      path: ['pricing_model']
    }
  )
  .refine(
    (data) => {
      // If Tiered Pricing: category is required
      if (data.pricing_model === 'tiered') {
        return data.category !== null && data.category !== undefined
      }
      return true
    },
    {
      message: 'Please specify category for tiered pricing packages',
      path: ['category']
    }
  )

// Schema สำหรับ Update (ทุกฟิลด์เป็น optional)
export const ServicePackageV2UpdateSchema = ServicePackageV2BaseSchema.partial()

// ============================================================================
// COMPLETE FORM SCHEMA (PACKAGE + TIERS)
// ============================================================================

export const ServicePackageV2FormSchema = z.object({
  package: ServicePackageV2Schema,
  tiers: z.array(PackagePricingTierSchema).optional(),
}).refine(
  (data) => {
    // If Tiered Pricing: must have at least 1 tier
    if (data.package.pricing_model === 'tiered') {
      return data.tiers && data.tiers.length > 0
    }
    return true
  },
  {
    message: 'Please add at least 1 pricing tier for tiered pricing packages',
    path: ['tiers']
  }
)

// ============================================================================
// TIER VALIDATION HELPER
// ============================================================================

/**
 * ตรวจสอบว่าช่วงพื้นที่ไม่ทับซ้อนกัน
 * @param tiers - Array of pricing tiers
 * @throws Error if any tiers overlap
 */
export const validateTiersNoOverlap = (
  tiers: z.infer<typeof PackagePricingTierSchema>[]
): boolean => {
  for (let i = 0; i < tiers.length; i++) {
    for (let j = i + 1; j < tiers.length; j++) {
      const tier1 = tiers[i]
      const tier2 = tiers[j]

      // ตรวจสอบการทับซ้อน
      // ช่วงทับซ้อนหรือติดกันถ้า: tier1 เริ่มก่อน tier2 จบ AND tier1 จบหลังหรือเท่ากับ tier2 เริ่ม
      const overlap = tier1.area_min < tier2.area_max && tier1.area_max >= tier2.area_min

      if (overlap) {
        throw new Error(
          `Price tier ${i + 1} (${tier1.area_min}-${tier1.area_max} sqm) ` +
          `overlaps with price tier ${j + 1} (${tier2.area_min}-${tier2.area_max} sqm)`
        )
      }
    }
  }
  return true
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Infer base type first to ensure clean type inference
export type ServicePackageV2BaseFormData = z.infer<typeof ServicePackageV2BaseSchema>

export type ServicePackageV2FormData = z.infer<typeof ServicePackageV2Schema>
export type PackagePricingTierFormData = z.infer<typeof PackagePricingTierSchema>
export type ServicePackageV2CompleteFormData = z.infer<typeof ServicePackageV2FormSchema>
export type ServiceType = z.infer<typeof ServiceTypeEnum>
export type PricingModel = z.infer<typeof PricingModelEnum>
export type ServiceCategory = z.infer<typeof ServiceCategoryEnum>
