/**
 * PackageFormV2 Component - Service Package V2 Form with Tiered Pricing
 *
 * ฟอร์มสำหรับสร้างและแก้ไข Service Package V2 (Tiered Pricing)
 *
 * Features:
 * - รองรับทั้ง Fixed และ Tiered pricing
 * - จัดการ Pricing Tiers ผ่าน TierEditor
 * - Validation
 * - Create/Update modes
 */

import { useState, useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { TierEditor, type TierFormData } from './TierEditor'
import { Save, X } from 'lucide-react'
import {
  PricingModel,
  ServiceCategory,
  type ServicePackageV2,
} from '@/types'
import {
  ServicePackageV2FormSchema,
  type ServicePackageV2CompleteFormData,
  validateTiersNoOverlap,
} from '@/schemas'

interface PackageFormV2Props {
  /** Package to edit (null for create mode) */
  package?: ServicePackageV2 | null
  /** Callback when save is successful */
  onSuccess?: (packageId: string) => void
  /** Callback when cancel */
  onCancel?: () => void
  /** Show cancel button */
  showCancel?: boolean
}

/**
 * PackageFormV2 Component
 */
export function PackageFormV2({
  package: editPackage,
  onSuccess,
  onCancel,
  showCancel = true,
}: PackageFormV2Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingTiers, setLoadingTiers] = useState(false)

  // Tiers state (for tiered pricing)
  const [tiers, setTiers] = useState<TierFormData[]>([])

  // React Hook Form with Zod validation
  const form = useForm<ServicePackageV2CompleteFormData>({
    resolver: zodResolver(ServicePackageV2FormSchema),
    mode: 'onSubmit', // Validate only on submit, not on mount
    defaultValues: {
      package: {
        name: '',
        description: null,
        service_type: 'cleaning',
        category: ServiceCategory.Office,
        pricing_model: PricingModel.Tiered,
        duration_minutes: null,
        base_price: null,
        is_active: true,
      },
      tiers: [],
    },
  })

  /**
   * Load pricing tiers for package
   */
  const loadTiers = useCallback(async (packageId: string) => {
    setLoadingTiers(true)
    try {
      const { data, error } = await supabase
        .from('package_pricing_tiers')
        .select('*')
        .eq('package_id', packageId)
        .order('area_min', { ascending: true })

      if (error) throw error

      // Convert to TierFormData (remove timestamps and id)
      const tierData: TierFormData[] = (data || []).map((tier) => ({
        area_min: tier.area_min,
        area_max: tier.area_max,
        required_staff: tier.required_staff,
        estimated_hours: tier.estimated_hours,
        price_1_time: tier.price_1_time,
        price_2_times: tier.price_2_times,
        price_4_times: tier.price_4_times,
        price_8_times: tier.price_8_times,
      }))

      setTiers(tierData)
      return tierData
    } catch (error) {
      console.error('Error loading tiers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load pricing tiers',
        variant: 'destructive',
      })
      return []
    } finally {
      setLoadingTiers(false)
    }
  }, [toast])

  // Load package data when editing
  useEffect(() => {
    const initializeEditForm = async () => {
      if (editPackage) {
        // Load tiers first if tiered pricing
        let loadedTiers: TierFormData[] = []
        if (editPackage.pricing_model === PricingModel.Tiered) {
          loadedTiers = await loadTiers(editPackage.id)
        }

        // Reset form with edit package data AND loaded tiers
        form.reset({
          package: {
            name: editPackage.name,
            description: editPackage.description,
            service_type: editPackage.service_type,
            category: editPackage.category,
            pricing_model: editPackage.pricing_model,
            duration_minutes: editPackage.duration_minutes,
            base_price: editPackage.base_price,
            is_active: editPackage.is_active,
          },
          tiers: loadedTiers,
        })
      }
    }

    initializeEditForm()
  }, [editPackage, loadTiers, form])

  /**
   * Sync tiers to form state
   */
  useEffect(() => {
    form.setValue('tiers', tiers, { shouldValidate: false })
  }, [tiers, form])

  /**
   * Handle form submit (with Zod validation)
   */
  const onSubmit = async (data: ServicePackageV2CompleteFormData) => {
    setLoading(true)

    try {
      // Additional tier overlap validation
      if (data.package.pricing_model === PricingModel.Tiered && data.tiers) {
        try {
          validateTiersNoOverlap(data.tiers)
        } catch (error) {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Area ranges overlap',
            variant: 'destructive',
          })
          setLoading(false)
          return
        }
      }

      let packageId: string

      if (editPackage) {
        // Update existing package
        const { error } = await supabase
          .from('service_packages_v2')
          .update(data.package)
          .eq('id', editPackage.id)

        if (error) throw error

        packageId = editPackage.id

        // Update tiers if tiered pricing
        if (data.package.pricing_model === PricingModel.Tiered) {
          await updateTiers(packageId)
        }

        toast({
          title: 'Success',
          description: 'Package updated successfully',
        })
      } else {
        // Create new package
        const { data: newPackage, error } = await supabase
          .from('service_packages_v2')
          .insert(data.package)
          .select()
          .single()

        if (error) throw error
        if (!newPackage) throw new Error('No data returned')

        packageId = newPackage.id

        // Insert tiers if tiered pricing
        if (data.package.pricing_model === PricingModel.Tiered) {
          await insertTiers(packageId)
        }

        toast({
          title: 'Success',
          description: 'New package created successfully',
        })
      }

      onSuccess?.(packageId)
    } catch (error) {
      console.error('Error saving package:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Insert tiers for new package
   */
  const insertTiers = async (packageId: string) => {
    const tierData = tiers.map((tier) => ({
      package_id: packageId,
      ...tier,
    }))

    const { error } = await supabase.from('package_pricing_tiers').insert(tierData)

    if (error) throw error
  }

  /**
   * Update tiers for existing package
   */
  const updateTiers = async (packageId: string) => {
    // Delete existing tiers
    const { error: deleteError } = await supabase
      .from('package_pricing_tiers')
      .delete()
      .eq('package_id', packageId)

    if (deleteError) throw deleteError

    // Insert new tiers
    await insertTiers(packageId)
  }

  /**
   * Handle service type change
   */
  const handleServiceTypeChange = (value: 'cleaning' | 'training') => {
    form.setValue('package.service_type', value)
    // Auto-set pricing model based on service type
    // Cleaning -> Tiered (default), Training -> Fixed (default)
    const newPricingModel = value === 'training' ? PricingModel.Fixed : PricingModel.Tiered
    form.setValue('package.pricing_model', newPricingModel)
  }

  /**
   * Handle pricing model change
   */
  const handlePricingModelChange = (value: string) => {
    const pricingModel = value as PricingModel
    form.setValue('package.pricing_model', pricingModel)

    // Reset fields based on pricing model
    if (pricingModel === PricingModel.Fixed) {
      form.setValue('package.category', null)
      setTiers([]) // Clear tiers for fixed pricing
    } else {
      form.setValue('package.duration_minutes', null)
      form.setValue('package.base_price', null)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Package Name */}
          <div>
            <Label htmlFor="name">Package Name *</Label>
            <Controller
              name="package.name"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    id="name"
                    placeholder="e.g. Deep Cleaning Office"
                    {...field}
                  />
                  {fieldState.error && (
                    <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Controller
              name="package.description"
              control={form.control}
              render={({ field }) => (
                <Textarea
                  id="description"
                  placeholder="Package description"
                  rows={3}
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              )}
            />
          </div>

          {/* Service Type */}
          <div>
            <Label htmlFor="service_type">Service Type *</Label>
            <Controller
              name="package.service_type"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Select
                    value={field.value}
                    onValueChange={(value) => handleServiceTypeChange(value as 'cleaning' | 'training')}
                  >
                    <SelectTrigger id="service_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing Model */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pricing Model Selector */}
          <div>
            <Label htmlFor="pricing_model">Pricing Type *</Label>
            <Controller
              name="package.pricing_model"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Select value={field.value} onValueChange={handlePricingModelChange}>
                    <SelectTrigger id="pricing_model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PricingModel.Fixed}>
                        Fixed - Fixed Price (Legacy)
                      </SelectItem>
                      <SelectItem value={PricingModel.Tiered}>
                        Tiered - Area & Frequency Based (Recommended)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>

          {/* Fixed Pricing Fields */}
          {form.watch('package.pricing_model') === PricingModel.Fixed && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Controller
                    name="package.duration_minutes"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <>
                        <Input
                          id="duration"
                          type="number"
                          min="0"
                          placeholder="120"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        />
                        {fieldState.error && (
                          <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price (฿) *</Label>
                  <Controller
                    name="package.base_price"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="2500.00"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                        {fieldState.error && (
                          <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tiered Pricing Fields */}
          {form.watch('package.pricing_model') === PricingModel.Tiered && (
            <div className="space-y-4 pt-4 border-t">
              {/* Category */}
              <div>
                <Label htmlFor="category">Category *</Label>
                <Controller
                  name="package.category"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <>
                      <Select
                        value={field.value || ''}
                        onValueChange={(value) => field.onChange(value as ServiceCategory)}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ServiceCategory.Office}>Office</SelectItem>
                          <SelectItem value={ServiceCategory.Condo}>Condo</SelectItem>
                          <SelectItem value={ServiceCategory.House}>House</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldState.error && (
                        <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
                      )}
                    </>
                  )}
                />
              </div>

              {/* Tier Editor */}
              <div className="pt-4">
                {loadingTiers ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tinedy-blue mb-4"></div>
                      <p className="text-muted-foreground">Loading pricing tiers...</p>
                    </CardContent>
                  </Card>
                ) : (
                  <TierEditor tiers={tiers} onChange={setTiers} />
                )}
                {form.formState.errors.tiers && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.tiers.message}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        {showCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading} className="bg-tinedy-blue hover:bg-tinedy-blue/90">
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : editPackage ? 'Update' : 'Create Package'}
        </Button>
      </div>
    </form>
  )
}
