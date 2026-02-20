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
import type { WizardState } from './index'

interface Step1Props {
  values: WizardState
  onChange: (updates: Partial<WizardState>) => void
  errors: Record<string, string>
}

export function Step1BasicInfo({ values, onChange, errors }: Step1Props) {
  const handleServiceTypeChange = (value: 'cleaning' | 'training') => {
    const newPricingModel = value === 'training' ? 'fixed' : 'tiered'
    onChange({ service_type: value, pricing_model: newPricingModel })
  }

  return (
    <div className="space-y-4">
      {/* Package Name */}
      <div className="space-y-2">
        <Label htmlFor="wizard-name">Package Name *</Label>
        <Input
          id="wizard-name"
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Deep Cleaning Office"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="wizard-description">Description</Label>
        <Textarea
          id="wizard-description"
          value={values.description || ''}
          onChange={(e) => onChange({ description: e.target.value || null })}
          placeholder="Package description (optional)"
          rows={3}
        />
      </div>

      {/* Service Type */}
      <div className="space-y-2">
        <Label htmlFor="wizard-service-type">Service Type *</Label>
        <Select
          value={values.service_type}
          onValueChange={(v) => handleServiceTypeChange(v as 'cleaning' | 'training')}
        >
          <SelectTrigger id="wizard-service-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cleaning">Cleaning</SelectItem>
            <SelectItem value="training">Training</SelectItem>
          </SelectContent>
        </Select>
        {errors.service_type && (
          <p className="text-xs text-destructive">{errors.service_type}</p>
        )}
      </div>
    </div>
  )
}
