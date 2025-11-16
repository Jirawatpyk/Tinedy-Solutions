/**
 * TierEditor Component - Area-based Pricing Tier Management
 *
 * Component สำหรับจัดการระดับราคาตามพื้นที่ (Pricing Tiers)
 * รองรับการเพิ่ม/ลบ/แก้ไข tiers แบบ dynamic
 *
 * Features:
 * - เพิ่ม/ลบระดับราคา
 * - กำหนดช่วงพื้นที่ (area_min - area_max)
 * - ตั้งราคาสำหรับแต่ละแพ็กเกจ (1, 2, 4, 8 ครั้ง)
 * - ตรวจสอบความถูกต้อง (validation)
 * - แสดงตัวอย่างราคา
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/pricing-utils'

/**
 * Tier data for form (without package_id and timestamps)
 */
export interface TierFormData {
  area_min: number
  area_max: number
  required_staff: number
  estimated_hours: number | null
  price_1_time: number
  price_2_times: number | null
  price_4_times: number | null
  price_8_times: number | null
}

interface TierEditorProps {
  /** Current tiers data */
  tiers: TierFormData[]
  /** Callback when tiers are updated */
  onChange: (tiers: TierFormData[]) => void
  /** Read-only mode */
  disabled?: boolean
  /** Show validation errors */
  showErrors?: boolean
}

/**
 * Create empty tier with default values
 */
function createEmptyTier(): TierFormData {
  return {
    area_min: 0,
    area_max: 100,
    required_staff: 1,
    estimated_hours: null,
    price_1_time: 0,
    price_2_times: null,
    price_4_times: null,
    price_8_times: null,
  }
}

/**
 * TierEditor Component
 */
export function TierEditor({
  tiers,
  onChange,
  disabled = false,
  showErrors = false,
}: TierEditorProps) {
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({})

  /**
   * Validate all tiers
   */
  const validateTiers = useCallback(() => {
    const errors: Record<number, string[]> = {}

    tiers.forEach((tier, index) => {
      const tierErrors: string[] = []

      // Area validation
      if (tier.area_min < 0) {
        tierErrors.push('Minimum area cannot be negative')
      }
      if (tier.area_max <= tier.area_min) {
        tierErrors.push('Maximum area must be greater than minimum area')
      }

      // Check overlapping with other tiers
      tiers.forEach((otherTier, otherIndex) => {
        if (index !== otherIndex) {
          const overlap =
            (tier.area_min >= otherTier.area_min && tier.area_min <= otherTier.area_max) ||
            (tier.area_max >= otherTier.area_min && tier.area_max <= otherTier.area_max) ||
            (tier.area_min <= otherTier.area_min && tier.area_max >= otherTier.area_max)

          if (overlap) {
            tierErrors.push(`Area range overlaps with Tier ${otherIndex + 1}`)
          }
        }
      })

      // Staff validation
      if (tier.required_staff < 1) {
        tierErrors.push('Must have at least 1 staff member')
      }

      // Price validation
      if (tier.price_1_time <= 0) {
        tierErrors.push('Price for 1 time must be greater than 0')
      }

      if (tierErrors.length > 0) {
        errors[index] = tierErrors
      }
    })

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [tiers])

  // Validate tiers whenever they change
  useEffect(() => {
    if (showErrors) {
      validateTiers()
    }
  }, [tiers, showErrors, validateTiers])

  /**
   * Add new tier
   */
  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1]
    const newTier = createEmptyTier()

    // Auto-set area_min based on last tier
    if (lastTier) {
      newTier.area_min = lastTier.area_max + 1
      newTier.area_max = lastTier.area_max + 100
      newTier.required_staff = lastTier.required_staff
    }

    onChange([...tiers, newTier])
  }

  /**
   * Remove tier
   */
  const handleRemoveTier = (index: number) => {
    const newTiers = tiers.filter((_, i) => i !== index)
    onChange(newTiers)
  }

  /**
   * Update tier field
   */
  const handleUpdateTier = (index: number, field: keyof TierFormData, value: number | null) => {
    const newTiers = [...tiers]
    newTiers[index] = {
      ...newTiers[index],
      [field]: value,
    }
    onChange(newTiers)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Area-Based Pricing Tiers</h3>
          <p className="text-sm text-muted-foreground">
            Set prices and staff requirements for each area range
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddTier}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Tier
        </Button>
      </div>

      {/* Tiers List */}
      {tiers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No pricing tiers yet. Please add at least 1 tier.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTier}
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Tier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tiers.map((tier, index) => (
            <Card
              key={index}
              className={cn(
                'relative',
                validationErrors[index] && showErrors && 'border-red-500'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Tier {index + 1}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {tier.area_min}-{tier.area_max} sqm
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTier(index)}
                    disabled={disabled || tiers.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Validation Errors */}
                {validationErrors[index] && showErrors && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm font-medium text-red-800 mb-1">
                      Errors found:
                    </p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validationErrors[index].map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Area Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`tier-${index}-min`}>Minimum Area (sqm)</Label>
                    <Input
                      id={`tier-${index}-min`}
                      type="number"
                      min="0"
                      value={tier.area_min}
                      onChange={(e) =>
                        handleUpdateTier(index, 'area_min', parseInt(e.target.value) || 0)
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`tier-${index}-max`}>Maximum Area (sqm)</Label>
                    <Input
                      id={`tier-${index}-max`}
                      type="number"
                      min="0"
                      value={tier.area_max}
                      onChange={(e) =>
                        handleUpdateTier(index, 'area_max', parseInt(e.target.value) || 0)
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>

                {/* Staff & Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`tier-${index}-staff`}>Staff Count</Label>
                    <Input
                      id={`tier-${index}-staff`}
                      type="number"
                      min="1"
                      value={tier.required_staff}
                      onChange={(e) =>
                        handleUpdateTier(index, 'required_staff', parseInt(e.target.value) || 1)
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`tier-${index}-hours`}>
                      Estimated Hours (Optional)
                    </Label>
                    <Input
                      id={`tier-${index}-hours`}
                      type="number"
                      step="0.5"
                      min="0"
                      value={tier.estimated_hours ?? ''}
                      onChange={(e) =>
                        handleUpdateTier(
                          index,
                          'estimated_hours',
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="e.g. 2.5"
                      disabled={disabled}
                    />
                  </div>
                </div>

                {/* Prices by Frequency */}
                <div>
                  <Label className="mb-3 block">Pricing by Frequency</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* 1 time */}
                    <div>
                      <Label htmlFor={`tier-${index}-price-1`} className="text-sm">
                        1 time *
                      </Label>
                      <Input
                        id={`tier-${index}-price-1`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.price_1_time}
                        onChange={(e) =>
                          handleUpdateTier(index, 'price_1_time', parseFloat(e.target.value) || 0)
                        }
                        disabled={disabled}
                        placeholder="0.00"
                      />
                    </div>

                    {/* 2 times */}
                    <div>
                      <Label htmlFor={`tier-${index}-price-2`} className="text-sm">
                        2 times
                      </Label>
                      <Input
                        id={`tier-${index}-price-2`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.price_2_times ?? ''}
                        onChange={(e) =>
                          handleUpdateTier(
                            index,
                            'price_2_times',
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        disabled={disabled}
                        placeholder="Optional"
                      />
                    </div>

                    {/* 4 times */}
                    <div>
                      <Label htmlFor={`tier-${index}-price-4`} className="text-sm">
                        4 times
                      </Label>
                      <Input
                        id={`tier-${index}-price-4`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.price_4_times ?? ''}
                        onChange={(e) =>
                          handleUpdateTier(
                            index,
                            'price_4_times',
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        disabled={disabled}
                        placeholder="Optional"
                      />
                    </div>

                    {/* 8 times */}
                    <div>
                      <Label htmlFor={`tier-${index}-price-8`} className="text-sm">
                        8 times
                      </Label>
                      <Input
                        id={`tier-${index}-price-8`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.price_8_times ?? ''}
                        onChange={(e) =>
                          handleUpdateTier(
                            index,
                            'price_8_times',
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        disabled={disabled}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-muted rounded-md p-3">
                  <p className="text-sm font-medium mb-2">Price Summary:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>1 time:</div>
                    <div className="font-semibold">{formatPrice(tier.price_1_time)}</div>
                    {tier.price_2_times && (
                      <>
                        <div>2 times:</div>
                        <div className="font-semibold">{formatPrice(tier.price_2_times)}</div>
                      </>
                    )}
                    {tier.price_4_times && (
                      <>
                        <div>4 times:</div>
                        <div className="font-semibold">{formatPrice(tier.price_4_times)}</div>
                      </>
                    )}
                    {tier.price_8_times && (
                      <>
                        <div>8 times:</div>
                        <div className="font-semibold">{formatPrice(tier.price_8_times)}</div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {tiers.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <AlertCircle className="h-4 w-4" />
              <span>
                {tiers.length} pricing tier{tiers.length > 1 ? 's' : ''} defined (covering area {tiers[0]?.area_min || 0} -{' '}
                {tiers[tiers.length - 1]?.area_max || 0} sqm)
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
