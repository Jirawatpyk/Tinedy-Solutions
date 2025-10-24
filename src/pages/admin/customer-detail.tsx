import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/error-utils'
import { BookingEditModal } from '@/components/booking'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MessageCircle,
  Building,
  CreditCard,
  Edit,
  Trash2,
  PhoneCall,
  Send,
  Plus,
  FileText,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  Tag,
  X,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookingDetailModal } from '@/pages/admin/booking-detail-modal'
import type { Booking } from '@/types/booking'

interface Customer {
  id: string
  full_name: string
  email: string
  phone: string
  line_id: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  relationship_level: 'new' | 'regular' | 'vip' | 'inactive'
  preferred_contact_method: 'phone' | 'email' | 'line' | 'sms'
  tags: string[] | null
  source: string | null
  birthday: string | null
  company_name: string | null
  tax_id: string | null
  notes: string | null
  created_at: string
}

interface CustomerStats {
  total_bookings: number
  lifetime_value: number
  avg_booking_value: number
  last_booking_date: string | null
  first_booking_date: string | null
  completed_bookings: number
  cancelled_bookings: number
  no_show_bookings: number
  pending_bookings: number
  days_since_last_booking: number | null
  customer_tenure_days: number
}

interface CustomerBooking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  notes: string | null
  total_price: number
  address: string
  city: string
  state: string
  zip_code: string
  staff_id: string | null
  team_id: string | null
  service_package_id: string
  payment_status?: string
  payment_method?: string
  amount_paid?: number
  payment_date?: string
  payment_notes?: string
  service: {
    name: string
    service_type: string
    price: number
  } | null
  staff: {
    full_name: string
  } | null
  service_packages: { name: string; service_type: string } | null
  customers: { full_name: string; email: string; id: string } | null
  profiles: { full_name: string } | null
  teams: { name: string } | null
}

interface ChartDataPoint {
  month: string
  monthKey: string
  completed: number
  cancelled: number
  pending: number
  total: number
}

interface ServicePackage {
  id: string
  name: string
  price: number
  duration_minutes: number
}

interface StaffMember {
  id: string
  full_name: string
  email: string
  role: string
}

interface Team {
  id: string
  name: string
}

interface BookingFormData {
  customer_id?: string
  full_name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  service_package_id?: string
  booking_date?: string
  start_time?: string
  end_time?: string
  total_price?: number
  staff_id?: string
  team_id?: string
  notes?: string
  status?: string
}

export function AdminCustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Dialog states
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false)
  const [isBookingDetailModalOpen, setIsBookingDetailModalOpen] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  // Edit Booking Modal State
  const [isBookingEditOpen, setIsBookingEditOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [editBookingAssignmentType, setEditBookingAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [editBookingFormData, setEditBookingFormData] = useState<BookingFormData>({})
  const [isEditBookingAvailabilityOpen, setIsEditBookingAvailabilityOpen] = useState(false)

  // Data for modals
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [teams, setTeams] = useState<Team[]>([])

  // Form states
  const [noteText, setNoteText] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    line_id: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    relationship_level: 'new' as 'new' | 'regular' | 'vip' | 'inactive',
    preferred_contact_method: 'phone' as 'phone' | 'email' | 'line' | 'sms',
    tags: [] as string[],
    source: '',
    birthday: '',
    company_name: '',
    tax_id: '',
    notes: '',
  })
  const [bookingForm, setBookingForm] = useState({
    booking_date: '',
    start_time: '',
    service_package_id: '',
    staff_id: '',
    team_id: '',
    notes: '',
  })
  const [assignmentType, setAssignmentType] = useState<'none' | 'staff' | 'team'>('none')
  const [submitting, setSubmitting] = useState(false)

  const refreshBookings = useCallback(async () => {
    if (!id) return

    try {
      // Fetch booking history with full details
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(
          `
          *,
          service:service_packages!bookings_service_package_id_fkey (
            name,
            service_type,
            price
          ),
          staff:profiles!bookings_staff_id_fkey (
            full_name
          ),
          service_packages!bookings_service_package_id_fkey (
            name,
            service_type
          ),
          customers (
            id,
            full_name,
            email
          ),
          profiles:profiles!bookings_staff_id_fkey (
            full_name
          ),
          teams (
            name
          )
        `
        )
        .eq('customer_id', id)
        .order('booking_date', { ascending: false })

      if (bookingsError) {
        console.warn('Error fetching bookings:', bookingsError)
        setBookings([])
      } else {
        // Transform array relations to single objects
        const transformedBookings = (bookingsData || []).map((booking) => ({
          ...booking,
          service: Array.isArray(booking.service) ? booking.service[0] : booking.service,
          staff: Array.isArray(booking.staff) ? booking.staff[0] : booking.staff,
          service_packages: Array.isArray(booking.service_packages) ? booking.service_packages[0] : booking.service_packages,
          customers: Array.isArray(booking.customers) ? booking.customers[0] : booking.customers,
          profiles: Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles,
          teams: Array.isArray(booking.teams) ? booking.teams[0] : booking.teams,
        }))
        setBookings(transformedBookings)
      }

      // Also refresh stats
      const { data: statsData } = await supabase
        .from('customer_lifetime_value')
        .select('*')
        .eq('id', id)
        .single()

      if (statsData) {
        setStats(statsData)
      }
    } catch (error) {
      console.error('Error refreshing bookings:', error)
    }
  }, [id])

  const fetchCustomerDetails = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch customer data
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (customerError) throw customerError
      setCustomer(customerData)

      // Fetch customer stats from view
      const { data: statsData, error: statsError } = await supabase
        .from('customer_lifetime_value')
        .select('*')
        .eq('id', id)
        .single()

      if (statsError) {
        console.warn('Stats view not available:', statsError)
        // Set default stats if view doesn't exist
        setStats({
          total_bookings: 0,
          lifetime_value: 0,
          avg_booking_value: 0,
          last_booking_date: null,
          first_booking_date: null,
          completed_bookings: 0,
          cancelled_bookings: 0,
          no_show_bookings: 0,
          pending_bookings: 0,
          days_since_last_booking: null,
          customer_tenure_days: 0,
        })
      } else {
        setStats(statsData)
      }

      // Fetch booking history with full details
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(
          `
          *,
          service:service_packages!bookings_service_package_id_fkey (
            name,
            service_type,
            price
          ),
          staff:profiles!bookings_staff_id_fkey (
            full_name
          ),
          service_packages!bookings_service_package_id_fkey (
            name,
            service_type
          ),
          customers (
            id,
            full_name,
            email
          ),
          profiles:profiles!bookings_staff_id_fkey (
            full_name
          ),
          teams (
            name
          )
        `
        )
        .eq('customer_id', id)
        .order('booking_date', { ascending: false })

      if (bookingsError) {
        console.warn('Error fetching bookings:', bookingsError)
        setBookings([])
      } else {
        // Transform array relations to single objects
        const transformedBookings = (bookingsData || []).map((booking) => ({
          ...booking,
          service: Array.isArray(booking.service) ? booking.service[0] : booking.service,
          staff: Array.isArray(booking.staff) ? booking.staff[0] : booking.staff,
          service_packages: Array.isArray(booking.service_packages) ? booking.service_packages[0] : booking.service_packages,
          customers: Array.isArray(booking.customers) ? booking.customers[0] : booking.customers,
          profiles: Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles,
          teams: Array.isArray(booking.teams) ? booking.teams[0] : booking.teams,
        }))
        setBookings(transformedBookings)
      }
    } catch (error) {
      console.error('Error fetching customer details:', error)
      toast({
        title: 'Error',
        description: 'Failed to load customer details',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  const fetchServicePackagesAndStaff = useCallback(async () => {
    try {
      // Fetch service packages
      const { data: packages, error: packagesError } = await supabase
        .from('service_packages')
        .select('id, name, price, service_type, duration_minutes')
        .eq('is_active', true)
        .order('name')

      if (packagesError) throw packagesError
      setServicePackages(packages || [])

      // Fetch staff members
      const { data: staff, error: staffError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('role', 'staff')
        .order('full_name')

      if (staffError) throw staffError
      setStaffMembers(staff || [])

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .order('name')

      if (teamsError) throw teamsError
      setTeams(teamsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load booking options',
        variant: 'destructive',
      })
    }
  }, [toast])

  const fetchModalData = useCallback(async () => {
    try {
      const [packagesRes, staffRes, teamsRes] = await Promise.all([
        supabase.from('service_packages').select('*').eq('is_active', true).order('name'),
        supabase.from('profiles').select('id, full_name, email, role').eq('role', 'staff').order('full_name'),
        supabase.from('teams').select('id, name').eq('is_active', true).order('name')
      ])

      if (packagesRes.error) throw packagesRes.error
      if (staffRes.error) throw staffRes.error
      if (teamsRes.error) throw teamsRes.error

      setServicePackages(packagesRes.data || [])
      setStaffMembers(staffRes.data || [])
      setTeams(teamsRes.data || [])
    } catch (error) {
      console.error('Error fetching modal data:', error)
    }
  }, [])

  useEffect(() => {
    if (id) {
      // OPTIMIZE: Run both queries in parallel for better performance
      Promise.all([
        fetchCustomerDetails(),
        fetchModalData()
      ])
    }
  }, [id, fetchCustomerDetails, fetchModalData])

  useEffect(() => {
    if (isBookingDialogOpen) {
      fetchServicePackagesAndStaff()
    }
  }, [isBookingDialogOpen, fetchServicePackagesAndStaff])

  // Calculate end_time from start_time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60) % 24
    const endMinutes = totalMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
  }

  // Edit Booking Form Helpers
  const editBookingForm = {
    formData: editBookingFormData,
    handleChange: <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => {
      setEditBookingFormData(prev => ({ ...prev, [field]: value }))
    },
    setValues: (values: Partial<BookingFormData>) => {
      setEditBookingFormData(prev => ({ ...prev, ...values }))
    },
    reset: () => {
      setEditBookingFormData({})
      setEditBookingAssignmentType('none')
    }
  }

  const handleEditBooking = (booking: CustomerBooking | Booking) => {
    // Populate edit form with booking data
    setEditBookingFormData({
      service_package_id: booking.service_package_id,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      address: booking.address,
      city: booking.city,
      state: booking.state,
      zip_code: booking.zip_code,
      notes: booking.notes || undefined,
      total_price: booking.total_price,
      staff_id: booking.staff_id || '',
      team_id: booking.team_id || '',
      status: booking.status,
    })

    // Set assignment type based on booking data
    if (booking.staff_id) {
      setEditBookingAssignmentType('staff')
    } else if (booking.team_id) {
      setEditBookingAssignmentType('team')
    } else {
      setEditBookingAssignmentType('none')
    }

    // Convert to Booking for the modal (works for both CustomerBooking and Booking)
    const bookingForModal: Booking = {
      id: booking.id,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: booking.status,
      total_price: booking.total_price,
      address: booking.address,
      city: booking.city,
      state: booking.state,
      zip_code: booking.zip_code,
      staff_id: booking.staff_id,
      team_id: booking.team_id,
      service_package_id: booking.service_package_id,
      notes: booking.notes,
      payment_status: booking.payment_status,
      payment_method: booking.payment_method,
      amount_paid: booking.amount_paid,
      payment_date: booking.payment_date,
      payment_notes: 'payment_notes' in booking ? booking.payment_notes : undefined,
      customers: booking.customers,
      service_packages: booking.service_packages,
      profiles: booking.profiles,
      teams: booking.teams,
    }

    setSelectedBooking(bookingForModal)
    setIsBookingEditOpen(true)
    setIsBookingDetailModalOpen(false)
  }

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !customer) return

    try {
      setSubmitting(true)

      // Find selected package to get duration
      const selectedPackage = servicePackages.find(pkg => pkg.id === bookingForm.service_package_id)
      if (!selectedPackage) {
        throw new Error('Selected service package not found')
      }

      // Calculate end_time
      const endTime = calculateEndTime(bookingForm.start_time, selectedPackage.duration_minutes)

      const { error } = await supabase.from('bookings').insert({
        customer_id: id,
        booking_date: bookingForm.booking_date,
        start_time: bookingForm.start_time,
        end_time: endTime,
        service_package_id: bookingForm.service_package_id,
        staff_id: assignmentType === 'staff' ? (bookingForm.staff_id || null) : null,
        team_id: assignmentType === 'team' ? (bookingForm.team_id || null) : null,
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zip_code: customer.zip_code || '',
        notes: bookingForm.notes || null,
        total_price: selectedPackage.price,
        status: 'pending',
      })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking created successfully',
      })

      setIsBookingDialogOpen(false)
      setBookingForm({
        booking_date: '',
        start_time: '',
        service_package_id: '',
        staff_id: '',
        team_id: '',
        notes: '',
      })
      setAssignmentType('none')
      fetchCustomerDetails() // Refresh data
    } catch (error) {
      console.error('Error creating booking:', error)
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = () => {
    if (!customer) return
    setEditForm({
      full_name: customer.full_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      line_id: customer.line_id || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zip_code: customer.zip_code || '',
      relationship_level: customer.relationship_level,
      preferred_contact_method: customer.preferred_contact_method,
      tags: customer.tags || [],
      source: customer.source || '',
      birthday: customer.birthday || '',
      company_name: customer.company_name || '',
      tax_id: customer.tax_id || '',
      notes: customer.notes || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    try {
      setSubmitting(true)

      const { error } = await supabase
        .from('customers')
        .update(editForm)
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Customer updated successfully',
      })

      setIsEditDialogOpen(false)
      fetchCustomerDetails() // Refresh data
    } catch (error) {
      console.error('Error updating customer:', error)
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddNote = async () => {
    if (!id || !noteText.trim()) return

    try {
      setSubmitting(true)

      const currentNotes = customer?.notes || ''
      const timestamp = new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
      const newNote = `[${timestamp}] ${noteText.trim()}`
      const updatedNotes = currentNotes
        ? `${currentNotes}\n\n${newNote}`
        : newNote

      const { error } = await supabase
        .from('customers')
        .update({ notes: updatedNotes })
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Note added successfully',
      })

      setIsNoteDialogOpen(false)
      setNoteText('')
      fetchCustomerDetails() // Refresh data
    } catch (error) {
      console.error('Error adding note:', error)
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const deleteCustomer = async () => {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Customer deleted successfully',
      })
      navigate('/admin/customers')
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const filteredBookings = bookings.filter((booking) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      booking.service?.name?.toLowerCase().includes(query) ||
      booking.staff?.full_name?.toLowerCase().includes(query) ||
      booking.status.toLowerCase().includes(query)
    )
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex)

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Prepare chart data - bookings by month for last 6 months
  const getChartData = (): ChartDataPoint[] => {
    const months: ChartDataPoint[] = []
    const now = new Date()

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('en-US', { month: 'short' })

      months.push({
        month: monthName,
        monthKey,
        completed: 0,
        cancelled: 0,
        pending: 0,
        total: 0,
      })
    }

    // Count bookings by month and status
    bookings.forEach((booking) => {
      const bookingDate = new Date(booking.booking_date)
      const monthKey = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`

      const monthData = months.find((m) => m.monthKey === monthKey)
      if (monthData) {
        monthData.total++
        if (booking.status === 'completed') monthData.completed++
        else if (booking.status === 'cancelled') monthData.cancelled++
        else if (booking.status === 'pending') monthData.pending++
      }
    })

    return months
  }

  const chartData = getChartData()

  // Export to CSV function
  const exportToCSV = () => {
    if (!customer) return

    // Prepare CSV data
    const headers = ['Date', 'Time', 'Service', 'Service Type', 'Staff', 'Status', 'Amount', 'Notes']
    const rows = filteredBookings.map((booking) => [
      formatDate(booking.booking_date),
      booking.start_time,
      booking.service?.name || 'N/A',
      booking.service?.service_type || 'N/A',
      booking.staff?.full_name || 'N/A',
      booking.status,
      `฿${booking.service?.price || 0}`,
      booking.notes || '',
    ])

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `${customer.full_name}_booking_history_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Success',
      description: 'Booking history exported successfully',
    })
  }

  if (loading || !customer) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Relationship level badge config
  const relationshipConfig = {
    new: { label: '🆕 New', className: 'bg-gray-100 text-gray-700 border-gray-300' },
    regular: { label: '💚 Regular', className: 'bg-green-100 text-green-700 border-green-300' },
    vip: { label: '👑 VIP', className: 'bg-amber-100 text-amber-700 border-amber-300' },
    inactive: { label: '💤 Inactive', className: 'bg-red-100 text-red-700 border-red-300' },
  }

  const relationshipInfo = relationshipConfig[customer.relationship_level]

  // Status badge config
  const statusConfig = {
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-700 border-blue-300' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-300' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-300' },
    no_show: { label: 'No Show', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold text-tinedy-dark">
              Customer Profile
            </h1>
            <p className="text-muted-foreground mt-1">View and manage customer details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={openEditDialog}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Customer Profile Header */}
      <Card className="border-l-4 border-l-tinedy-blue">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Customer Info */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-tinedy-dark">
                    {customer.full_name}
                  </h2>
                  <Badge variant="outline" className={relationshipInfo.className}>
                    {relationshipInfo.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs">
                    {customer.preferred_contact_method.toUpperCase()}
                  </Badge>
                  {customer.source && (
                    <Badge variant="outline" className="text-xs">
                      Source: {customer.source}
                    </Badge>
                  )}
                  {customer.tags && customer.tags.length > 0 && (
                    customer.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <a href={`mailto:${customer.email}`} className="text-tinedy-dark hover:text-tinedy-blue">
                    {customer.email}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-green-600" />
                  <a href={`tel:${customer.phone}`} className="text-tinedy-dark hover:text-tinedy-blue">
                    {customer.phone}
                  </a>
                </div>
                {customer.line_id && (
                  <div className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    <span className="text-tinedy-dark">{customer.line_id}</span>
                  </div>
                )}
                {customer.birthday && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span className="text-tinedy-dark">{formatDate(customer.birthday)}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start gap-2 text-sm md:col-span-2">
                    <MapPin className="h-4 w-4 text-orange-600 mt-0.5" />
                    <span className="text-tinedy-dark">
                      {customer.address}
                      {customer.city && `, ${customer.city}`}
                      {customer.state && `, ${customer.state}`}
                      {customer.zip_code && ` ${customer.zip_code}`}
                    </span>
                  </div>
                )}
                {customer.company_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-indigo-600" />
                    <span className="text-tinedy-dark">{customer.company_name}</span>
                  </div>
                )}
                {customer.tax_id && (
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-slate-600" />
                    <span className="text-tinedy-dark">{customer.tax_id}</span>
                  </div>
                )}
              </div>

              {customer.notes && (
                <div className="bg-muted/50 rounded-lg p-4 mt-4">
                  <p className="text-sm font-medium mb-1">Notes:</p>
                  <p className="text-sm text-muted-foreground">{customer.notes}</p>
                </div>
              )}
            </div>

            {/* Quick Actions Sidebar */}
            <div className="lg:w-64 space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h3>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => setIsBookingDialogOpen(true)}
              >
                <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">New Booking</span>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <a href={`tel:${customer.phone}`} className="flex items-center">
                  <PhoneCall className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Call Customer</span>
                </a>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <a href={`mailto:${customer.email}`} className="flex items-center">
                  <Send className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Send Email</span>
                </a>
              </Button>
              {customer.line_id && (
                <Button className="w-full justify-start" variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">LINE Message</span>
                </Button>
              )}
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => setIsNoteDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">Add Note</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifetime Value</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              ฿{stats?.lifetime_value?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: ฿{stats?.avg_booking_value?.toLocaleString() || 0} per booking
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-tinedy-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <FileText className="h-4 w-4 text-tinedy-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats?.total_bookings || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.completed_bookings || 0} completed, {stats?.cancelled_bookings || 0} cancelled
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Booking</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats?.days_since_last_booking !== null && stats?.days_since_last_booking !== undefined
                ? Math.abs(stats.days_since_last_booking) === 0
                  ? 'Today'
                  : Math.abs(stats.days_since_last_booking) === 1
                  ? '1 day ago'
                  : `${Math.abs(stats.days_since_last_booking)} days ago`
                : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.last_booking_date
                ? formatDate(stats.last_booking_date)
                : 'No bookings yet'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Since</CardTitle>
            <Users className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tinedy-dark">
              {stats?.customer_tenure_days || 0}d
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(customer.created_at)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-tinedy-blue" />
            Booking Activity (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="#888888"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#888888"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Bar
                dataKey="completed"
                fill="#10b981"
                name="Completed"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="pending"
                fill="#f59e0b"
                name="Pending"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="cancelled"
                fill="#ef4444"
                name="Cancelled"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Booking History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl">Booking History</CardTitle>
            <div className="flex items-center gap-2">
              <div className="w-full sm:w-64">
                <Input
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={filteredBookings.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No bookings found matching your search' : 'No booking history yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Staff/Team</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBookings.map((booking) => {
                    const statusInfo = statusConfig[booking.status] || {
                      label: booking.status,
                      className: 'bg-gray-100 text-gray-700 border-gray-300'
                    }
                    return (
                      <TableRow
                        key={booking.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedBookingId(booking.id)
                          setIsBookingDetailModalOpen(true)
                        }}
                      >
                        <TableCell className="font-medium">
                          <div>{formatDate(booking.booking_date)}</div>
                          <div className="text-xs text-muted-foreground">
                            {booking.start_time}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{booking.service?.name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">
                            {booking.service?.service_type || ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          {booking.team_id && booking.teams?.name
                            ? booking.teams.name
                            : booking.staff_id && (booking.staff?.full_name || booking.profiles?.full_name)
                            ? booking.staff?.full_name || booking.profiles?.full_name
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ฿{booking.service?.price?.toLocaleString() || 0}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length} bookings
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={currentPage === page ? 'bg-tinedy-blue' : ''}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Booking Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Booking for {customer.full_name}</DialogTitle>
            <DialogDescription>
              Create a new booking for this customer
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBooking} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="booking_date">Booking Date *</Label>
              <Input
                id="booking_date"
                type="date"
                value={bookingForm.booking_date}
                onChange={(e) =>
                  setBookingForm({ ...bookingForm, booking_date: e.target.value })
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={bookingForm.start_time}
                  onChange={(e) =>
                    setBookingForm({ ...bookingForm, start_time: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time_display">End Time (Auto)</Label>
                <Input
                  id="end_time_display"
                  type="text"
                  value={
                    bookingForm.start_time && bookingForm.service_package_id
                      ? calculateEndTime(
                          bookingForm.start_time,
                          servicePackages.find(pkg => pkg.id === bookingForm.service_package_id)?.duration_minutes || 0
                        )
                      : '--:--'
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_package_id">Service *</Label>
              <Select
                value={bookingForm.service_package_id}
                onValueChange={(value) =>
                  setBookingForm({ ...bookingForm, service_package_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {servicePackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} - {pkg.duration_minutes} min - ฿{pkg.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assign to */}
            <div className="space-y-2">
              <Label htmlFor="assignment_type">Assign to</Label>
              <Select
                value={assignmentType}
                onValueChange={(value: 'none' | 'staff' | 'team') => {
                  setAssignmentType(value)
                  setBookingForm({ ...bookingForm, staff_id: '', team_id: '' })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="staff">Individual Staff</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Staff Selector */}
            {assignmentType === 'staff' && (
              <div className="space-y-2">
                <Label htmlFor="staff_id">Select Staff *</Label>
                <Select
                  value={bookingForm.staff_id}
                  onValueChange={(value) =>
                    setBookingForm({ ...bookingForm, staff_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Team Selector */}
            {assignmentType === 'team' && (
              <div className="space-y-2">
                <Label htmlFor="team_id">Select Team *</Label>
                <Select
                  value={bookingForm.team_id}
                  onValueChange={(value) =>
                    setBookingForm({ ...bookingForm, team_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Check Availability Button */}
            {assignmentType !== 'none' && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-gradient-to-r from-tinedy-blue/10 to-tinedy-green/10 hover:from-tinedy-blue/20 hover:to-tinedy-green/20 border-tinedy-blue/30"
                  onClick={() => {
                    setIsBookingDialogOpen(false)
                    setIsAvailabilityModalOpen(true)
                  }}
                  disabled={
                    !bookingForm.booking_date ||
                    !bookingForm.start_time ||
                    !bookingForm.service_package_id
                  }
                >
                  <Sparkles className="h-4 w-4 mr-2 text-tinedy-blue" />
                  Check Staff Availability
                </Button>
                {(!bookingForm.booking_date || !bookingForm.start_time || !bookingForm.service_package_id) && (
                  <p className="text-xs text-muted-foreground text-center">
                    Please select date, time, and service first
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="booking_notes">Notes (Optional)</Label>
              <Textarea
                id="booking_notes"
                value={bookingForm.notes}
                onChange={(e) =>
                  setBookingForm({ ...bookingForm, notes: e.target.value })
                }
                rows={3}
                placeholder="Add any special notes for this booking..."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBookingDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-tinedy-blue">
                {submitting ? 'Creating...' : 'Create Booking'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note to {customer.full_name}'s profile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={5}
                placeholder="Enter note here..."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNoteDialogOpen(false)
                  setNoteText('')
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddNote}
                disabled={submitting || !noteText.trim()}
                className="bg-tinedy-blue"
              >
                {submitting ? 'Adding...' : 'Add Note'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Full Name *</Label>
                <Input
                  id="edit_full_name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email *</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Phone *</Label>
                <Input
                  id="edit_phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_line_id">LINE ID</Label>
                <Input
                  id="edit_line_id"
                  value={editForm.line_id}
                  onChange={(e) => setEditForm({ ...editForm, line_id: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_address">Address</Label>
              <Input
                id="edit_address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_city">City</Label>
                <Input
                  id="edit_city"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_state">State/Province</Label>
                <Input
                  id="edit_state"
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_zip_code">ZIP Code</Label>
                <Input
                  id="edit_zip_code"
                  value={editForm.zip_code}
                  onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })}
                />
              </div>
            </div>

            {/* Relationship & Contact Section */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Relationship & Contact Preferences</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_relationship_level">Relationship Level *</Label>
                  <Select
                    value={editForm.relationship_level}
                    onValueChange={(value: 'new' | 'regular' | 'vip' | 'inactive') => setEditForm({ ...editForm, relationship_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">🆕 New Customer</SelectItem>
                      <SelectItem value="regular">💚 Regular Customer</SelectItem>
                      <SelectItem value="vip">👑 VIP Customer</SelectItem>
                      <SelectItem value="inactive">💤 Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_preferred_contact_method">Preferred Contact *</Label>
                  <Select
                    value={editForm.preferred_contact_method}
                    onValueChange={(value: 'phone' | 'email' | 'line' | 'sms') => setEditForm({ ...editForm, preferred_contact_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">📱 Phone</SelectItem>
                      <SelectItem value="email">✉️ Email</SelectItem>
                      <SelectItem value="line">💬 LINE</SelectItem>
                      <SelectItem value="sms">💌 SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_source">How did they find us?</Label>
                  <Select
                    value={editForm.source || undefined}
                    onValueChange={(value) => setEditForm({ ...editForm, source: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="google">Google Search</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="walk-in">Walk-in</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_birthday">Birthday</Label>
                  <Input
                    id="edit_birthday"
                    type="date"
                    value={editForm.birthday}
                    onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Tags Section */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-tinedy-blue" />
                <Label htmlFor="edit_tags">Customer Tags</Label>
              </div>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                {editForm.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => {
                        const newTags = editForm.tags.filter((_, i) => i !== index)
                        setEditForm({ ...editForm, tags: newTags })
                      }}
                    />
                  </Badge>
                ))}
              </div>
              <Input
                id="edit_tags"
                placeholder="Type to add tags or select from suggestions..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const trimmedTag = tagInput.trim()
                    if (trimmedTag && !editForm.tags.includes(trimmedTag)) {
                      setEditForm({ ...editForm, tags: [...editForm.tags, trimmedTag] })
                      setTagInput('')
                    }
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Press Enter or click + to add tags. Click × to remove.
              </p>
            </div>

            {/* Corporate Information */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Corporate Information (Optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_company_name">Company Name</Label>
                  <Input
                    id="edit_company_name"
                    value={editForm.company_name}
                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                    placeholder="ABC Company Ltd."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_tax_id">Tax ID</Label>
                  <Input
                    id="edit_tax_id"
                    value={editForm.tax_id}
                    onChange={(e) => setEditForm({ ...editForm, tax_id: e.target.value })}
                    placeholder="0-0000-00000-00-0"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t pt-4 space-y-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Additional notes about this customer..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-tinedy-blue">
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {customer.full_name} and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteCustomer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Staff Availability Modal */}
      {bookingForm.service_package_id && bookingForm.booking_date && bookingForm.start_time && (
        <StaffAvailabilityModal
          isOpen={isAvailabilityModalOpen}
          onClose={() => {
            setIsAvailabilityModalOpen(false)
            setIsBookingDialogOpen(true)
          }}
          assignmentType={assignmentType === 'staff' ? 'individual' : 'team'}
          onSelectStaff={(staffId) => {
            setBookingForm({ ...bookingForm, staff_id: staffId })
            setIsAvailabilityModalOpen(false)
            setIsBookingDialogOpen(true)
            toast({
              title: 'Staff Selected',
              description: 'Staff member has been assigned to the booking',
            })
          }}
          onSelectTeam={(teamId) => {
            setBookingForm({ ...bookingForm, team_id: teamId })
            setIsAvailabilityModalOpen(false)
            setIsBookingDialogOpen(true)
            toast({
              title: 'Team Selected',
              description: 'Team has been assigned to the booking',
            })
          }}
          date={bookingForm.booking_date}
          startTime={bookingForm.start_time}
          endTime={
            bookingForm.service_package_id
              ? calculateEndTime(
                  bookingForm.start_time,
                  servicePackages.find(pkg => pkg.id === bookingForm.service_package_id)?.duration_minutes || 0
                )
              : ''
          }
          servicePackageId={bookingForm.service_package_id}
          servicePackageName={
            servicePackages.find(pkg => pkg.id === bookingForm.service_package_id)?.name
          }
        />
      )}

      {/* Booking Detail Modal */}
      {selectedBookingId && (
        <BookingDetailModal
          booking={bookings.find(b => b.id === selectedBookingId) || null}
          isOpen={isBookingDetailModalOpen}
          onClose={() => {
            setIsBookingDetailModalOpen(false)
            setSelectedBookingId(null)
            refreshBookings() // Use refreshBookings instead of fetchCustomerDetails
          }}
          onEdit={(booking) => {
            handleEditBooking(booking)
          }}
          onDelete={async (bookingId) => {
            try {
              const { error } = await supabase
                .from('bookings')
                .delete()
                .eq('id', bookingId)

              if (error) throw error

              toast({
                title: 'Success',
                description: 'Booking deleted successfully',
              })

              setIsBookingDetailModalOpen(false)
              setSelectedBookingId(null)
              refreshBookings() // Use refreshBookings instead of fetchCustomerDetails
            } catch (error) {
              toast({
                title: 'Error',
                description: 'Failed to delete booking',
                variant: 'destructive',
              })
            }
          }}
          onStatusChange={async (bookingId, _currentStatus, newStatus) => {
            try {
              const { error } = await supabase
                .from('bookings')
                .update({ status: newStatus })
                .eq('id', bookingId)

              if (error) throw error

              toast({
                title: 'Success',
                description: `Status updated to ${newStatus}`,
              })

              refreshBookings() // Use refreshBookings instead of fetchCustomerDetails
            } catch (error) {
              toast({
                title: 'Error',
                description: 'Failed to update status',
                variant: 'destructive',
              })
            }
          }}
          onMarkAsPaid={async (bookingId, method) => {
            try {
              const booking = bookings.find(b => b.id === bookingId)
              const { error } = await supabase
                .from('bookings')
                .update({
                  payment_status: 'paid',
                  payment_method: method,
                  payment_date: new Date().toISOString(),
                  amount_paid: booking?.total_price || 0,
                })
                .eq('id', bookingId)

              if (error) throw error

              toast({
                title: 'Success',
                description: 'Payment marked as paid',
              })

              refreshBookings() // Use refreshBookings instead of fetchCustomerDetails
            } catch (error) {
              toast({
                title: 'Error',
                description: 'Failed to update payment status',
                variant: 'destructive',
              })
            }
          }}
          getStatusBadge={(status) => {
            const statusConfig: Record<string, { label: string; className: string }> = {
              pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
              confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-700 border-blue-300' },
              in_progress: { label: 'In Progress', className: 'bg-purple-100 text-purple-700 border-purple-300' },
              completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-300' },
              cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-300' },
              no_show: { label: 'No Show', className: 'bg-gray-100 text-gray-700 border-gray-300' },
            }
            const config = statusConfig[status] || { label: status, className: '' }
            return <Badge variant="outline" className={config.className}>{config.label}</Badge>
          }}
          getPaymentStatusBadge={(status) => {
            if (status === 'paid') {
              return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">Paid</Badge>
            }
            return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">Pending</Badge>
          }}
          getAvailableStatuses={(currentStatus) => {
            const statusFlow: Record<string, string[]> = {
              pending: ['pending', 'confirmed', 'cancelled', 'no_show'],
              confirmed: ['confirmed', 'in_progress', 'cancelled', 'no_show'],
              in_progress: ['in_progress', 'completed', 'cancelled'],
              completed: ['completed'],
              cancelled: ['cancelled', 'pending'],
              no_show: ['no_show', 'pending'],
            }
            return statusFlow[currentStatus] || [currentStatus]
          }}
          getStatusLabel={(status) => {
            const labels: Record<string, string> = {
              pending: 'Pending',
              confirmed: 'Confirmed',
              in_progress: 'In Progress',
              completed: 'Completed',
              cancelled: 'Cancelled',
              no_show: 'No Show',
            }
            return labels[status] || status
          }}
        />
      )}

      {/* Edit Booking Modal */}
      {selectedBooking && (
        <BookingEditModal
          isOpen={isBookingEditOpen && !isEditBookingAvailabilityOpen}
          onClose={() => {
            setIsBookingEditOpen(false)
            editBookingForm.reset()
          }}
          booking={selectedBooking}
          onSuccess={() => {
            refreshBookings()
          }}
          servicePackages={servicePackages}
          staffMembers={staffMembers}
          teams={teams}
          onOpenAvailabilityModal={() => {
            setIsEditBookingAvailabilityOpen(true)
          }}
          editForm={editBookingForm}
          assignmentType={editBookingAssignmentType}
          onAssignmentTypeChange={setEditBookingAssignmentType}
          calculateEndTime={calculateEndTime}
        />
      )}

      {/* Staff Availability Modal - Edit */}
      {editBookingFormData.service_package_id && editBookingFormData.booking_date && editBookingFormData.start_time && (
        <StaffAvailabilityModal
          isOpen={isEditBookingAvailabilityOpen}
          onClose={() => {
            setIsEditBookingAvailabilityOpen(false)
          }}
          assignmentType={editBookingAssignmentType === 'staff' ? 'individual' : 'team'}
          onSelectStaff={(staffId) => {
            editBookingForm.handleChange('staff_id', staffId)
            setIsEditBookingAvailabilityOpen(false)
            toast({
              title: 'Staff Selected',
              description: 'Staff member has been assigned to the booking',
            })
          }}
          onSelectTeam={(teamId) => {
            editBookingForm.handleChange('team_id', teamId)
            setIsEditBookingAvailabilityOpen(false)
            toast({
              title: 'Team Selected',
              description: 'Team has been assigned to the booking',
            })
          }}
          date={editBookingFormData.booking_date || ''}
          startTime={editBookingFormData.start_time || ''}
          endTime={
            editBookingFormData.service_package_id && editBookingFormData.start_time
              ? calculateEndTime(
                  editBookingFormData.start_time,
                  servicePackages.find(pkg => pkg.id === editBookingFormData.service_package_id)?.duration_minutes || 0
                )
              : (editBookingFormData.end_time || '')
          }
          servicePackageId={editBookingFormData.service_package_id || ''}
          servicePackageName={
            servicePackages.find(pkg => pkg.id === editBookingFormData.service_package_id)?.name
          }
          currentAssignedStaffId={editBookingFormData.staff_id}
          currentAssignedTeamId={editBookingFormData.team_id}
          excludeBookingId={selectedBooking?.id}
        />
      )}
    </div>
  )
}
