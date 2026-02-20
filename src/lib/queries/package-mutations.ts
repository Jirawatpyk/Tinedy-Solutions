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

/** Insert pricing tiers for a package. */
export async function insertPackageTiers(
  packageId: string,
  tiers: TierFormData[]
): Promise<void> {
  const tierData = tiers.map((tier) => ({ package_id: packageId, ...tier }))
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
