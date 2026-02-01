import React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { BookingCreateFormData } from '@/schemas'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface AddressSectionProps {
  form: UseFormReturn<BookingCreateFormData>
}

const AddressSection = React.memo(function AddressSection({
  form,
}: AddressSectionProps) {
  return (
    <>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="address">Address *</Label>
        <Input
          id="address"
          {...form.register('address')}
          required
          aria-invalid={!!form.formState.errors.address}
        />
        {form.formState.errors.address && (
          <p className="text-sm text-destructive">
            {form.formState.errors.address.message}
          </p>
        )}
      </div>

      <div className="sm:col-span-2 grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            {...form.register('city')}
            required
            aria-invalid={!!form.formState.errors.city}
          />
          {form.formState.errors.city && (
            <p className="text-sm text-destructive">
              {form.formState.errors.city.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">Province *</Label>
          <Input
            id="state"
            {...form.register('state')}
            required
            aria-invalid={!!form.formState.errors.state}
          />
          {form.formState.errors.state && (
            <p className="text-sm text-destructive">
              {form.formState.errors.state.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="zip_code">Zip Code *</Label>
          <Input
            id="zip_code"
            {...form.register('zip_code')}
            required
            aria-invalid={!!form.formState.errors.zip_code}
          />
          {form.formState.errors.zip_code && (
            <p className="text-sm text-destructive">
              {form.formState.errors.zip_code.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2 sm:col-span-2 pb-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...form.register('notes')}
          rows={3}
          aria-invalid={!!form.formState.errors.notes}
        />
        {form.formState.errors.notes && (
          <p className="text-sm text-destructive">
            {form.formState.errors.notes.message}
          </p>
        )}
      </div>
    </>
  )
})

export default AddressSection
