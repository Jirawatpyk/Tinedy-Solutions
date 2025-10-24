import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StaffAvailabilityModal } from './staff-availability-modal'
import { useServicePackages } from '@/hooks/use-service-packages'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

export function QuickAvailabilityCheck() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Form state
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('11:00')
  const [servicePackageId, setServicePackageId] = useState('')
  const [assignmentType, setAssignmentType] = useState<'individual' | 'team'>('individual')

  const { servicePackages } = useServicePackages()
  const selectedService = servicePackages.find((s: { id: string }) => s.id === servicePackageId)

  // Auto-calculate end time when service or start time changes
  useEffect(() => {
    if (selectedService?.duration_minutes && startTime) {
      const calculateEndTime = (start: string, durationMinutes: number): string => {
        const [hours, minutes] = start.split(':').map(Number)
        const totalMinutes = hours * 60 + minutes + durationMinutes
        const endHours = Math.floor(totalMinutes / 60) % 24
        const endMinutes = totalMinutes % 60
        return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
      }

      const calculatedEndTime = calculateEndTime(startTime, selectedService.duration_minutes)
      setEndTime(calculatedEndTime)
    }
  }, [selectedService, startTime])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Reset when closing
      setShowResults(false)
    }
  }

  const handleCheckAvailability = () => {
    if (!servicePackageId || !date || !startTime || !endTime) {
      return
    }
    setShowResults(true)
    setIsOpen(false)
  }

  return (
    <>
      {/* Quick Access Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <CalendarCheck className="h-4 w-4" />
        <span className="hidden xl:inline">Check Availability</span>
      </Button>

      {/* Step 1: Input Dialog */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Quick Availability Check
            </DialogTitle>
            <DialogDescription>
              Check which staff or teams are available for a booking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time (Auto-calculated)</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>
            </div>

            {/* Service Package */}
            <div className="space-y-2">
              <Label htmlFor="service">Service Package</Label>
              <Select value={servicePackageId} onValueChange={setServicePackageId}>
                <SelectTrigger id="service">
                  <SelectValue placeholder="Select a service..." />
                </SelectTrigger>
                <SelectContent>
                  {servicePackages.map((service: { id: string; name: string; price: number }) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - ฿{service.price.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignment Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Assignment Type</Label>
              <Select
                value={assignmentType}
                onValueChange={(value) => setAssignmentType(value as 'individual' | 'team')}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual Staff</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCheckAvailability}
              disabled={!servicePackageId || !date || !startTime || !endTime}
            >
              Check Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 2: Results Modal (reuse existing StaffAvailabilityModal) */}
      {showResults && servicePackageId && (
        <StaffAvailabilityModal
          isOpen={showResults}
          onClose={() => setShowResults(false)}
          assignmentType={assignmentType}
          onSelectStaff={(staffId) => {
            // Navigate to bookings page and trigger create modal with prefilled data
            setShowResults(false)
            setIsOpen(false)

            // Show success message
            toast({
              title: 'Staff Selected',
              description: 'Redirecting to create booking...',
            })

            // Navigate with state
            navigate('/admin/bookings', {
              state: {
                createBooking: true,
                prefilledData: {
                  booking_date: date,
                  start_time: startTime,
                  end_time: endTime,
                  service_package_id: servicePackageId,
                  staff_id: staffId,
                  team_id: '',
                  total_price: selectedService?.price || 0
                }
              }
            })
          }}
          onSelectTeam={(teamId) => {
            // Navigate to bookings page and trigger create modal with prefilled data
            setShowResults(false)
            setIsOpen(false)

            // Show success message
            toast({
              title: 'Team Selected',
              description: 'Redirecting to create booking...',
            })

            // Navigate with state
            navigate('/admin/bookings', {
              state: {
                createBooking: true,
                prefilledData: {
                  booking_date: date,
                  start_time: startTime,
                  end_time: endTime,
                  service_package_id: servicePackageId,
                  staff_id: '',
                  team_id: teamId,
                  total_price: selectedService?.price || 0
                }
              }
            })
          }}
          date={date}
          startTime={startTime}
          endTime={endTime}
          servicePackageId={servicePackageId}
          servicePackageName={selectedService?.name}
        />
      )}
    </>
  )
}
