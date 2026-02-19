/**
 * PaymentSettingsForm Component
 *
 * Form for managing payment settings
 * - Bank Transfer: Bank name, account name, account number
 * - PromptPay: PromptPay ID (phone or national ID)
 * - Used for payment slip upload page and PromptPay QR
 */

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { CreditCard, Save } from 'lucide-react'

// Validation schema
const PaymentSettingsSchema = z.object({
  bank_name: z.string().min(1, 'Bank name is required'),
  bank_account_name: z.string().min(1, 'Account name is required'),
  bank_account_number: z.string().min(1, 'Account number is required'),
  promptpay_id: z.string().min(1, 'PromptPay ID is required'),
})

type PaymentSettingsFormData = z.infer<typeof PaymentSettingsSchema>

interface PaymentSettingsFormProps {
  initialData?: Partial<PaymentSettingsFormData>
  settingsId?: string
  onSuccess?: () => void
}

export function PaymentSettingsForm({ initialData, settingsId, onSuccess }: PaymentSettingsFormProps) {
  const form = useForm<PaymentSettingsFormData>({
    resolver: zodResolver(PaymentSettingsSchema),
    defaultValues: {
      bank_name: initialData?.bank_name || 'ธนาคารกสิกรไทย (KBANK)',
      bank_account_name: initialData?.bank_account_name || 'Tinedy Solutions',
      bank_account_number: initialData?.bank_account_number || 'XXX-X-XXXXX-X',
      promptpay_id: initialData?.promptpay_id || 'XXXXXXXXXX',
    },
  })

  const onSubmit = async (data: PaymentSettingsFormData) => {
    try {
      const { error } = await supabase
        .from('settings')
        .update(data)
        .eq('id', settingsId)

      if (error) throw error

      toast.success('Payment settings saved successfully')

      onSuccess?.()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'general')
      toast.error(errorMsg.title, { description: errorMsg.description })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Settings
        </CardTitle>
        <CardDescription>
          Configure payment methods for customer transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* PromptPay Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-tinedy-dark border-b pb-2">PromptPay</h3>
            <div className="space-y-2">
              <Label htmlFor="promptpay_id">PromptPay ID *</Label>
              <Controller
                name="promptpay_id"
                control={form.control}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      id="promptpay_id"
                      placeholder="Phone number or National ID"
                      {...field}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use phone number (10 digits) or National ID (13 digits)
                    </p>
                    {fieldState.error && (
                      <p className="text-sm text-red-500">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>
          </div>

          {/* Bank Transfer Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-tinedy-dark border-b pb-2">Bank Transfer</h3>

            {/* Bank Name */}
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name *</Label>
              <Controller
                name="bank_name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      id="bank_name"
                      placeholder="ธนาคารกสิกรไทย (KBANK)"
                      {...field}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-500">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            {/* Account Name */}
            <div className="space-y-2">
              <Label htmlFor="bank_account_name">Account Name *</Label>
              <Controller
                name="bank_account_name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      id="bank_account_name"
                      placeholder="Tinedy Solutions"
                      {...field}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-500">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="bank_account_number">Account Number *</Label>
              <Controller
                name="bank_account_number"
                control={form.control}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      id="bank_account_number"
                      placeholder="XXX-X-XXXXX-X"
                      {...field}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-500">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="bg-tinedy-blue hover:bg-tinedy-blue/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
