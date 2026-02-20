/**
 * TierEditor Component - Area-based Pricing Tier Management
 *
 * Component สำหรับจัดการระดับราคาตามพื้นที่ (Pricing Tiers)
 * รองรับการเพิ่ม/ลบ/แก้ไข tiers แบบ dynamic พร้อม frequency pricing แบบไม่จำกัดจำนวน
 *
 * Features:
 * - เพิ่ม/ลบระดับราคา
 * - กำหนดช่วงพื้นที่ (area_min - area_max)
 * - ราคาตามจำนวนครั้ง (frequency_prices) แบบ dynamic — เพิ่ม/ลบแถวได้อิสระ
 * - ตรวจสอบความถูกต้อง (validation)
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { FrequencyPrice } from '@/types/service-package-v2'

/**
 * Tier data for form (without package_id and timestamps)
 * _key is a stable client-side id for React reconciliation
 */
export interface TierFormData {
  _key: string
  area_min: number
  area_max: number
  required_staff: number
  estimated_hours: number
  frequency_prices: FrequencyPrice[]
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
    _key: crypto.randomUUID(),
    area_min: 0,
    area_max: 100,
    required_staff: 1,
    estimated_hours: 0,
    frequency_prices: [{ times: 1, price: 0 }],
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

      if (tier.required_staff < 1) {
        tierErrors.push('Must have at least 1 staff member')
      }

      if (tier.frequency_prices.length === 0) {
        tierErrors.push('At least one frequency pricing entry is required')
      }

      // Check for duplicate times
      const timesSet = new Set(tier.frequency_prices.map((fp) => fp.times))
      if (timesSet.size !== tier.frequency_prices.length) {
        tierErrors.push('Duplicate frequency entries found')
      }

      if (tierErrors.length > 0) {
        errors[index] = tierErrors
      }
    })

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [tiers])

  useEffect(() => {
    if (showErrors) {
      validateTiers()
    }
  }, [tiers, showErrors, validateTiers])

  // ─── Tier-level handlers ───────────────────────────────────────────────────

  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1]
    const newTier = createEmptyTier()

    if (lastTier) {
      newTier.area_min = lastTier.area_max + 1
      newTier.area_max = lastTier.area_max + 100
      newTier.required_staff = lastTier.required_staff
      // Copy frequency structure from last tier (same times, zero price)
      newTier.frequency_prices = lastTier.frequency_prices.map((fp) => ({
        times: fp.times,
        price: 0,
      }))
    }

    onChange([...tiers, newTier])
  }

  const handleRemoveTier = (index: number) => {
    onChange(tiers.filter((_, i) => i !== index))
  }

  const handleUpdateTierField = (
    tierIndex: number,
    field: 'area_min' | 'area_max' | 'estimated_hours' | 'required_staff',
    value: number
  ) => {
    const newTiers = [...tiers]
    newTiers[tierIndex] = { ...newTiers[tierIndex], [field]: value }
    onChange(newTiers)
  }

  // ─── Frequency price row handlers ─────────────────────────────────────────

  const handleAddFrequency = (tierIndex: number) => {
    const newTiers = [...tiers]
    const existingTimes = newTiers[tierIndex].frequency_prices.map((fp) => fp.times)
    // Suggest next sensible default (next integer not yet used)
    let nextTimes = 1
    while (existingTimes.includes(nextTimes)) nextTimes++

    newTiers[tierIndex] = {
      ...newTiers[tierIndex],
      frequency_prices: [
        ...newTiers[tierIndex].frequency_prices,
        { times: nextTimes, price: 0 },
      ],
    }
    onChange(newTiers)
  }

  const handleRemoveFrequency = (tierIndex: number, freqIndex: number) => {
    const newTiers = [...tiers]
    newTiers[tierIndex] = {
      ...newTiers[tierIndex],
      frequency_prices: newTiers[tierIndex].frequency_prices.filter((_, i) => i !== freqIndex),
    }
    onChange(newTiers)
  }

  const handleUpdateFrequency = (
    tierIndex: number,
    freqIndex: number,
    field: 'times' | 'price',
    value: number
  ) => {
    const newTiers = [...tiers]
    const fps = [...newTiers[tierIndex].frequency_prices]
    fps[freqIndex] = { ...fps[freqIndex], [field]: value }
    newTiers[tierIndex] = { ...newTiers[tierIndex], frequency_prices: fps }
    onChange(newTiers)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

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
            <Button type="button" variant="outline" onClick={handleAddTier} disabled={disabled}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Tier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tiers.map((tier, tierIndex) => (
            <Card
              key={tier._key}
              className={cn(
                'relative',
                validationErrors[tierIndex] && showErrors && 'border-red-500'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Tier {tierIndex + 1}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {tier.area_min}–{tier.area_max} sqm
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTier(tierIndex)}
                    disabled={disabled || tiers.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Validation Errors */}
                {validationErrors[tierIndex] && showErrors && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm font-medium text-red-800 mb-1">Errors found:</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validationErrors[tierIndex].map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Area Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`tier-${tierIndex}-min`}>Min Area (sqm)</Label>
                    <Input
                      id={`tier-${tierIndex}-min`}
                      type="number"
                      min="0"
                      value={tier.area_min}
                      onChange={(e) =>
                        handleUpdateTierField(tierIndex, 'area_min', parseInt(e.target.value) || 0)
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`tier-${tierIndex}-max`}>Max Area (sqm)</Label>
                    <Input
                      id={`tier-${tierIndex}-max`}
                      type="number"
                      min="0"
                      value={tier.area_max}
                      onChange={(e) =>
                        handleUpdateTierField(tierIndex, 'area_max', parseInt(e.target.value) || 0)
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>

                {/* Required Staff */}
                <div>
                  <Label htmlFor={`tier-${tierIndex}-staff`}>Required Staff *</Label>
                  <Input
                    id={`tier-${tierIndex}-staff`}
                    type="number"
                    min="1"
                    step="1"
                    value={tier.required_staff}
                    onChange={(e) =>
                      handleUpdateTierField(
                        tierIndex,
                        'required_staff',
                        parseInt(e.target.value) || 1
                      )
                    }
                    disabled={disabled}
                    className={cn(
                      showErrors && tier.required_staff < 1 && 'border-red-500'
                    )}
                  />
                  {showErrors && tier.required_staff < 1 && (
                    <p className="text-sm text-red-500 mt-1">At least 1 staff required</p>
                  )}
                </div>

                {/* Estimated Hours */}
                <div>
                  <Label htmlFor={`tier-${tierIndex}-hours`}>Estimated Hours *</Label>
                  <Input
                    id={`tier-${tierIndex}-hours`}
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={tier.estimated_hours > 0 ? tier.estimated_hours : ''}
                    onChange={(e) =>
                      handleUpdateTierField(
                        tierIndex,
                        'estimated_hours',
                        e.target.value ? parseFloat(e.target.value) : 0
                      )
                    }
                    placeholder="e.g. 2.5"
                    disabled={disabled}
                    className={cn(
                      showErrors &&
                        (!tier.estimated_hours || tier.estimated_hours <= 0) &&
                        'border-red-500'
                    )}
                  />
                  {showErrors && (!tier.estimated_hours || tier.estimated_hours <= 0) && (
                    <p className="text-sm text-red-500 mt-1">Estimated hours is required</p>
                  )}
                </div>

                {/* ── Pricing by Frequency (dynamic rows) ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Pricing by Frequency</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddFrequency(tierIndex)}
                      disabled={disabled}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </div>

                  {tier.frequency_prices.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      No frequency pricing set. Click Add to add one.
                    </p>
                  )}

                  {/* Column headers */}
                  {tier.frequency_prices.length > 0 && (
                    <div className="grid grid-cols-[1fr_1.5fr_auto] gap-2 px-1">
                      <span className="text-xs text-muted-foreground font-medium">Times/mo</span>
                      <span className="text-xs text-muted-foreground font-medium">Price (฿)</span>
                      <span className="w-8" />
                    </div>
                  )}

                  {tier.frequency_prices.map((fp, freqIndex) => (
                    <div
                      key={`${tier._key}-freq-${fp.times}`}
                      className="grid grid-cols-[1fr_1.5fr_auto] gap-2 items-center"
                    >
                      {/* Times */}
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={fp.times}
                        onChange={(e) =>
                          handleUpdateFrequency(
                            tierIndex,
                            freqIndex,
                            'times',
                            parseInt(e.target.value) || 1
                          )
                        }
                        disabled={disabled}
                        placeholder="1"
                        aria-label={`Tier ${tierIndex + 1} frequency ${freqIndex + 1} times`}
                      />

                      {/* Price */}
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={fp.price}
                        onChange={(e) =>
                          handleUpdateFrequency(
                            tierIndex,
                            freqIndex,
                            'price',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        disabled={disabled}
                        placeholder="0.00"
                        aria-label={`Tier ${tierIndex + 1} frequency ${freqIndex + 1} price`}
                      />

                      {/* Remove */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRemoveFrequency(tierIndex, freqIndex)}
                        disabled={disabled || tier.frequency_prices.length === 1}
                        aria-label="Remove frequency row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Price Summary */}
                {tier.frequency_prices.some((fp) => fp.price > 0) && (
                  <div className="bg-muted rounded-md p-3">
                    <p className="text-sm font-medium mb-2">Price Summary:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {[...tier.frequency_prices]
                        .sort((a, b) => a.times - b.times)
                        .filter((fp) => fp.price > 0)
                        .map((fp, i) => (
                          <div key={i} className="contents">
                            <div className="text-muted-foreground">{fp.times}×:</div>
                            <div className="font-semibold">{formatCurrency(fp.price)}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
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
                {tiers.length} pricing tier{tiers.length > 1 ? 's' : ''} defined (covering area{' '}
                {tiers[0]?.area_min || 0}–{tiers[tiers.length - 1]?.area_max || 0} sqm)
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
