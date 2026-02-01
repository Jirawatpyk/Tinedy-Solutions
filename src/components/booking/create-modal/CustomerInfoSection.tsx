import React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { CustomerRecord } from '@/types/customer'
import type { BookingCreateFormData } from '@/schemas'

interface CustomerInfoSectionProps {
  form: UseFormReturn<BookingCreateFormData>
  existingCustomer: CustomerRecord | null
  checkingCustomer: boolean
  handleEmailBlur: () => void
  handlePhoneBlur: () => void
  useExistingCustomer: () => void
}

const CustomerInfoSection = React.memo(function CustomerInfoSection({
  form,
  existingCustomer,
  checkingCustomer,
  handleEmailBlur,
  handlePhoneBlur,
  useExistingCustomer,
}: CustomerInfoSectionProps) {
  return (
    <div className="space-y-4 border-b pb-4">
      <h3 className="font-medium">Customer Information</h3>

      {/* Customer Found Alert */}
      {existingCustomer && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              <strong>Customer Found:</strong> {existingCustomer.full_name} ({existingCustomer.phone})
            </span>
            <Button
              type="button"
              size="sm"
              onClick={useExistingCustomer}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Use Existing Data
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name *</Label>
          <Input
            id="full_name"
            {...form.register('full_name')}
            required
            aria-invalid={!!form.formState.errors.full_name}
          />
          {form.formState.errors.full_name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.full_name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            {...form.register('email')}
            onBlur={handleEmailBlur}
            required
            disabled={checkingCustomer}
            aria-invalid={!!form.formState.errors.email}
          />
          {checkingCustomer && (
            <p className="text-xs text-muted-foreground">Checking...</p>
          )}
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            type="tel"
            {...form.register('phone')}
            onBlur={handlePhoneBlur}
            required
            disabled={checkingCustomer}
            aria-invalid={!!form.formState.errors.phone}
          />
          {form.formState.errors.phone && (
            <p className="text-sm text-destructive">
              {form.formState.errors.phone.message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
})

export { CustomerInfoSection }
export type { CustomerInfoSectionProps }
