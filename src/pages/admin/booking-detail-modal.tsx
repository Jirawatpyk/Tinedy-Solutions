import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User, Users, Mail, MapPin, Clock, Edit, Send, Trash2, CreditCard } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { sendBookingReminder } from '@/lib/email'
import { useToast } from '@/hooks/use-toast'

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  address: string
  staff_id: string | null
  team_id: string | null
  service_package_id: string
  payment_status?: string
  payment_method?: string
  amount_paid?: number
  payment_date?: string
  payment_notes?: string
  customers: { full_name: string; email: string } | null
  service_packages: { name: string; service_type: string } | null
  profiles: { full_name: string } | null
  teams: { name: string } | null
}

interface BookingDetailModalProps {
  booking: Booking | null
  isOpen: boolean
  onClose: () => void
  onEdit: (booking: Booking) => void
  onDelete: (bookingId: string) => void
  onStatusChange: (bookingId: string, currentStatus: string, newStatus: string) => void
  onMarkAsPaid: (bookingId: string, method: string) => void
  getStatusBadge: (status: string) => React.ReactNode
  getPaymentStatusBadge: (status?: string) => React.ReactNode
  getAvailableStatuses: (currentStatus: string) => string[]
  getStatusLabel: (status: string) => string
}

export function BookingDetailModal({
  booking,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onMarkAsPaid,
  getStatusBadge,
  getPaymentStatusBadge,
  getAvailableStatuses,
  getStatusLabel,
}: BookingDetailModalProps) {
  const [sendingReminder, setSendingReminder] = useState(false)
  const { toast } = useToast()

  const handleSendReminder = async () => {
    if (!booking || !booking.customers) return

    setSendingReminder(true)

    try {
      const result = await sendBookingReminder({
        customerName: booking.customers.full_name,
        customerEmail: booking.customers.email,
        serviceName: booking.service_packages?.name || 'Service',
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        location: booking.address,
      })

      if (result.success) {
        toast({
          title: 'Reminder Sent!',
          description: `Email sent to ${booking.customers.email}`,
        })
      } else {
        throw new Error(result.error || 'Failed to send reminder')
      }
    } catch (error) {
      toast({
        title: 'Failed to Send Reminder',
        description: error instanceof Error ? error.message : 'An error occurred while sending the email',
        variant: 'destructive',
      })
    } finally {
      setSendingReminder(false)
    }
  }

  if (!booking) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
          <DialogDescription>
            View and manage booking information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-tinedy-blue" />
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{booking.customers?.full_name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {booking.customers?.email || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Service Info */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold text-lg">Service Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Service Package</Label>
                <p className="font-medium">{booking.service_packages?.name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Service Type</Label>
                <Badge variant="outline">{booking.service_packages?.service_type || 'N/A'}</Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Price</Label>
                <p className="font-semibold text-tinedy-blue text-lg">
                  {formatCurrency(Number(booking.total_price))}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">{getStatusBadge(booking.status)}</div>
              </div>
            </div>
          </div>

          {/* Schedule Info */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-tinedy-blue" />
              Schedule
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Date</Label>
                <p className="font-medium">{formatDate(booking.booking_date)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Time</Label>
                <p className="font-medium">
                  {booking.start_time} - {booking.end_time}
                </p>
              </div>
            </div>
          </div>

          {/* Location Info */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-tinedy-blue" />
              Location
            </h3>
            <p className="text-sm">{booking.address}</p>
          </div>

          {/* Assignment Info */}
          {(booking.profiles || booking.teams) && (
            <div className="space-y-3 border-b pb-4">
              <h3 className="font-semibold text-lg">Assignment</h3>
              <div className="grid grid-cols-2 gap-4">
                {booking.profiles && (
                  <div>
                    <Label className="text-muted-foreground">Assigned Staff</Label>
                    <p className="font-medium flex items-center gap-1">
                      <User className="h-3 w-3 text-tinedy-blue" />
                      {booking.profiles.full_name}
                    </p>
                  </div>
                )}
                {booking.teams && (
                  <div>
                    <Label className="text-muted-foreground">Assigned Team</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Users className="h-3 w-3 text-tinedy-green" />
                      {booking.teams.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-tinedy-blue" />
              Payment Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Payment Status</Label>
                <div className="mt-1">{getPaymentStatusBadge(booking.payment_status)}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Amount Paid</Label>
                <p className="font-semibold text-green-600 text-lg">
                  {formatCurrency(Number(booking.amount_paid || 0))}
                </p>
              </div>
              {booking.payment_method && (
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-medium capitalize">{booking.payment_method.replace('_', ' ')}</p>
                </div>
              )}
              {booking.payment_date && (
                <div>
                  <Label className="text-muted-foreground">Payment Date</Label>
                  <p className="font-medium">{formatDate(booking.payment_date)}</p>
                </div>
              )}
            </div>
            {booking.payment_status !== 'paid' && (
              <div className="mt-3">
                <Select onValueChange={(method) => onMarkAsPaid(booking.id, method)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Mark as Paid" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="line_pay">LINE Pay</SelectItem>
                    <SelectItem value="promptpay">PromptPay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <Button
                variant="outline"
                onClick={() => onEdit(booking)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleSendReminder}
                disabled={sendingReminder || !booking.customers?.email}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingReminder ? 'Sending...' : 'Reminder'}
              </Button>
              <Select
                value={booking.status}
                onValueChange={(value) => {
                  onStatusChange(booking.id, booking.status, value)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableStatuses(booking.status).map((status) => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete(booking.id)
                  onClose()
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
