import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Staff {
  id: string
  full_name: string
  email: string
  role: string
}

interface Team {
  id: string
  name: string
}

interface ServicePackage {
  name: string
}

interface Customer {
  full_name: string
}

interface Profile {
  full_name: string
}

interface BookingRaw {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  service_packages: ServicePackage[] | ServicePackage | null
  customers: Customer[] | Customer | null
  profiles: Profile[] | Profile | null
}

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  service_packages: ServicePackage | null
  customers: Customer | null
  profiles: Profile | null
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
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [weekDates, setWeekDates] = useState<Date[]>([])
  const { toast} = useToast()

  const fetchStaffMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name')

      if (error) throw error
      setStaffMembers(data || [])

      // Auto-select "All Staff"
      setSelectedStaff('all')
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

  const fetchTeams = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name')

      if (error) throw error
      setTeams(data || [])

      // Auto-select "All Teams"
      setSelectedTeam('all')
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive',
      })
    }
  }, [toast])

  const fetchBookings = useCallback(async () => {
    if (weekDates.length === 0) return

    try {
      // Get start and end dates of the week
      const startDate = weekDates[0].toISOString().split('T')[0]
      const endDate = weekDates[6].toISOString().split('T')[0]

      console.log('Fetching bookings for:', {
        staff_id: selectedStaff,
        startDate,
        endDate,
      })

      let query = supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          staff_id,
          team_id,
          service_packages (name),
          customers (full_name),
          profiles (full_name)
        `)
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .order('booking_date')
        .order('start_time')

      // Filter by staff if not "all"
      if (selectedStaff && selectedStaff !== 'all') {
        query = query.eq('staff_id', selectedStaff)
      }

      // Filter by team if not "all"
      if (selectedTeam && selectedTeam !== 'all') {
        query = query.eq('team_id', selectedTeam)
      }

      const { data, error } = await query

      console.log('Bookings fetched:', data)

      if (error) throw error

      // Transform data to match Booking interface
      const transformedData = (data || []).map((booking: BookingRaw): Booking => ({
        ...booking,
        service_packages: Array.isArray(booking.service_packages)
          ? booking.service_packages[0] || null
          : booking.service_packages,
        customers: Array.isArray(booking.customers)
          ? booking.customers[0] || null
          : booking.customers,
        profiles: Array.isArray(booking.profiles)
          ? booking.profiles[0] || null
          : booking.profiles,
      }))

      setBookings(transformedData)
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      })
    }
  }, [selectedStaff, selectedTeam, weekDates, toast])

  useEffect(() => {
    fetchStaffMembers()
    fetchTeams()
    setWeekDates(getCurrentWeekDates())
  }, [fetchStaffMembers, fetchTeams])

  useEffect(() => {
    fetchBookings()
  }, [selectedStaff, selectedTeam, fetchBookings])

  const getBookingsForDay = (dayIndex: number) => {
    const date = weekDates[dayIndex]
    if (!date) return []

    const dateStr = date.toISOString().split('T')[0]

    return bookings.filter((booking) => booking.booking_date === dateStr)
  }

  const calculateBookingPosition = (startTime: string, endTime: string) => {
    // Convert time to minutes from midnight
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    // Calendar starts at 08:00
    const calendarStart = 8 * 60 // 480 minutes
    const calendarEnd = 20 * 60 // 1200 minutes (20:00)
    const totalMinutes = calendarEnd - calendarStart

    const top = ((startMinutes - calendarStart) / totalMinutes) * 100
    const height = ((endMinutes - startMinutes) / totalMinutes) * 100

    return { top: `${Math.max(0, top)}%`, height: `${height}%` }
  }

  // Check if two bookings overlap in time
  const doBookingsOverlap = (booking1: Booking, booking2: Booking) => {
    const [start1Hour, start1Min] = booking1.start_time.split(':').map(Number)
    const [end1Hour, end1Min] = booking1.end_time.split(':').map(Number)
    const [start2Hour, start2Min] = booking2.start_time.split(':').map(Number)
    const [end2Hour, end2Min] = booking2.end_time.split(':').map(Number)

    const start1 = start1Hour * 60 + start1Min
    const end1 = end1Hour * 60 + end1Min
    const start2 = start2Hour * 60 + start2Min
    const end2 = end2Hour * 60 + end2Min

    return start1 < end2 && start2 < end1
  }

  // Calculate layout for overlapping bookings
  const getBookingLayout = (dayBookings: Booking[]) => {
    const layouts: Array<{
      booking: Booking
      column: number
      totalColumns: number
    }> = []

    dayBookings.forEach((booking, index) => {
      // Find all bookings that overlap with this one
      const overlapping = dayBookings.filter((other, otherIndex) => {
        if (index === otherIndex) return false
        return doBookingsOverlap(booking, other)
      })

      // Calculate column position
      let column = 0
      const columnsUsed = new Set<number>()

      overlapping.forEach((other) => {
        const otherIndex = dayBookings.indexOf(other)
        if (otherIndex < index) {
          const otherLayout = layouts[otherIndex]
          if (otherLayout) {
            columnsUsed.add(otherLayout.column)
          }
        }
      })

      // Find first available column
      while (columnsUsed.has(column)) {
        column++
      }

      const totalColumns = overlapping.length + 1

      layouts.push({
        booking,
        column,
        totalColumns,
      })
    })

    return layouts
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
            View staff work schedules and bookings
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-4">
              <Label htmlFor="staff_select" className="whitespace-nowrap">
                Select Staff:
              </Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose staff member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.full_name} - {staff.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <Label htmlFor="team_select" className="whitespace-nowrap">
                Select Team:
              </Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Booking Schedule
            {selectedStaff === 'all' ? (
              <span className="text-sm font-normal text-muted-foreground">
                - All Staff
              </span>
            ) : selectedStaffData ? (
              <span className="text-sm font-normal text-muted-foreground">
                - {selectedStaffData.full_name}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="flex gap-2">
              {/* Time column */}
              <div className="flex flex-col w-20 flex-shrink-0">
                <div className="h-12 border-b font-medium text-sm text-muted-foreground flex items-center">
                  Time
                </div>
                <div className="relative" style={{ height: '720px' }}>
                  {TIME_SLOTS.map((time, index) => (
                    <div
                      key={time}
                      className="absolute w-full text-sm font-medium text-muted-foreground"
                      style={{ top: `${(index / TIME_SLOTS.length) * 100}%` }}
                    >
                      {time}
                    </div>
                  ))}
                </div>
              </div>

              {/* Day columns */}
              {DAYS_OF_WEEK.map((day, dayIndex) => {
                const date = weekDates[dayIndex]
                const dateStr = date
                  ? date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : ''
                const dayBookings = getBookingsForDay(dayIndex)

                return (
                  <div key={dayIndex} className="flex-1 min-w-[120px]">
                    {/* Day header */}
                    <div className="h-12 border-b text-center font-medium text-sm text-muted-foreground flex flex-col items-center justify-center">
                      <div>{day}</div>
                      <div className="text-xs text-tinedy-blue font-semibold">
                        {dateStr}
                      </div>
                    </div>

                    {/* Timeline area */}
                    <div className="relative bg-gray-50/50 border-r" style={{ height: '720px' }}>
                      {/* Hour lines */}
                      {TIME_SLOTS.map((_, index) => (
                        <div
                          key={index}
                          className="absolute w-full border-t border-gray-200"
                          style={{ top: `${(index / TIME_SLOTS.length) * 100}%` }}
                        />
                      ))}

                      {/* Booking bars */}
                      {getBookingLayout(dayBookings).map((layout) => {
                        const { booking, column, totalColumns } = layout
                        const position = calculateBookingPosition(
                          booking.start_time,
                          booking.end_time
                        )

                        const statusColors = {
                          pending: 'bg-yellow-400 hover:bg-yellow-500',
                          confirmed: 'bg-tinedy-blue hover:bg-tinedy-blue/90',
                          in_progress: 'bg-purple-500 hover:bg-purple-600',
                          completed: 'bg-green-500 hover:bg-green-600',
                          cancelled: 'bg-red-500 hover:bg-red-600',
                        }

                        const bgColor = statusColors[booking.status as keyof typeof statusColors] || 'bg-tinedy-blue'

                        // Calculate width and left position for overlapping bookings
                        const gap = 2 // Gap between bars in percentage
                        const widthPercent = (100 / totalColumns) - gap
                        const leftPercent = (column / totalColumns) * 100 + (gap / 2)

                        return (
                          <div
                            key={booking.id}
                            className={`absolute rounded-md ${bgColor} text-white shadow-sm transition-all cursor-pointer overflow-hidden`}
                            style={{
                              top: position.top,
                              height: position.height,
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                          >
                            <div className="px-2 py-1 h-full flex items-center justify-center">
                              <div className="font-semibold text-xs truncate writing-mode-vertical transform rotate-180" style={{ writingMode: 'vertical-rl' }}>
                                {booking.profiles?.full_name || 'Staff'}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-tinedy-blue rounded"></div>
              <span>Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Cancelled</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">This Week's Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No bookings scheduled for this week.
              </p>
            ) : (
              bookings.map((booking) => {
                const date = new Date(booking.booking_date)
                const dayName = DAYS_OF_WEEK[date.getDay()]
                const dateStr = date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })

                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <div className="font-medium">
                          {dayName}, {dateStr}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {booking.start_time} - {booking.end_time}
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">
                          {booking.service_packages?.name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {booking.customers?.full_name}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        booking.status === 'confirmed' ? 'default' : 'secondary'
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
