import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Plus, Trash2, Clock } from 'lucide-react'

interface StaffAvailability {
  id: string
  staff_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
  notes: string | null
}

interface Staff {
  id: string
  full_name: string
  email: string
  role: string
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

// Helper function to get current week dates
const getCurrentWeekDates = () => {
  const today = new Date()
  const currentDay = today.getDay() // 0 = Sunday
  const dates = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() - currentDay + i)
    dates.push(date)
  }

  return dates
}

const TIME_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
]

export function AdminStaffAvailability() {
  const [staffMembers, setStaffMembers] = useState<Staff[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [availability, setAvailability] = useState<StaffAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [weekDates, setWeekDates] = useState<Date[]>([])
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
    notes: '',
  })
  const { toast } = useToast()

  const fetchStaffMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name')

      if (error) throw error
      setStaffMembers(data || [])

      // Auto-select first staff member
      if (data && data.length > 0) {
        setSelectedStaff(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
      toast({
        title: 'Error',
        description: 'Failed to load staff members',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchAvailability = useCallback(async () => {
    if (!selectedStaff) return

    try {
      const { data, error } = await supabase
        .from('staff_availability')
        .select('*')
        .eq('staff_id', selectedStaff)
        .order('day_of_week')
        .order('start_time')

      if (error) throw error
      setAvailability(data || [])
    } catch (error) {
      console.error('Error fetching availability:', error)
      toast({
        title: 'Error',
        description: 'Failed to load availability',
        variant: 'destructive',
      })
    }
  }, [selectedStaff, toast])

  useEffect(() => {
    fetchStaffMembers()
    setWeekDates(getCurrentWeekDates())
  }, [fetchStaffMembers])

  useEffect(() => {
    if (selectedStaff) {
      fetchAvailability()
    }
  }, [selectedStaff, fetchAvailability])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStaff) {
      toast({
        title: 'Error',
        description: 'Please select a staff member',
        variant: 'destructive',
      })
      return
    }

    if (selectedDays.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one day',
        variant: 'destructive',
      })
      return
    }

    try {
      // Create availability records for each selected day
      const records = selectedDays.map((day) => ({
        staff_id: selectedStaff,
        day_of_week: day,
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes || null,
        is_available: true,
      }))

      const { error } = await supabase.from('staff_availability').insert(records)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Availability added for ${selectedDays.length} day${selectedDays.length > 1 ? 's' : ''}`,
      })
      setIsDialogOpen(false)
      resetForm()
      fetchAvailability()
    } catch (error) {
      const dbError = error as { message?: string }
      toast({
        title: 'Error',
        description: dbError.message || 'Failed to add availability',
        variant: 'destructive',
      })
    }
  }

  const deleteAvailability = async (id: string) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) return

    try {
      const { error } = await supabase
        .from('staff_availability')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Availability deleted successfully',
      })
      fetchAvailability()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete availability',
        variant: 'destructive',
      })
    }
  }

  const resetForm = () => {
    setSelectedDays([])
    setFormData({
      start_time: '',
      end_time: '',
      notes: '',
    })
  }

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const getAvailabilityForDayAndTime = (day: number, time: string) => {
    return availability.find(
      (avail) =>
        avail.day_of_week === day &&
        avail.start_time <= time &&
        avail.end_time > time &&
        avail.is_available
    )
  }

  const selectedStaffData = staffMembers.find((s) => s.id === selectedStaff)

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>

        {/* Staff selector skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 flex-1 max-w-md" />
            </div>
          </CardContent>
        </Card>

        {/* Calendar grid skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Table header */}
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 flex-1" />
                ))}
              </div>
              {/* Table rows */}
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-12 w-20" />
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Skeleton key={j} className="h-12 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Availability slots skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-tinedy-dark">
            Staff Availability
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage staff work schedules and availability
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-tinedy-blue hover:bg-tinedy-blue/90"
              onClick={resetForm}
              disabled={!selectedStaff}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Availability
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Availability Slot</DialogTitle>
              <DialogDescription>
                Set available hours for {selectedStaffData?.full_name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Select Days *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant={selectedDays.includes(index) ? 'default' : 'outline'}
                      className={`w-full ${
                        selectedDays.includes(index)
                          ? 'bg-tinedy-blue hover:bg-tinedy-blue/90'
                          : ''
                      }`}
                      onClick={() => toggleDay(index)}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
                {selectedDays.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedDays.length} day{selectedDays.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Select
                    value={formData.start_time}
                    onValueChange={(value) =>
                      setFormData({ ...formData, start_time: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Start" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time *</Label>
                  <Select
                    value={formData.end_time}
                    onValueChange={(value) =>
                      setFormData({ ...formData, end_time: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="End" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="e.g., Lunch break, Preferred hours..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-tinedy-blue">
                  Add Availability
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="staff_select" className="whitespace-nowrap">
              Select Staff:
            </Label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Choose staff member" />
              </SelectTrigger>
              <SelectContent>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.full_name} - {staff.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Availability Schedule
            {selectedStaffData && (
              <span className="text-sm font-normal text-muted-foreground">
                - {selectedStaffData.full_name}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium text-sm text-muted-foreground sticky left-0 bg-background">
                    Time
                  </th>
                  {DAYS_OF_WEEK.map((day, index) => {
                    const date = weekDates[index]
                    const dateStr = date
                      ? date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : ''
                    return (
                      <th
                        key={index}
                        className="text-center p-2 font-medium text-sm text-muted-foreground min-w-[100px]"
                      >
                        <div>{day}</div>
                        <div className="text-xs text-tinedy-blue font-semibold">
                          {dateStr}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((time) => (
                  <tr key={time} className="border-b hover:bg-accent/20">
                    <td className="p-2 text-sm font-medium sticky left-0 bg-background">
                      {time}
                    </td>
                    {DAYS_OF_WEEK.map((_, dayIndex) => {
                      const avail = getAvailabilityForDayAndTime(dayIndex, time)
                      return (
                        <td
                          key={dayIndex}
                          className={`p-1 text-center ${
                            avail ? 'bg-tinedy-green/20' : 'bg-gray-50'
                          }`}
                        >
                          {avail && (
                            <div className="text-xs">
                              <Badge
                                variant="outline"
                                className="bg-tinedy-green/30 text-tinedy-dark border-tinedy-green"
                              >
                                Available
                              </Badge>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Availability Slots List */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Availability Slots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {availability.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No availability slots set. Click "Add Availability" to get started.
              </p>
            ) : (
              availability.map((avail) => (
                <div
                  key={avail.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Badge className="bg-tinedy-blue">
                      {DAYS_OF_WEEK[avail.day_of_week]}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {avail.start_time} - {avail.end_time}
                      </span>
                    </div>
                    {avail.notes && (
                      <span className="text-sm text-muted-foreground">
                        {avail.notes}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAvailability(avail.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
