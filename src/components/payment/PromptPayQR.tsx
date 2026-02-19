import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { useSettings } from '@/hooks/use-settings'
import { supabase } from '@/lib/supabase'
import { Loader2, AlertCircle, Upload, Image as ImageIcon, X, CheckCircle2 } from 'lucide-react'
import { formatCurrency, getBangkokDateString } from '@/lib/utils'
import generatePayload from 'promptpay-qr'
import { toDataURL } from 'qrcode'

interface PromptPayQRProps {
  amount: number
  bookingId: string
  recurringGroupId?: string
  onSuccess?: () => void
}

export function PromptPayQR({ amount, bookingId, recurringGroupId, onSuccess }: PromptPayQRProps) {
  const [qrCode, setQrCode] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Slip upload states
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { settings, loading: settingsLoading } = useSettings()

  const generateQRCode = useCallback(async () => {
    // Wait for settings to load
    if (settingsLoading) return

    try {
      setLoading(true)
      setError('')

      // PromptPay ID จาก settings (fallback to env for backwards compatibility)
      const promptPayId = settings?.promptpay_id || import.meta.env.VITE_PROMPTPAY_ID || '0000000000'

      // Generate PromptPay payload
      const payload = generatePayload(promptPayId, { amount })

      // Generate QR code image
      const qrImage = await toDataURL(payload, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })

      setQrCode(qrImage)
    } catch (err) {
      console.error('Error generating QR code:', err)
      setError('Failed to generate QR code. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [amount, settings?.promptpay_id, settingsLoading])

  useEffect(() => {
    generateQRCode()
  }, [generateQRCode])

  // Slip upload handlers
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
        payment_method: 'promptpay',
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
          await supabase.functions.invoke('send-payment-confirmation', {
            body: { bookingId }
          })
        } catch (emailError) {
          console.warn('Failed to send confirmation email:', emailError)
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

      // Navigate to success page if auto-verified
      if (autoVerify) {
        setTimeout(() => {
          onSuccess?.()
        }, 2000)
      }
    } catch (error) {
      console.error('Error uploading slip:', error)
      toast.error('Upload failed', {
        description: 'Failed to upload payment slip. Please try again.',
      })
    } finally {
      setUploading(false)
    }
  }

  // Success state after upload
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

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-sm text-muted-foreground">Generating QR Code...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">PromptPay Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount Display */}
        <div className="text-center py-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
          <p className="text-3xl font-bold text-blue-600">
            {formatCurrency(amount)}
          </p>
        </div>

        {/* QR Code */}
        {qrCode && (
          <div className="flex justify-center">
            <div className="p-4 bg-white border-2 border-tinedy-dark/10 rounded-lg">
              <img
                src={qrCode}
                alt="PromptPay QR Code"
                className="w-64 h-64"
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-tinedy-dark">How to Pay:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Open your mobile banking app</li>
            <li>Select "Scan QR" or "PromptPay"</li>
            <li>Scan the QR code above</li>
            <li>Confirm the payment</li>
            <li className="text-blue-600 font-medium">Upload payment slip below</li>
          </ol>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-tinedy-dark/10 dark:border-tinedy-dark/70" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white dark:bg-card px-4 text-muted-foreground dark:text-muted-foreground">After payment, upload slip</span>
          </div>
        </div>

        {/* Slip Upload Section */}
        <div className="space-y-4">
          <p className="text-sm font-semibold text-tinedy-dark">Upload Payment Slip</p>

          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-tinedy-dark/20 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                  <Upload className="h-6 w-6 text-blue-600" />
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
                className="w-full max-h-64 object-contain rounded-lg"
              />
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                <span className="truncate">{file?.name}</span>
              </div>
            </div>
          )}

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
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          )}
        </div>

        {/* Note */}
        <Alert>
          <AlertDescription className="text-xs">
            <strong>Note:</strong> Please upload your payment slip after completing the transfer.
            This helps us verify your payment faster.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
