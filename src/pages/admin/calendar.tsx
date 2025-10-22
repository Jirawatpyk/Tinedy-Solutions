import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Briefcase,
  Users,
} from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns'

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  customer_id: string
  staff_id: string | null
  team_id: string | null
  customers: {
    full_name: string
  } | null
  profiles: {
    full_name: string
  } | null
  teams: {
    name: string
  } | null
  service_packages: {
    name: string
  } | null
}

interface Team {
  id: string
  name: string
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
}

const STATUS_DOTS = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  in_progress: 'bg-purple-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
}

export function AdminCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchTeams = useCallback(async () => {
    try {
      const { data, error} = await supabase
        .from('teams')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }, [])

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_price,
          customer_id,
          staff_id,
          team_id,
          customers!inner (
            full_name
          ),
          profiles (
            full_name
          ),
          teams (
            name
          ),
          service_packages!inner (
            name
          )
        `)
        .gte('booking_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('booking_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('start_time')

      if (error) throw error
      // Transform array relations to single objects
      const transformedData = (data || []).map((booking) => ({
        ...booking,
        customers: Array.isArray(booking.customers) ? booking.customers[0] : booking.customers,
        profiles: Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles,
        teams: Array.isArray(booking.teams) ? booking.teams[0] : booking.teams,
        service_packages: Array.isArray(booking.service_packages) ? booking.service_packages[0] : booking.service_packages,
      }))
      setBookings(transformedData as Booking[])
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load calendar bookings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [currentDate, toast])

  const filterBookings = useCallback(() => {
    if (selectedTeam === 'all') {
      setFilteredBookings(bookings)
    } else {
      setFilteredBookings(bookings.filter(b => b.team_id === selectedTeam))
    }
  }, [bookings, selectedTeam])

  useEffect(() => {
    fetchBookings()
    fetchTeams()
  }, [currentDate, fetchBookings, fetchTeams])

  useEffect(() => {
    filterBookings()
  }, [filterBookings])

  const getBookingsForDate = (date: Date) => {
    return filteredBookings.filter((booking) =>
      isSameDay(new Date(booking.booking_date), date)
    )
  }

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Generate calendar days
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate) : []

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Skeleton */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-40" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar Skeleton */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-tinedy-dark">Calendar</h1>
          <p className="text-muted-foreground mt-1">View and manage your bookings</p>
        </div>
        <div className="flex gap-2">
          {/* Team Filter */}
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by team" />
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
          <Button onClick={goToToday} variant="outline">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-2xl">
                {format(currentDate, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousMonth}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextMonth}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                const dayBookings = getBookingsForDate(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                const isTodayDate = isToday(day)

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      relative min-h-20 p-2 text-left border rounded-lg transition-all
                      ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-background'}
                      ${isSelected ? 'ring-2 ring-tinedy-blue bg-blue-50' : ''}
                      ${isTodayDate && !isSelected ? 'ring-2 ring-tinedy-yellow' : ''}
                      hover:bg-accent/50
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`text-sm font-medium ${
                          isTodayDate ? 'text-tinedy-blue font-bold' : ''
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayBookings.length > 0 && (
                        <span className="text-xs bg-tinedy-blue text-white rounded-full px-1.5">
                          {dayBookings.length}
                        </span>
                      )}
                    </div>

                    {/* Booking dots */}
                    {dayBookings.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {dayBookings.slice(0, 3).map((booking) => (
                          <div
                            key={booking.id}
                            className={`w-2 h-2 rounded-full ${
                              STATUS_DOTS[booking.status as keyof typeof STATUS_DOTS]
                            }`}
                            title={booking.service_packages?.name || 'Booking'}
                          />
                        ))}
                        {dayBookings.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{dayBookings.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm font-semibold mb-2">Status Legend:</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>Confirmed</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Cancelled</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking List Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-display">
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </CardTitle>
            {selectedDateBookings.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedDateBookings.length} booking{selectedDateBookings.length > 1 ? 's' : ''}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Click on a date to view bookings
                </p>
              </div>
            ) : selectedDateBookings.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No bookings for this date</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {selectedDateBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className={`p-3 rounded-lg border-2 ${
                      STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS]
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-semibold">
                          {booking.start_time} - {booking.end_time}
                        </span>
                      </div>
                      <span className="text-xs font-medium uppercase px-2 py-0.5 rounded">
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{booking.customers?.full_name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{booking.service_packages?.name || 'N/A'}</span>
                      </div>
                      {booking.profiles && (
                        <div className="flex items-center gap-2 text-tinedy-blue">
                          <User className="h-3.5 w-3.5" />
                          <span>Staff: {booking.profiles.full_name}</span>
                        </div>
                      )}
                      {booking.teams && (
                        <div className="flex items-center gap-2 text-tinedy-green">
                          <Users className="h-3.5 w-3.5" />
                          <span>Team: {booking.teams.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
