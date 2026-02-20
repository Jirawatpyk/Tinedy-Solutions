import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TierEditor } from '@/components/service-packages/TierEditor'
import { PricingModel, ServiceCategory } from '@/types'
import type { WizardState } from './index'

interface Step2Props {
  values: WizardState
  onChange: (updates: Partial<WizardState>) => void
  errors: Record<string, string>
  showErrors: boolean
}

export function Step2Pricing({ values, onChange, errors, showErrors }: Step2Props) {
  const handlePricingModelChange = (value: string) => {
    const pricingModel = value as 'fixed' | 'tiered'
    if (pricingModel === 'fixed') {
      onChange({ pricing_model: pricingModel, category: null, tiers: [] })
    } else {
      onChange({ pricing_model: pricingModel, duration_minutes: null, base_price: null })
    }
  }

  return (
    <div className="space-y-4">
      {/* Pricing Model */}
      <div className="space-y-2">
        <Label htmlFor="wizard-pricing-model">Pricing Type *</Label>
        <Select value={values.pricing_model} onValueChange={handlePricingModelChange}>
          <SelectTrigger id="wizard-pricing-model">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PricingModel.Fixed}>
              Fixed — Fixed Price (Legacy)
            </SelectItem>
            <SelectItem value={PricingModel.Tiered}>
              Tiered — Area &amp; Frequency Based (Recommended)
            </SelectItem>
          </SelectContent>
        </Select>
        {errors.pricing_model && (
          <p className="text-xs text-destructive">{errors.pricing_model}</p>
        )}
      </div>

      {/* Fixed Pricing Fields */}
      {values.pricing_model === PricingModel.Fixed && (
        <div className="space-y-4 pt-4 border-t">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wizard-duration">Duration (minutes) *</Label>
              <Input
                id="wizard-duration"
                type="number"
                min="0"
                placeholder="120"
                value={values.duration_minutes ?? ''}
                onChange={(e) =>
                  onChange({
                    duration_minutes: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
              />
              {errors.duration_minutes && (
                <p className="text-xs text-destructive">{errors.duration_minutes}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-base-price">Base Price (฿) *</Label>
              <Input
                id="wizard-base-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="2500.00"
                value={values.base_price ?? ''}
                onChange={(e) =>
                  onChange({
                    base_price: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
              />
              {errors.base_price && (
                <p className="text-xs text-destructive">{errors.base_price}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tiered Pricing Fields */}
      {values.pricing_model === PricingModel.Tiered && (
        <div className="space-y-4 pt-4 border-t">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="wizard-category">Category *</Label>
            <Select
              value={values.category || ''}
              onValueChange={(v) => onChange({ category: v as ServiceCategory })}
            >
              <SelectTrigger id="wizard-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ServiceCategory.Office}>Office</SelectItem>
                <SelectItem value={ServiceCategory.Condo}>Condo</SelectItem>
                <SelectItem value={ServiceCategory.House}>House</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category}</p>
            )}
          </div>

          {/* Tier Editor */}
          <div className="overflow-x-auto -mx-4 px-4">
            <TierEditor
              tiers={values.tiers}
              onChange={(tiers) => onChange({ tiers })}
              showErrors={showErrors}
            />
          </div>
          {errors.tiers && (
            <p className="text-xs text-destructive">{errors.tiers}</p>
          )}
        </div>
      )}
    </div>
  )
}
