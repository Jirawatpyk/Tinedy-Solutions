import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Upload, Image as ImageIcon, X, Loader2, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface SlipUploadProps {
  bookingId: string
  amount: number
  onSuccess?: () => void
}

export function SlipUpload({ bookingId, amount, onSuccess }: SlipUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
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

      // Update booking with slip URL and mark as pending verification
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_slip_url: publicUrl,
          payment_status: 'pending_verification',
          payment_method: 'bank_transfer',
        })
        .eq('id', bookingId)

      if (updateError) throw updateError

      setUploaded(true)

      toast({
        title: 'Success!',
        description: 'Payment slip uploaded successfully. We will verify your payment soon.',
      })

      // Call success callback after 2 seconds
      setTimeout(() => {
        onSuccess?.()
      }, 2000)
    } catch (error) {
      console.error('Error uploading slip:', error)
      toast({
        title: 'Upload failed',
        description: 'Failed to upload payment slip. Please try again.',
        variant: 'destructive',
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
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
        <CardTitle className="text-lg">Upload Payment Slip</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount Display */}
        <div className="text-center py-4 bg-green-50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Amount to Transfer</p>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(amount)}
          </p>
        </div>

        {/* Bank Details - Example */}
        <Alert>
          <AlertDescription>
            <p className="font-semibold mb-2">Bank Transfer Details:</p>
            <div className="space-y-1 text-sm">
              <p><strong>Bank:</strong> ธนาคารกสิกรไทย (KBANK)</p>
              <p><strong>Account Name:</strong> Tinedy Solutions</p>
              <p><strong>Account Number:</strong> 123-4-56789-0</p>
              <p><strong>Amount:</strong> {formatCurrency(amount)}</p>
            </div>
          </AlertDescription>
        </Alert>

        {/* File Upload Area */}
        <div className="space-y-4">
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
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
              />
            </div>
          ) : (
            <div className="relative border-2 border-gray-200 rounded-lg p-4">
              <button
                onClick={handleRemoveFile}
                className="absolute top-2 right-2 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
              >
                <X className="h-4 w-4 text-red-600" />
              </button>
              <img
                src={preview}
                alt="Payment slip preview"
                className="w-full rounded-lg"
              />
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
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
                Upload Payment Slip
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
