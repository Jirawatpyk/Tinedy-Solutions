import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { logger } from '@/lib/logger'
import {
  customerCreateSchema,
  customerUpdateSchema,
  type CustomerCreateFormData,
  type CustomerUpdateFormData,
} from '@/schemas'
import type { CustomerRecord } from '@/types'
import { AppSheet } from '@/components/ui/app-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TagInput } from '@/components/ui/tag-input'
import { getTagColor } from '@/lib/tag-utils'
import { CUSTOMER_TAG_SUGGESTIONS } from '@/constants/customer-tags'
import { Tag } from 'lucide-react'

export interface CustomerFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  customer?: CustomerRecord | null
}

type CustomerFormData = CustomerCreateFormData | CustomerUpdateFormData

const defaultFormValues: CustomerFormData = {
  full_name: '',
  email: '',
  phone: '',
  line_id: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  relationship_level: 'new',
  preferred_contact_method: 'phone',
  tags: [],
  source: undefined,
  source_other: '',
  birthday: '',
  company_name: '',
  tax_id: '',
  notes: '',
}

export function CustomerFormSheet({
  open,
  onOpenChange,
  onSuccess,
  customer = null,
}: CustomerFormSheetProps) {
  const isEditMode = !!customer

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(isEditMode ? customerUpdateSchema : customerCreateSchema),
    defaultValues: defaultFormValues,
  })

  // Reset form when sheet opens with customer data
  useEffect(() => {
    if (open) {
      if (customer) {
        form.reset({
          full_name: customer.full_name || '',
          email: customer.email || '',
          phone: customer.phone || '',
          line_id: customer.line_id || '',
          address: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          zip_code: customer.zip_code || '',
          relationship_level: customer.relationship_level || 'new',
          preferred_contact_method: customer.preferred_contact_method || 'phone',
          tags: customer.tags || [],
          source: customer.source || undefined,
          source_other: customer.source_other || '',
          birthday: customer.birthday || '',
          company_name: customer.company_name || '',
          tax_id: customer.tax_id || '',
          notes: customer.notes || '',
        })
      } else {
        form.reset(defaultFormValues)
      }
    }
  }, [open, customer, form])

  const onSubmit = async (data: CustomerFormData) => {
    try {
      // Clean up form data - convert empty strings to null for optional fields
      const cleanedData = {
        ...data,
        line_id: data.line_id || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        source: data.source || null,
        source_other: data.source_other || null,
        birthday: data.birthday || null,
        company_name: data.company_name || null,
        tax_id: data.tax_id || null,
        notes: data.notes || null,
        tags: data.tags && data.tags.length > 0 ? data.tags : null,
      }

      if (isEditMode && customer) {
        const { error } = await supabase
          .from('customers')
          .update(cleanedData)
          .eq('id', customer.id)

        if (error) throw error

        toast.success('Customer updated successfully')
      } else {
        const { error } = await supabase.from('customers').insert(cleanedData)

        if (error) throw error

        toast.success('Customer created successfully')
      }

      form.reset(defaultFormValues)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('Error saving customer', { error, isEditMode }, { context: 'CustomerFormSheet' })
      const errorMessage = mapErrorToUserMessage(error, 'customer')
      toast.error(errorMessage.title, { description: errorMessage.description })
    }
  }

  const handleClose = () => {
    form.reset(defaultFormValues)
    onOpenChange(false)
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={(o) => !o && handleClose()}
      title={isEditMode ? 'Edit Customer' : 'New Customer'}
      size="lg"
    >
      <div className="flex flex-col h-full">
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-20">
            {/* Basic Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  {...form.register('full_name')}
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
                  aria-invalid={!!form.formState.errors.email}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...form.register('phone')}
                  placeholder="0812345678"
                  aria-invalid={!!form.formState.errors.phone}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="line_id">LINE ID</Label>
                <Input
                  id="line_id"
                  {...form.register('line_id')}
                  placeholder="@username"
                />
                {form.formState.errors.line_id && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.line_id.message}
                  </p>
                )}
              </div>
            </div>

            {/* Relationship & Contact Section */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Relationship & Contact Preferences</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="relationship_level">Relationship Level</Label>
                  <Controller
                    name="relationship_level"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New Customer</SelectItem>
                          <SelectItem value="regular">Regular Customer</SelectItem>
                          <SelectItem value="vip">VIP Customer</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferred_contact_method">Preferred Contact</Label>
                  <Controller
                    name="preferred_contact_method"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="line">LINE</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source">How did they find us?</Label>
                  <Controller
                    name="source"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="google">Google Search</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="walk-in">Walk-in</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    {...form.register('birthday')}
                  />
                  {form.formState.errors.birthday && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.birthday.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Show additional input when "Other" is selected */}
              {form.watch('source') === 'other' && (
                <div className="space-y-2">
                  <Label htmlFor="source_other">Please specify</Label>
                  <Input
                    id="source_other"
                    placeholder="How did they find us?"
                    {...form.register('source_other')}
                  />
                  {form.formState.errors.source_other && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.source_other.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Tags Section */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-tinedy-blue" />
                <Label htmlFor="tags">Customer Tags</Label>
              </div>
              <Controller
                name="tags"
                control={form.control}
                render={({ field }) => (
                  <TagInput
                    tags={field.value || []}
                    onChange={field.onChange}
                    suggestions={[...CUSTOMER_TAG_SUGGESTIONS]}
                    getTagColor={getTagColor}
                  />
                )}
              />
            </div>

            {/* Corporate Information (Optional) */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Corporate Information (Optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    {...form.register('company_name')}
                    placeholder="ABC Company Ltd."
                  />
                  {form.formState.errors.company_name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.company_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_id">Tax ID</Label>
                  <Input
                    id="tax_id"
                    {...form.register('tax_id')}
                    placeholder="0-0000-00000-00-0"
                  />
                  {form.formState.errors.tax_id && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.tax_id.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Address Information</h3>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  {...form.register('address')}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    {...form.register('city')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Province</Label>
                  <Input
                    id="state"
                    {...form.register('state')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">Zip Code</Label>
                  <Input
                    id="zip_code"
                    {...form.register('zip_code')}
                    placeholder="10110"
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="border-t pt-4 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Add any additional notes about this customer..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {form.formState.errors.notes && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.notes.message}
                </p>
              )}
            </div>
          </div>

          {/* Sticky footer */}
          <div className="sticky bottom-0 bg-background border-t pt-4 pb-6 flex gap-2 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={form.formState.isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-tinedy-blue"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? (isEditMode ? 'Saving...' : 'Creating...')
                : (isEditMode ? 'Save Changes' : 'Create Customer')}
            </Button>
          </div>
        </form>
      </div>
    </AppSheet>
  )
}
