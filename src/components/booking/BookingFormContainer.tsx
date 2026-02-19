/**
 * BookingFormContainer — CREATE booking sheet
 *
 * Reads localStorage booking-form-mode preference (via useBookingWizard internals).
 * Renders BookingWizard (guided) or BookingQuickForm (quick) inside AppSheet.
 *
 * A2: Wrapped in DashboardErrorBoundary for safe fallback.
 *
 * Used by:
 * - bookings.tsx
 * - calendar.tsx
 * - BookingModalsContainer.tsx (customer detail)
 */

import { useState } from 'react'
import { AppSheet } from '@/components/ui/app-sheet'
import { DashboardErrorBoundary } from '@/components/error/DashboardErrorBoundary'
import { BookingWizard } from './BookingWizard'
import { BookingQuickForm } from './BookingQuickForm'

interface BookingFormContainerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
  onSuccess?: () => void
}

export function BookingFormContainer({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: BookingFormContainerProps) {
  const storageKey = userId ? `booking-form-mode_${userId}` : 'booking-form-mode_'

  // Mode toggle (wizard vs quick) — managed locally; initial value from localStorage
  const [mode, setMode] = useState<'wizard' | 'quick'>(() => {
    if (typeof window === 'undefined') return 'wizard'
    return (localStorage.getItem(storageKey) as 'wizard' | 'quick') ?? 'wizard'
  })

  function switchMode(next: 'wizard' | 'quick') {
    localStorage.setItem(storageKey, next)
    setMode(next)
  }

  function handleSuccess() {
    onOpenChange(false)
    onSuccess?.()
  }

  function handleCancel() {
    onOpenChange(false)
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="สร้างการจอง"
      size="md"
      aria-label="สร้างการจอง"
    >
      <DashboardErrorBoundary
        fallback={
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6">
            <p className="text-sm text-muted-foreground">
              เกิดข้อผิดพลาด กรุณาปิดและลองใหม่
            </p>
          </div>
        }
      >
        {mode === 'wizard' ? (
          <BookingWizard
            userId={userId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            onSwitchToQuick={() => switchMode('quick')}
          />
        ) : (
          <BookingQuickForm
            userId={userId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            onSwitchToWizard={() => switchMode('wizard')}
          />
        )}
      </DashboardErrorBoundary>
    </AppSheet>
  )
}
