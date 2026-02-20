import { supabase } from '@/lib/supabase'
import type { TierFormData } from '@/components/service-packages/TierEditor'

export interface PackageV2CreateData {
  name: string
  description: string | null
  service_type: string
  category: string | null
  pricing_model: string
  duration_minutes: number | null
  base_price: number | null
  is_active: boolean
}

/** Create a new V2 package. Returns the new package ID. */
export async function createPackageV2(data: PackageV2CreateData): Promise<string> {
  const { data: newPackage, error } = await supabase
    .from('service_packages_v2')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  if (!newPackage) throw new Error('No data returned')

  return newPackage.id
}

/**
 * Map TierFormData to DB insert row.
 * Writes frequency_prices JSONB + also populates legacy price columns
 * (price_1_time etc.) for backward compat with the get_package_price DB function.
 */
function buildTierRow(tier: TierFormData, packageId: string) {
  const find = (times: number) =>
    tier.frequency_prices.find((fp) => fp.times === times)?.price ?? null

  return {
    package_id: packageId,
    area_min: tier.area_min,
    area_max: tier.area_max,
    required_staff: tier.required_staff,
    estimated_hours: tier.estimated_hours,
    frequency_prices: tier.frequency_prices,
    // Legacy columns — kept for DB function backward compat
    price_1_time: find(1) ?? 0,
    price_2_times: find(2),
    price_4_times: find(4),
    price_8_times: find(8),
  }
}

/** Insert pricing tiers for a package. */
export async function insertPackageTiers(
  packageId: string,
  tiers: TierFormData[]
): Promise<void> {
  const tierData = tiers.map((tier) => buildTierRow(tier, packageId))
  const { error } = await supabase.from('package_pricing_tiers').insert(tierData)
  if (error) throw error
}

/** Replace all tiers for an existing package (delete + re-insert). */
export async function updatePackageTiers(
  packageId: string,
  tiers: TierFormData[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('package_pricing_tiers')
    .delete()
    .eq('package_id', packageId)

  if (deleteError) throw deleteError

  await insertPackageTiers(packageId, tiers)
}
