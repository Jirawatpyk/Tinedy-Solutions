import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useSettings } from '@/hooks/use-settings'
import { supabase } from '@/lib/supabase'
import { Upload, Image as ImageIcon, X, Loader2, CheckCircle2 } from 'lucide-react'
import { formatCurrency, getBangkokDateString } from '@/lib/utils'

interface SlipUploadProps {
  bookingId: string
  amount: number
  recurringGroupId?: string
  onSuccess?: () => void
}

export function SlipUpload({ bookingId, amount, recurringGroupId, onSuccess }: SlipUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { settings, loading: settingsLoading } = useSettings()

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please upload an image file (JPG, PNG, etc.)',
      })
      return
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Please upload an image smaller than 5MB',
      })
      return
    }

    setFile(selectedFile)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }

  function handleRemoveFile() {
    setFile(null)
    setPreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleUpload() {
    if (!file) return

    try {
      setUploading(true)

      // Check if auto-verify is enabled
      const autoVerify = import.meta.env.VITE_AUTO_VERIFY_PAYMENT === 'true'

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${bookingId}_${Date.now()}.${fileExt}`
      const filePath = `payment-slips/${fileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-slips')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        // Check if bucket exists
        if (uploadError.message.includes('not found')) {
          throw new Error('Storage bucket not configured. Please contact support.')
        }
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-slips')
        .getPublicUrl(uploadData.path)

      // Determine payment status based on auto-verify setting
      const newPaymentStatus = autoVerify ? 'paid' : 'pending_verification'
      const paymentDate = getBangkokDateString()

      const updateData = {
        payment_slip_url: publicUrl,
        payment_status: newPaymentStatus,
        payment_method: 'transfer',
        ...(autoVerify && { payment_date: paymentDate }),
      }

      // ✅ ถ้าเป็น recurring booking ให้อัปเดตทั้ง group
      let bookingCount = 1
      if (recurringGroupId) {
        const { error: updateError } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('recurring_group_id', recurringGroupId)

        if (updateError) throw updateError

        // นับจำนวน booking ที่อัปเดต
        const { count } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('recurring_group_id', recurringGroupId)

        bookingCount = count || 1
      } else {
        // ✅ ถ้าเป็น single booking อัปเดตแค่ตัวเดียว
        const { error: updateError } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', bookingId)

        if (updateError) throw updateError
      }

      // Send payment confirmation email if auto-verified
      if (autoVerify) {
        try {
          // ✅ ทั้ง single และ recurring ให้ส่ง Payment Confirmation
          await supabase.functions.invoke('send-payment-confirmation', {
            body: { bookingId }
          })
        } catch (emailError) {
          console.warn('Failed to send confirmation email:', emailError)
          // Don't throw - payment is still successful
        }
      }

      setUploaded(true)

      const successMessage = recurringGroupId
        ? autoVerify
          ? `Payment confirmed for ${bookingCount} recurring bookings! You will receive a confirmation email shortly.`
          : `Payment slip uploaded for ${bookingCount} recurring bookings. We will verify your payment soon.`
        : autoVerify
          ? 'Payment confirmed! You will receive a confirmation email shortly.'
          : 'Payment slip uploaded successfully. We will verify your payment soon.'

      toast.success(autoVerify ? 'Payment Confirmed!' : 'Slip Uploaded!', {
        description: successMessage,
      })

      // Only navigate to success page if auto-verified (payment is complete)
      // If pending verification, stay on upload success screen
      if (autoVerify) {
        setTimeout(() => {
          onSuccess?.()
        }, 2000)
      }
    } catch (error) {
      console.error('Error uploading slip:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Upload failed', {
        description: message.includes('bucket') || message.includes('storage')
          ? 'Storage not configured. Please contact support.'
          : message.includes('constraint') || message.includes('violates')
            ? 'Database constraint error. Please contact support.'
            : `Failed to upload payment slip. ${message}`,
      })
    } finally {
      setUploading(false)
    }
  }

  if (uploaded) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-tinedy-dark mb-2">
              Payment Slip Uploaded!
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              We will verify your payment within 24 hours. You will receive a confirmation once verified.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Bank Transfer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount Display */}
        <div className="text-center py-4 bg-green-50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Amount to Transfer</p>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(amount)}
          </p>
        </div>

        {/* Bank Details - Dynamic from settings */}
        <Alert>
          <AlertDescription>
            <p className="font-semibold mb-2">Bank Transfer Details:</p>
            {settingsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                <p><strong>Bank:</strong> {settings?.bank_name || 'ธนาคารกสิกรไทย (KBANK)'}</p>
                <p><strong>Account Name:</strong> {settings?.bank_account_name || 'Tinedy Solutions'}</p>
                <p><strong>Account Number:</strong> {settings?.bank_account_number || 'XXX-X-XXXXX-X'}</p>
                <p><strong>Amount:</strong> {formatCurrency(amount)}</p>
              </div>
            )}
          </AlertDescription>
        </Alert>

        {/* File Upload Area */}
        <div className="space-y-4">
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-tinedy-dark/20 rounded-lg p-8 text-center cursor-pointer hover:border-tinedy-dark/30 transition-colors"
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-tinedy-dark mb-1">
                  Click to upload payment slip
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG up to 5MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Upload payment slip"
              />
            </div>
          ) : (
            <div className="relative border-2 border-tinedy-dark/10 rounded-lg p-4">
              <button
                type="button"
                onClick={handleRemoveFile}
                className="absolute top-2 right-2 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
                aria-label="Remove payment slip"
              >
                <X className="h-4 w-4 text-red-600" />
              </button>
              <img
                src={preview}
                alt="Payment slip preview"
                className="w-full rounded-lg"
              />
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                <span className="truncate">{file?.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Upload Button */}
        {file && (
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Slip
              </>
            )}
          </Button>
        )}

        {/* Instructions */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Please ensure the slip clearly shows the transaction amount,
            date, and reference number. Uploads are typically verified within 24 hours.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
