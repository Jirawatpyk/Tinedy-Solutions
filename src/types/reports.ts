export interface BookingWithService {
  id: string
  booking_date: string
  start_time: string
  total_price: number
  status: string
  payment_status?: string
  created_at: string
  customer_id: string
  staff_id: string | null
  package_v2_id?: string | null
  service_packages: {
    name: string
    service_type: string
  } | null
}

export interface Customer {
  id: string
  full_name: string
  email: string
  phone?: string
  created_at: string
}

export interface CustomerWithBookings extends Customer {
  bookings: {
    id: string
    booking_date: string
    total_price: number
    status: string
    payment_status?: string
    created_at: string
  }[]
}

export interface Staff {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

export interface StaffWithBookings extends Staff {
  bookings: {
    id: string
    booking_date: string
    total_price: number
    status: string
    payment_status?: string
    staff_id?: string
    team_id?: string
    team_member_count?: number
    created_at: string
  }[]
}

export interface Team {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface TeamWithBookings extends Team {
  bookings: {
    id: string
    booking_date: string
    total_price: number
    status: string
    payment_status?: string
    team_id: string
    created_at: string
  }[]
  team_members: { id: string }[]
}

export const CHART_COLORS = {
  primary: '#2e4057',
  secondary: '#8fb996',
  accent: '#e7d188',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
} as const
