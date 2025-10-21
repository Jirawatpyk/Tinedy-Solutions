import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import {
  Calendar,
  Users,
  DollarSign,
  Clock,
  BriefcaseBusiness,
  TrendingUp,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Stats {
  totalBookings: number
  totalRevenue: number
  totalCustomers: number
  pendingBookings: number
  activeTeams: number
}

interface RecentBooking {
  id: string
  booking_date: string
  status: string
  total_price: number
  customers: {
    full_name: string
  } | null
  service_packages: {
    name: string
  } | null
}

interface TeamStats {
  id: string
  name: string
  totalBookings: number
  completedBookings: number
  revenue: number
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    pendingBookings: 0,
    activeTeams: 0,
  })
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch total bookings
      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })

      // Fetch total revenue
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('status', 'completed')

      const totalRevenue = bookingsData?.reduce(
        (sum, booking) => sum + Number(booking.total_price),
        0
      ) || 0

      // Fetch total customers
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      // Fetch pending bookings
      const { count: pendingBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Fetch active teams count
      const { count: activeTeams } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      setStats({
        totalBookings: totalBookings || 0,
        totalRevenue,
        totalCustomers: totalCustomers || 0,
        pendingBookings: pendingBookings || 0,
        activeTeams: activeTeams || 0,
      })

      // Fetch recent bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          status,
          total_price,
          customers (full_name),
          service_packages (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (bookingsError) {
        console.error('Error fetching recent bookings:', bookingsError)
      }

      setRecentBookings((bookings as any) || [])

      // Fetch team stats
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('is_active', true)

      if (teams) {
        const teamsWithStats = await Promise.all(
          teams.map(async (team) => {
            // Get all bookings for this team
            const { data: teamBookings } = await supabase
              .from('bookings')
              .select('id, status, total_price')
              .eq('team_id', team.id)

            const totalBookings = teamBookings?.length || 0
            const completedBookings = teamBookings?.filter(b => b.status === 'completed').length || 0
            const revenue = teamBookings
              ?.filter(b => b.status === 'completed')
              .reduce((sum, b) => sum + Number(b.total_price), 0) || 0

            return {
              id: team.id,
              name: team.name,
              totalBookings,
              completedBookings,
              revenue,
            }
          })
        )

        // Sort by revenue (top performers first)
        teamsWithStats.sort((a, b) => b.revenue - a.revenue)
        setTeamStats(teamsWithStats)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'warning' as const, label: 'Pending' },
      confirmed: { variant: 'info' as const, label: 'Confirmed' },
      in_progress: { variant: 'default' as const, label: 'In Progress' },
      completed: { variant: 'success' as const, label: 'Completed' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: 'default' as const,
      label: status,
    }

    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content grid skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent bookings skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team stats skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <div className="flex gap-4">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
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
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-tinedy-dark">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-tinedy-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.totalBookings}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All time bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-tinedy-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From completed bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-tinedy-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.totalCustomers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
            <BriefcaseBusiness className="h-4 w-4 text-tinedy-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.activeTeams}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Service teams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats.pendingBookings}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content grid - Recent Bookings and Team Performance */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBookings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No bookings yet
                </p>
              ) : (
                recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <p className="font-medium text-tinedy-dark">
                        {booking.customers?.full_name || 'Unknown Customer'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.service_packages?.name || 'Unknown Service'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(booking.booking_date)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-semibold text-tinedy-dark">
                          {formatCurrency(Number(booking.total_price))}
                        </p>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5 text-tinedy-blue" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No teams yet
                </p>
              ) : (
                teamStats.map((team, index) => (
                  <div
                    key={team.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <TrendingUp className="h-4 w-4 text-tinedy-green" />
                        )}
                        <p className="font-medium text-tinedy-dark">{team.name}</p>
                      </div>
                      <Badge variant={index === 0 ? "default" : "outline"} className={index === 0 ? "bg-tinedy-green" : ""}>
                        {index === 0 ? "Top" : `#${index + 1}`}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Jobs</p>
                        <p className="font-semibold text-tinedy-dark">{team.totalBookings}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="font-semibold text-tinedy-green">{team.completedBookings}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-bold text-tinedy-dark">{formatCurrency(team.revenue)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
