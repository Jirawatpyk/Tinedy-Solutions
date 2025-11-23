import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import generatePayload from 'promptpay-qr'
import { toDataURL } from 'qrcode'

interface PromptPayQRProps {
  amount: number
  bookingId: string
  recurringGroupId?: string
}

export function PromptPayQR({ amount }: PromptPayQRProps) {
  const [qrCode, setQrCode] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const generateQRCode = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      // ใส่ PromptPay ID ของคุณที่นี่ (เบอร์โทรหรือเลขบัตรประชาชน)
      const promptPayId = '0982694392' // ⚠️ เปลี่ยนเป็นเบอร์จริง

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
  }, [amount])

  useEffect(() => {
    generateQRCode()
  }, [generateQRCode])

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
        <CardTitle className="text-lg">Scan to Pay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
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
          <p className="font-semibold text-gray-900">How to Pay:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            <li>Open your mobile banking app</li>
            <li>Select "Scan QR" or "PromptPay"</li>
            <li>Scan the QR code above</li>
            <li>Confirm the payment</li>
          </ol>
        </div>

        {/* Waiting Status */}
        <Alert>
          <div className="flex items-start gap-2">
            <Loader2 className="h-4 w-4 animate-spin mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Waiting for payment...</p>
              <p className="text-sm text-muted-foreground mt-1">
                This page will automatically update once payment is confirmed
              </p>
            </div>
          </div>
        </Alert>

        {/* Alternative Option */}
        <div className="pt-4 border-t text-center">
          <p className="text-sm text-muted-foreground">
            Already paid?{' '}
            <button
              onClick={() => window.location.reload()}
              className="text-blue-600 hover:underline font-medium"
            >
              Refresh page
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
