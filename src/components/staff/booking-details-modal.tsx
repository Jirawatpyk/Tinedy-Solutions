import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  User,
  Package,
  Phone,
  Calendar,
  DollarSign,
  StickyNote,
  CheckCircle2,
  Save,
  MapPin,
  Play,
} from 'lucide-react'
import { type StaffBooking, formatFullAddress } from '@/hooks/use-staff-bookings'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { BookingTimeline } from './booking-timeline'

interface BookingDetailsModalProps {
  booking: StaffBooking | null
  open: boolean
  onClose: () => void
  onStartProgress?: (bookingId: string) => Promise<void>
  onMarkCompleted?: (bookingId: string) => Promise<void>
  onAddNotes?: (bookingId: string, notes: string) => Promise<void>
}

export function BookingDetailsModal({
  booking,
  open,
  onClose,
  onStartProgress,
  onMarkCompleted,
  onAddNotes,
}: BookingDetailsModalProps) {
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isMarking, setIsMarking] = useState(false)
  const { toast } = useToast()

  if (!booking) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'เสร็จสิ้น'
      case 'confirmed':
        return 'ยืนยันแล้ว'
      case 'in_progress':
        return 'กำลังดำเนินการ'
      case 'pending':
        return 'รอยืนยัน'
      case 'cancelled':
        return 'ยกเลิก'
      default:
        return status
    }
  }

  const handleSaveNotes = async () => {
    if (!onAddNotes || !notes.trim()) return

    try {
      setIsSaving(true)
      await onAddNotes(booking.id, notes.trim())
      toast({
        title: 'บันทึกสำเร็จ',
        description: 'บันทึกหมายเหตุเรียบร้อยแล้ว',
      })
      setNotes('')
      onClose()
    } catch {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกหมายเหตุได้',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartProgress = async () => {
    if (!onStartProgress) return

    try {
      setIsStarting(true)
      await onStartProgress(booking.id)
      toast({
        title: 'เริ่มดำเนินการ',
        description: 'เริ่มดำเนินการเรียบร้อยแล้ว',
      })
      onClose()
    } catch {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเริ่มดำเนินการได้',
        variant: 'destructive',
      })
    } finally {
      setIsStarting(false)
    }
  }

  const handleMarkCompleted = async () => {
    if (!onMarkCompleted) return

    try {
      setIsMarking(true)
      await onMarkCompleted(booking.id)
      toast({
        title: 'เสร็จสิ้น',
        description: 'ทำเครื่องหมายเสร็จสิ้นเรียบร้อยแล้ว',
      })
      onClose()
    } catch {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถทำเครื่องหมายเสร็จสิ้นได้',
        variant: 'destructive',
      })
    } finally {
      setIsMarking(false)
    }
  }

  const canStartProgress = booking.status === 'confirmed'
  const canMarkCompleted = booking.status === 'in_progress'

  // Format time to remove seconds (HH:MM:SS -> HH:MM)
  const formatTime = (time: string) => {
    return time.split(':').slice(0, 2).join(':')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>รายละเอียดการจอง</span>
            <Badge className={getStatusColor(booking.status)} variant="outline">
              {getStatusText(booking.status)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            รหัสการจอง: {booking.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>วันที่</span>
              </div>
              <p className="font-medium">
                {format(new Date(booking.booking_date), 'dd MMMM yyyy', { locale: th })}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>เวลา</span>
              </div>
              <p className="font-medium">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
            </div>
          </div>

          <Separator />

          {/* Customer Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              ข้อมูลลูกค้า
            </h3>
            <div className="space-y-2 ml-6">
              <div>
                <p className="text-sm text-muted-foreground">ชื่อ</p>
                <p className="font-medium">
                  {booking.customers?.full_name || 'Unknown Customer'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">เบอร์โทร</p>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  {booking.customers?.phone || 'ไม่มีข้อมูล'}
                </p>
              </div>
              {booking.address && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">ที่อยู่</p>
                  <p className="font-medium flex items-start gap-2">
                    <MapPin className="h-3 w-3 mt-1 flex-shrink-0" />
                    <span>{formatFullAddress(booking)}</span>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const fullAddress = formatFullAddress(booking)
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
                        '_blank'
                      )
                    }}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    เปิดแผนที่
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Service Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              ข้อมูลบริการ
            </h3>
            <div className="space-y-2 ml-6">
              <div>
                <p className="text-sm text-muted-foreground">ชื่อบริการ</p>
                <p className="font-medium">
                  {booking.service_packages?.name || 'Unknown Service'}
                </p>
              </div>
              {booking.service_packages?.duration_minutes && (
                <div>
                  <p className="text-sm text-muted-foreground">ระยะเวลา</p>
                  <p className="font-medium">{booking.service_packages.duration_minutes} นาที</p>
                </div>
              )}
              {booking.service_packages?.price && (
                <div>
                  <p className="text-sm text-muted-foreground">ราคา</p>
                  <p className="font-medium flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {booking.service_packages.price.toLocaleString()} บาท
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Existing Notes */}
          {booking.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  หมายเหตุปัจจุบัน
                </h3>
                <div className="ml-6 p-3 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
                </div>
              </div>
            </>
          )}

          {/* Timeline */}
          <Separator />
          <BookingTimeline bookingId={booking.id} />

          {/* Add/Update Notes */}
          {onAddNotes && booking.status !== 'cancelled' && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  {booking.notes ? 'อัปเดตหมายเหตุ' : 'เพิ่มหมายเหตุ'}
                </Label>
                <Textarea
                  id="notes"
                  placeholder="เพิ่มหมายเหตุเกี่ยวกับการจองนี้..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              ปิด
            </Button>
            {notes.trim() && onAddNotes && (
              <Button
                onClick={handleSaveNotes}
                disabled={isSaving}
                variant="secondary"
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกหมายเหตุ'}
              </Button>
            )}
            {canStartProgress && onStartProgress && (
              <Button
                onClick={handleStartProgress}
                disabled={isStarting}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <Play className="h-4 w-4 mr-2" />
                {isStarting ? 'กำลังบันทึก...' : 'เริ่มดำเนินการ'}
              </Button>
            )}
            {canMarkCompleted && onMarkCompleted && (
              <Button
                onClick={handleMarkCompleted}
                disabled={isMarking}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isMarking ? 'กำลังบันทึก...' : 'ทำเครื่องหมายเสร็จสิ้น'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
