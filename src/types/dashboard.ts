import type { PriceMode } from '@/types/booking'

// Dashboard Stats Types
export interface Stats {
  totalBookings: number
  totalRevenue: number
  totalCustomers: number
  pendingBookings: number
}

export interface StatsChange {
  bookingsChange: number
  revenueChange: number
  customersChange: number
  pendingChange: number
}

// Booking Status Chart
export interface BookingStatus {
  status: string
  count: number
  color: string
}

// Today's Bookings
export interface TodayBooking {
  id: string
  booking_date: string
  end_date?: string | null
  start_time: string
  end_time: string
  status: string
  total_price: number
  address: string
  city: string
  state: string
  zip_code: string
  staff_id: string | null
  team_id: string | null
  package_v2_id?: string | null
  area_sqm?: number | null
  frequency?: number | null
  notes: string | null
  payment_status?: string
  payment_method?: string
  amount_paid?: number
  payment_date?: string
  payment_notes?: string
  price_mode?: PriceMode
  job_name?: string | null
  customers: {
    id: string
    full_name: string
    phone: string
    email: string
  } | null
  service_packages: {
    name: string
    service_type: string
  } | null
  service_packages_v2?: {
    name: string
    service_type: string
  } | null
  profiles: {
    full_name: string
  } | null
  teams: {
    name: string
    team_lead?: {
      id: string
      full_name: string
      email: string
      avatar_url: string | null
    } | null
  } | null
}

// Revenue Chart
export interface DailyRevenue {
  date: string
  revenue: number
}

// Weekly Overview
export type WeeklyDayLabel = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export interface WeeklyBookingDay {
  date: string      // 'YYYY-MM-DD'
  dayLabel: WeeklyDayLabel
  count: number
  isToday: boolean
}

// Loading States
export interface DashboardLoadingStates {
  stats: boolean
  todayStats: boolean
  byStatus: boolean
  todayBookings: boolean
  revenue: boolean
  weeklyBookings: boolean
}

// Complete Dashboard Data
export interface DashboardData {
  stats: Stats
  statsChange: StatsChange
  bookingsByStatus: BookingStatus[]
  todayBookings: TodayBooking[]
  dailyRevenue: DailyRevenue[]
  weeklyBookings: WeeklyBookingDay[]
  loading: boolean
  loadingStates: DashboardLoadingStates
  error: string | null
  refresh: () => Promise<void>
}

// Staff and Team Types (for modals)
export interface StaffMember {
  id: string
  full_name: string
  email: string
  role: string
}

export interface Team {
  id: string
  name: string
}

// Action Loading States
export interface ActionLoading {
  statusChange: boolean
  delete: boolean
  markAsPaid: boolean
  verifyPayment: boolean
  refund: boolean
}
