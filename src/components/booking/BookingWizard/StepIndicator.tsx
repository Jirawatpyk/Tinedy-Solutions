/**
 * StepIndicator — Progress dots for 4-step booking wizard
 */

import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  currentStep: number
  totalSteps?: number
  labels?: string[]
}

const DEFAULT_LABELS = ['Customer', 'Service', 'Assignment', 'Confirm']

export function StepIndicator({
  currentStep,
  totalSteps = 4,
  labels = DEFAULT_LABELS,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        const isCompleted = step < currentStep
        const isActive = step === currentStep

        return (
          <div key={step} className="flex items-center gap-2">
            {/* Step dot */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  isCompleted && 'bg-tinedy-green text-white',
                  isActive && 'bg-tinedy-blue text-white ring-2 ring-tinedy-blue ring-offset-2',
                  !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? '✓' : step}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium whitespace-nowrap',
                  isActive && 'text-tinedy-blue',
                  isCompleted && 'text-tinedy-green',
                  !isActive && !isCompleted && 'text-muted-foreground'
                )}
              >
                {labels[i]}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {step < totalSteps && (
              <div
                className={cn(
                  'w-8 h-0.5 mb-4 transition-colors',
                  step < currentStep ? 'bg-tinedy-green' : 'bg-muted'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
