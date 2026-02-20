import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { queryKeys } from '@/lib/query-keys'
import { ServiceCategory } from '@/types'
import { PricingModel } from '@/types'
import { StepIndicator } from '@/components/booking/BookingWizard/StepIndicator'
import { createPackageV2, insertPackageTiers } from '@/lib/queries/package-mutations'
import type { TierFormData } from '@/components/service-packages/TierEditor'
import { Step1BasicInfo } from './Step1BasicInfo'
import { Step2Pricing } from './Step2Pricing'
import { Step3Confirm } from './Step3Confirm'

export interface WizardState {
  name: string
  description: string | null
  service_type: 'cleaning' | 'training'
  pricing_model: 'fixed' | 'tiered'
  category: ServiceCategory | null
  duration_minutes: number | null
  base_price: number | null
  is_active: boolean
  tiers: TierFormData[]
}

interface PackageWizardProps {
  onSuccess: (packageId: string) => void
  onCancel: () => void
  onDirtyChange?: (dirty: boolean) => void
}

const STEP_LABELS = ['Basic Info', 'Pricing', 'Confirm']
const TOTAL_STEPS = 3

const initialState: WizardState = {
  name: '',
  description: null,
  service_type: 'cleaning',
  pricing_model: 'tiered',
  category: null,
  duration_minutes: null,
  base_price: null,
  is_active: true,
  tiers: [],
}

function validateStep1(values: WizardState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!values.name.trim()) errors.name = 'Package name is required'
  return errors
}

function validateStep2(values: WizardState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (values.pricing_model === PricingModel.Fixed) {
    if (!values.duration_minutes || values.duration_minutes <= 0) {
      errors.duration_minutes = 'Duration is required'
    }
    if (values.base_price === null || values.base_price < 0) {
      errors.base_price = 'Price is required'
    }
  } else {
    if (!values.category) errors.category = 'Category is required'
    if (values.tiers.length === 0) {
      errors.tiers = 'At least 1 pricing tier is required'
    } else {
      const emptyTierIndex = values.tiers.findIndex((t) => t.frequency_prices.length === 0)
      if (emptyTierIndex !== -1) {
        errors.tiers = `Tier ${emptyTierIndex + 1} has no frequency pricing — add at least 1 price row`
      }
    }
  }
  return errors
}

export function PackageWizard({ onSuccess, onCancel, onDirtyChange }: PackageWizardProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [values, setValues] = useState<WizardState>(initialState)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showErrors, setShowErrors] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Notify parent of dirty state
  useEffect(() => {
    const dirty = values.name.trim() !== '' || values.tiers.length > 0
    onDirtyChange?.(dirty)
  }, [values.name, values.tiers.length, onDirtyChange])

  const handleChange = (updates: Partial<WizardState>) => {
    setValues((prev) => ({ ...prev, ...updates }))
    // Clear errors for changed fields
    const clearedErrors = { ...errors }
    Object.keys(updates).forEach((key) => delete clearedErrors[key])
    setErrors(clearedErrors)
  }

  const handleNext = () => {
    const validate = step === 1 ? validateStep1 : validateStep2
    const errs = validate(values)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setShowErrors(true)
      return
    }
    setErrors({})
    setShowErrors(false)
    setStep((prev) => prev + 1)
  }

  const handleBack = () => {
    setErrors({})
    setShowErrors(false)
    setStep((prev) => prev - 1)
  }

  const handleCreate = async () => {
    setIsSubmitting(true)
    try {
      const packageId = await createPackageV2({
        name: values.name,
        description: values.description,
        service_type: values.service_type,
        category: values.category,
        pricing_model: values.pricing_model,
        duration_minutes: values.duration_minutes,
        base_price: values.base_price,
        is_active: values.is_active,
      })

      if (values.pricing_model === PricingModel.Tiered && values.tiers.length > 0) {
        await insertPackageTiers(packageId, values.tiers)
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.packages.all })
      toast.success('Package created successfully')
      onSuccess(packageId)
    } catch (error) {
      console.error('Error creating package:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create package')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Step Indicator */}
      <div className="px-6 border-b">
        <StepIndicator
          currentStep={step}
          totalSteps={TOTAL_STEPS}
          labels={STEP_LABELS}
        />
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {step === 1 && (
          <Step1BasicInfo values={values} onChange={handleChange} errors={errors} />
        )}
        {step === 2 && (
          <Step2Pricing
            values={values}
            onChange={handleChange}
            errors={errors}
            showErrors={showErrors}
          />
        )}
        {step === 3 && <Step3Confirm values={values} />}
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 bg-background border-t pt-4 pb-6 flex gap-2 px-6">
        {step === 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isSubmitting}
            className="flex-1"
          >
            Back
          </Button>
        )}

        {step < TOTAL_STEPS ? (
          <Button
            type="button"
            onClick={handleNext}
            className="flex-1 bg-tinedy-blue hover:bg-tinedy-blue/90"
          >
            Next
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleCreate}
            disabled={isSubmitting}
            className="flex-1 bg-tinedy-blue hover:bg-tinedy-blue/90"
          >
            {isSubmitting ? 'Creating...' : 'Create Package'}
          </Button>
        )}
      </div>
    </div>
  )
}
