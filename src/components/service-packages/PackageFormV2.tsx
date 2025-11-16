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
import { AlertCircle, Save, X } from 'lucide-react'
import {
  PricingModel,
  ServiceCategory,
  type ServicePackageV2,
  type ServicePackageV2Input,
} from '@/types'

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
  const [showErrors, setShowErrors] = useState(false)

  // Form state
  const [formData, setFormData] = useState<ServicePackageV2Input>({
    name: '',
    description: null,
    service_type: 'cleaning',
    category: ServiceCategory.Office,
    pricing_model: PricingModel.Tiered,
    duration_minutes: null,
    base_price: null,
    is_active: true,
    display_order: 0,
  })

  // Tiers state (for tiered pricing)
  const [tiers, setTiers] = useState<TierFormData[]>([])

  /**
   * Load pricing tiers for package
   */
  const loadTiers = useCallback(async (packageId: string) => {
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
    } catch (error) {
      console.error('Error loading tiers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load pricing tiers',
        variant: 'destructive',
      })
    }
  }, [toast])

  // Load package data when editing
  useEffect(() => {
    if (editPackage) {
      setFormData({
        name: editPackage.name,
        description: editPackage.description,
        service_type: editPackage.service_type,
        category: editPackage.category,
        pricing_model: editPackage.pricing_model,
        duration_minutes: editPackage.duration_minutes,
        base_price: editPackage.base_price,
        is_active: editPackage.is_active,
        display_order: editPackage.display_order,
      })

      // Load tiers if tiered pricing
      if (editPackage.pricing_model === PricingModel.Tiered) {
        loadTiers(editPackage.id)
      }
    }
  }, [editPackage, loadTiers])

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    const errors: string[] = []

    // Basic validation
    if (!formData.name.trim()) {
      errors.push('Please enter package name')
    }

    if (!formData.service_type) {
      errors.push('Please select service type')
    }

    // Pricing model specific validation
    if (formData.pricing_model === PricingModel.Fixed) {
      if (!formData.duration_minutes || formData.duration_minutes <= 0) {
        errors.push('Please enter duration (minutes)')
      }
      if (!formData.base_price || formData.base_price <= 0) {
        errors.push('Please enter price')
      }
    } else if (formData.pricing_model === PricingModel.Tiered) {
      if (!formData.category) {
        errors.push('Please select category (Office/Condo/House)')
      }
      if (tiers.length === 0) {
        errors.push('Please add at least 1 pricing tier')
      }
    }

    if (errors.length > 0) {
      setShowErrors(true)
      toast({
        title: 'Incomplete Data',
        description: errors[0],
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  /**
   * Handle form submit
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      let packageId: string

      if (editPackage) {
        // Update existing package
        const { error } = await supabase
          .from('service_packages_v2')
          .update(formData)
          .eq('id', editPackage.id)

        if (error) throw error

        packageId = editPackage.id

        // Update tiers if tiered pricing
        if (formData.pricing_model === PricingModel.Tiered) {
          await updateTiers(packageId)
        }

        toast({
          title: 'Success',
          description: 'Package updated successfully',
        })
      } else {
        // Create new package
        const { data, error } = await supabase
          .from('service_packages_v2')
          .insert(formData)
          .select()
          .single()

        if (error) throw error
        if (!data) throw new Error('No data returned')

        packageId = data.id

        // Insert tiers if tiered pricing
        if (formData.pricing_model === PricingModel.Tiered) {
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
    setFormData({
      ...formData,
      service_type: value,
      // Auto-set pricing model based on service type
      // Cleaning -> Tiered (default), Training -> Fixed (default)
      pricing_model: value === 'training' ? PricingModel.Fixed : PricingModel.Tiered,
    })
  }

  /**
   * Handle pricing model change
   */
  const handlePricingModelChange = (value: string) => {
    setFormData({
      ...formData,
      pricing_model: value as PricingModel,
      // Reset fields based on pricing model
      duration_minutes: value === PricingModel.Fixed ? formData.duration_minutes : null,
      base_price: value === PricingModel.Fixed ? formData.base_price : null,
      category: value === PricingModel.Tiered ? formData.category : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Package Name */}
          <div>
            <Label htmlFor="name">Package Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Deep Cleaning Office"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value || null })
              }
              placeholder="Package description"
              rows={3}
            />
          </div>

          {/* Service Type */}
          <div>
            <Label htmlFor="service_type">Service Type *</Label>
            <Select
              value={formData.service_type}
              onValueChange={(value) => handleServiceTypeChange(value as 'cleaning' | 'training')}
            >
              <SelectTrigger id="service_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cleaning">Cleaning (ทำความสะอาด)</SelectItem>
                <SelectItem value="training">Training (ฝึกอบรม)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Display Order */}
          <div>
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              min="0"
              value={formData.display_order}
              onChange={(e) =>
                setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
              }
            />
            <p className="text-sm text-muted-foreground mt-1">
              Lower numbers will be displayed first (0 = first)
            </p>
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
            <Select value={formData.pricing_model} onValueChange={handlePricingModelChange}>
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
          </div>

          {/* Fixed Pricing Fields */}
          {formData.pricing_model === PricingModel.Fixed && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0"
                    value={formData.duration_minutes || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_minutes: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="120"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price (฿) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.base_price || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        base_price: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder="2500.00"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tiered Pricing Fields */}
          {formData.pricing_model === PricingModel.Tiered && (
            <div className="space-y-4 pt-4 border-t">
              {/* Category */}
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value as ServiceCategory })
                  }
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
              </div>

              {/* Tier Editor */}
              <div className="pt-4">
                <TierEditor tiers={tiers} onChange={setTiers} showErrors={showErrors} />
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

      {/* Validation Warning */}
      {showErrors && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-medium">Please check your data</p>
                <p className="text-sm mt-1">Some required information is missing. Please complete before saving.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}
