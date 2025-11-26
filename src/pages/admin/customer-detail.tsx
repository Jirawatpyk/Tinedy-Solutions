import type { CustomerRecord } from '@/types'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useStaffList } from '@/hooks/useStaff'
import { useBookingsByCustomer } from '@/hooks/useBookings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useSoftDelete } from '@/hooks/use-soft-delete'
import { mapErrorToUserMessage, getDeleteErrorMessage } from '@/lib/error-messages'
import { BookingEditModal, BookingCreateModal } from '@/components/booking'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import { type BookingFormState } from '@/hooks/useBookingForm'
import type { PackageSelectionData } from '@/components/service-packages'
import { useServicePackages } from '@/hooks/useServicePackages'
import { RecurringBookingCard } from '@/components/booking/RecurringBookingCard'
import { groupBookingsByRecurringGroup, sortRecurringGroup, countBookingsByStatus } from '@/lib/recurring-utils'
import type { RecurringGroup, RecurringBookingRecord, RecurringPattern } from '@/types/recurring-booking'
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
  User,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react'
import { formatDate, getBangkokDateString } from '@/lib/utils'
import { formatTime } from '@/lib/booking-utils'
import { getTagColor } from '@/lib/tag-utils'
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog'
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
import { BookingDetailModal } from '@/pages/admin/booking-detail-modal'
import type { Booking } from '@/types/booking'
import { StatusBadge, getPaymentStatusVariant, getPaymentStatusLabel } from '@/components/common/StatusBadge'

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
  package_v2_id?: string | null
  area_sqm?: number | null
  frequency?: 1 | 2 | 4 | 8 | null
  payment_status?: string
  payment_method?: string
  amount_paid?: number
  payment_date?: string
  payment_notes?: string
  created_at: string
  is_recurring: boolean
  recurring_group_id: string | null
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

interface Team {
  id: string
  name: string
}

// BookingFormState imported from @/hooks/useBookingForm

export function AdminCustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { softDelete } = useSoftDelete('bookings')

  // Both admin and manager use /admin routes
  const basePath = '/admin'

  const [customer, setCustomer] = useState<CustomerRecord | null>(null)
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Use React Query hook for bookings data (filtered by customer ID)
  const {
    bookings: rawBookings,
    isLoading: bookingsLoading,
    refetch: refetchBookings
  } = useBookingsByCustomer({
    customerId: id || '',
    showArchived: false,
    enableRealtime: true,
    enabled: !!id,
  })

  // Cast bookings to CustomerBooking[] type (compatible with Booking type from hook)
  const bookings = rawBookings as unknown as CustomerBooking[]
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Dialog states
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isBookingDetailModalOpen, setIsBookingDetailModalOpen] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  // Edit Booking Modal State
  const [isBookingEditOpen, setIsBookingEditOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [editBookingAssignmentType, setEditBookingAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [editBookingFormState, setEditBookingFormState] = useState<BookingFormState>({})
  const [isEditBookingAvailabilityOpen, setIsEditBookingAvailabilityOpen] = useState(false)
  const [editPackageSelection, setEditPackageSelection] = useState<PackageSelectionData | null>(null)
  const [editFormData, setEditFormData] = useState<{
    booking_date?: string
    start_time?: string
    end_time?: string
    service_package_id?: string
    package_v2_id?: string
  } | null>(null)
  const [selectedEditStaffId, setSelectedEditStaffId] = useState<string>('')
  const [selectedEditTeamId, setSelectedEditTeamId] = useState<string>('')

  // Data for modals
  // ใช้ custom hook สำหรับโหลด packages ทั้ง V1 และ V2
  const { packages: servicePackages } = useServicePackages()
  // Use React Query hook for staff list
  const { staffList } = useStaffList({ role: 'staff', enableRealtime: false })
  const [teams, setTeams] = useState<Team[]>([])

  // Form states
  const [noteText, setNoteText] = useState('')
  const [createAssignmentType, setCreateAssignmentType] = useState<'none' | 'staff' | 'team'>('none')
  const [createPackageSelection, setCreatePackageSelection] = useState<PackageSelectionData | null>(null)

  // Recurring Bookings State (for Create Modal)
  const [createRecurringDates, setCreateRecurringDates] = useState<string[]>([])
  const [createRecurringPattern, setCreateRecurringPattern] = useState<RecurringPattern>('auto-monthly')

  // Staff Availability Modal State (for Create Modal)
  const [isCreateAvailabilityModalOpen, setIsCreateAvailabilityModalOpen] = useState(false)
  const [createFormData, setCreateFormData] = useState<{
    booking_date?: string
    start_time?: string
    end_time?: string
    service_package_id?: string
    package_v2_id?: string
  } | null>(null)
  const [selectedCreateStaffId, setSelectedCreateStaffId] = useState<string>('')
  const [selectedCreateTeamId, setSelectedCreateTeamId] = useState<string>('')

  const [submitting, setSubmitting] = useState(false)

  const archiveBooking = async (bookingId: string) => {
    const result = await softDelete(bookingId)
    if (result.success) {
      setIsBookingDetailModalOpen(false)
      setSelectedBookingId(null)
      refetchBookings()
    }
  }

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

  const fetchModalData = useCallback(async () => {
    try {
      // Staff list โหลดผ่าน useStaffList hook แล้ว
      // Service packages โหลดผ่าน useServicePackages hook แล้ว

      // Fetch teams only
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (teamsError) throw teamsError
      setTeams(teamsData || [])
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

  // Teams are fetched in fetchModalData, which is called on mount
  // Staff list and service packages are loaded via React Query hooks
  // No need for separate effect for isBookingDialogOpen

  // Sync selectedBooking with bookings array when realtime updates occur
  useEffect(() => {
    if (selectedBooking) {
      const updatedBooking = bookings.find(b => b.id === selectedBooking.id)
      if (updatedBooking && JSON.stringify(updatedBooking) !== JSON.stringify(selectedBooking)) {
        setSelectedBooking(updatedBooking as unknown as Booking)
      }
    }
  }, [bookings, selectedBooking])

  // Calculate end_time from start_time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60) % 24
    const endMinutes = totalMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
  }

  // Handle Create Booking - Auto-fill customer data
  const handleCreateBooking = useCallback(() => {
    if (!customer) return

    // Open booking dialog - customer data will be pre-filled via default* props
    setIsBookingDialogOpen(true)
  }, [customer])

  // Edit Booking Form Helpers
  const editBookingForm = {
    formData: editBookingFormState,
    handleChange: <K extends keyof BookingFormState>(field: K, value: BookingFormState[K]) => {
      setEditBookingFormState(prev => ({ ...prev, [field]: value }))
    },
    setValues: (values: Partial<BookingFormState>) => {
      setEditBookingFormState(prev => ({ ...prev, ...values }))
    },
    reset: () => {
      setEditBookingFormState({})
      setEditBookingAssignmentType('none')
    }
  }

  const handleEditBooking = (booking: CustomerBooking | Booking) => {
    // Populate edit form with booking data
    setEditBookingFormState({
      service_package_id: booking.service_package_id,
      package_v2_id: 'package_v2_id' in booking ? (booking.package_v2_id || undefined) : undefined,
      area_sqm: 'area_sqm' in booking ? (booking.area_sqm || undefined) : undefined,
      frequency: 'frequency' in booking ? (booking.frequency || undefined) : undefined,
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

    // Reset selected staff/team from availability modal
    setSelectedEditStaffId('')
    setSelectedEditTeamId('')

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
      package_v2_id: 'package_v2_id' in booking ? booking.package_v2_id : null,
      area_sqm: 'area_sqm' in booking ? booking.area_sqm : null,
      frequency: 'frequency' in booking ? booking.frequency : null,
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

    // Set package selection for PackageSelector component
    if (booking.service_package_id || ('package_v2_id' in booking && booking.package_v2_id)) {
      const packageId = ('package_v2_id' in booking && booking.package_v2_id) || booking.service_package_id

      // หา package จาก unified packages (รวม V1 + V2 แล้ว)
      const pkg = servicePackages.find(p => p.id === packageId)

      if (pkg) {
        // Check if this is a V2 Tiered Pricing package
        const isTiered = 'pricing_model' in pkg && pkg.pricing_model === 'tiered'

        if (isTiered && 'area_sqm' in booking && 'frequency' in booking && booking.area_sqm && booking.frequency) {
          // V2 Tiered Pricing - restore area and frequency
          setEditPackageSelection({
            packageId: pkg.id,
            pricingModel: 'tiered',
            areaSqm: Number(booking.area_sqm) || 0,
            frequency: (booking.frequency as 1 | 2 | 4 | 8) || 1,
            price: booking.total_price || 0,
            requiredStaff: 1, // Will be recalculated by PackageSelector
            packageName: pkg.name,
          })
        } else {
          // Fixed Pricing (V1 หรือ V2)
          setEditPackageSelection({
            packageId: pkg.id,
            pricingModel: 'fixed',
            price: Number(pkg.base_price || booking.total_price || 0),
            requiredStaff: 1,
            packageName: pkg.name,
            estimatedHours: pkg.duration_minutes ? pkg.duration_minutes / 60 : undefined,
          })
        }
      }
    }

    setSelectedBooking(bookingForModal)
    setIsBookingEditOpen(true)
    setIsBookingDetailModalOpen(false)
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
      const errorMsg = mapErrorToUserMessage(error, 'customer')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
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
      navigate(`${basePath}/customers`)
    } catch (error) {
      console.error('Error deleting customer:', error)
      const errorMsg = getDeleteErrorMessage('customer')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
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

  // Group bookings by recurring groups (similar to BookingList component)
  const { combinedItems } = useMemo(() => {
    const recurring: RecurringGroup[] = []
    const standalone: typeof filteredBookings = []
    const processedGroupIds = new Set<string>()

    // Group recurring bookings
    const groupedMap = groupBookingsByRecurringGroup(filteredBookings as unknown as RecurringBookingRecord[])

    groupedMap.forEach((groupBookings, groupId) => {
      if (!processedGroupIds.has(groupId)) {
        const sortedBookings = sortRecurringGroup(groupBookings)
        const stats = countBookingsByStatus(sortedBookings)
        const firstBooking = sortedBookings[0]

        recurring.push({
          groupId,
          pattern: firstBooking.recurring_pattern!,
          totalBookings: sortedBookings.length,
          bookings: sortedBookings,
          completedCount: stats.completed,
          confirmedCount: stats.confirmed,
          cancelledCount: stats.cancelled,
          noShowCount: stats.noShow,
          upcomingCount: stats.upcoming,
        })

        processedGroupIds.add(groupId)
      }
    })

    // Non-recurring bookings
    filteredBookings.forEach((booking) => {
      if (!booking.is_recurring || !booking.recurring_group_id) {
        standalone.push(booking)
      }
    })

    // Combine groups and standalone bookings, sorted by created_at (newest first)
    type CombinedItem =
      | { type: 'group'; data: RecurringGroup; createdAt: string }
      | { type: 'booking'; data: typeof filteredBookings[0]; createdAt: string }

    const combined: CombinedItem[] = [
      ...recurring.map(group => ({
        type: 'group' as const,
        data: group,
        createdAt: group.bookings[0].created_at || ''
      })),
      ...standalone.map(booking => ({
        type: 'booking' as const,
        data: booking,
        createdAt: booking.created_at || ''
      }))
    ]

    // Sort by created_at (newest first)
    combined.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return { recurringGroups: recurring, standaloneBookings: standalone, combinedItems: combined }
  }, [filteredBookings])

  // Pagination logic - limit by total number of bookings (not items)
  // Count total bookings (groups expanded into individual bookings)
  const totalBookingsCount = combinedItems.reduce((count, item) => {
    if (item.type === 'group') {
      return count + item.data.bookings.length
    }
    return count + 1
  }, 0)

  // Paginate by bookings count (not items)
  const paginatedItems = useMemo(() => {
    let bookingsSoFar = 0
    const targetStart = (currentPage - 1) * itemsPerPage
    const targetEnd = targetStart + itemsPerPage
    const result: typeof combinedItems = []

    for (const item of combinedItems) {
      const itemBookingsCount = item.type === 'group' ? item.data.bookings.length : 1

      // Check if this item's bookings fall within the current page range
      const itemStart = bookingsSoFar
      const itemEnd = bookingsSoFar + itemBookingsCount

      // If any part of this item overlaps with target range, include it
      if (itemEnd > targetStart && itemStart < targetEnd) {
        result.push(item)
      }

      bookingsSoFar += itemBookingsCount

      // Stop if we've passed the end of the target range
      if (bookingsSoFar >= targetEnd) break
    }

    return result
  }, [combinedItems, currentPage, itemsPerPage])

  const totalPages = Math.ceil(totalBookingsCount / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalBookingsCount)

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Prepare chart data - bookings by month for last 6 months (only months with data, up to current month)
  const getChartData = (): ChartDataPoint[] => {
    const monthsMap = new Map<string, ChartDataPoint>()
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of current month

    // Count bookings by month and status (only for last 6 months, up to current month)
    bookings.forEach((booking) => {
      const bookingDate = new Date(booking.booking_date)

      // Only include bookings from last 6 months AND not future months
      if (bookingDate >= sixMonthsAgo && bookingDate <= currentMonthEnd) {
        const monthKey = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`
        const monthName = bookingDate.toLocaleDateString('en-US', { month: 'short' })

        if (!monthsMap.has(monthKey)) {
          monthsMap.set(monthKey, {
            month: monthName,
            monthKey,
            completed: 0,
            cancelled: 0,
            pending: 0,
            total: 0,
          })
        }

        const monthData = monthsMap.get(monthKey)!
        monthData.total++
        if (booking.status === 'completed') monthData.completed++
        else if (booking.status === 'cancelled') monthData.cancelled++
        else if (booking.status === 'pending') monthData.pending++
      }
    })

    // Convert map to array and sort by monthKey (chronological order)
    return Array.from(monthsMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey))
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
      `฿${booking.total_price || 0}`,
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

  if (loading || bookingsLoading || !customer) {
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
    in_progress: { label: 'In Progress', className: 'bg-purple-100 text-purple-700 border-purple-300' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-300' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-300' },
    no_show: { label: 'No Show', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`${basePath}/customers`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">View and manage customer details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsEditDialogOpen(true)}
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
                      Source: {customer.source === 'other' ? customer.source_other || 'Other' : customer.source}
                    </Badge>
                  )}
                  {customer.tags && customer.tags.length > 0 && (
                    customer.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className={`text-xs ${getTagColor(tag)}`}>
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
                onClick={handleCreateBooking}
              >
                <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">New Booking</span>
              </Button>
              <a href={`tel:${customer.phone}`}>
                <Button className="w-full justify-start" variant="outline">
                  <PhoneCall className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Call Customer</span>
                </Button>
              </a>
              <a href={`mailto:${customer.email}`}>
                <Button className="w-full justify-start" variant="outline">
                  <Send className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Send Email</span>
                </Button>
              </a>
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
                ? stats.days_since_last_booking === 0
                  ? 'Today'
                  : stats.days_since_last_booking === 1
                  ? '1 day ago'
                  : `${stats.days_since_last_booking} days ago`
                : 'No service yet'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.last_booking_date
                ? formatDate(stats.last_booking_date)
                : 'No completed booking'}
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
          {combinedItems.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No bookings found matching your search' : 'No booking history yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedItems.map((item) => {
                if (item.type === 'group') {
                  // Render Recurring Booking Group Card
                  return (
                    <RecurringBookingCard
                      key={`group-${item.data.groupId}`}
                      group={item.data}
                      onBookingClick={(bookingId) => {
                        setSelectedBookingId(bookingId)
                        setIsBookingDetailModalOpen(true)
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

                          refetchBookings()
                        } catch (error) {
                          toast({
                            title: 'Error',
                            description: 'Failed to update status',
                            variant: 'destructive',
                          })
                        }
                      }}
                      getAvailableStatuses={(currentStatus) => {
                        const statusFlow: Record<string, string[]> = {
                          pending: ['pending', 'confirmed', 'cancelled', 'no_show'],
                          confirmed: ['confirmed', 'in_progress', 'cancelled', 'no_show'],
                          in_progress: ['in_progress', 'completed', 'cancelled'],
                          completed: ['completed'],
                          cancelled: ['cancelled'],
                          no_show: ['no_show']
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
                          no_show: 'No Show'
                        }
                        return labels[status] || status
                      }}
                    />
                  )
                } else {
                  // Render Individual Booking Card
                  const booking = item.data
                  const statusInfo = statusConfig[booking.status] || {
                    label: booking.status,
                    className: 'bg-gray-100 text-gray-700 border-gray-300'
                  }
                  return (
                    <Card
                      key={`booking-${booking.id}`}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedBookingId(booking.id)
                        setIsBookingDetailModalOpen(true)
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            {/* 1. ชื่อลูกค้า + Booking ID */}
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-tinedy-dark">
                                  {customer.full_name}
                                  <span className="ml-2 text-sm font-mono text-muted-foreground font-normal">
                                    #{booking.id.slice(0, 8)}
                                  </span>
                                </p>
                                {/* 2. Email */}
                                <p className="text-sm text-muted-foreground">
                                  {customer.email}
                                </p>
                              </div>
                              <div className="sm:hidden">
                                <Badge variant="outline" className={statusInfo.className}>
                                  {statusInfo.label}
                                </Badge>
                              </div>
                            </div>

                            {/* 3. Service Type Badge + Package Name */}
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                              <span className="inline-flex items-center">
                                <Badge variant="outline" className="mr-2">
                                  {booking.service?.service_type || booking.service_packages?.service_type || 'N/A'}
                                </Badge>
                                {booking.service?.name || booking.service_packages?.name || 'N/A'}
                              </span>
                            </div>

                            {/* 4. วันที่ • เวลา */}
                            <div className="text-sm text-muted-foreground">
                              {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} - {booking.end_time ? formatTime(booking.end_time) : 'N/A'}
                            </div>

                            {/* 5. Staff/Team */}
                            {booking.profiles && (
                              <p className="text-sm text-tinedy-blue flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Staff: {booking.profiles.full_name}
                              </p>
                            )}
                            {booking.teams && (
                              <p className="text-sm text-tinedy-green flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Team: {booking.teams.name}
                              </p>
                            )}
                          </div>

                          {/* 6. ราคา + Status ด้านขวา */}
                          <div className="flex flex-col items-end gap-4">
                            <div>
                              <p className="font-semibold text-tinedy-dark text-lg">
                                ฿{booking.total_price?.toLocaleString() || 0}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2 items-center sm:items-end">
                              <Badge variant="outline" className={statusInfo.className}>
                                {statusInfo.label}
                              </Badge>
                              <StatusBadge variant={getPaymentStatusVariant(booking.payment_status || 'unpaid')}>
                                {getPaymentStatusLabel(booking.payment_status || 'unpaid')}
                              </StatusBadge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                }
              })}

            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{endIndex} of {totalBookingsCount} bookings
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
        </CardContent>
      </Card>

      {/* New Booking Modal */}
      <BookingCreateModal
        isOpen={isBookingDialogOpen}
        onClose={() => {
          setIsBookingDialogOpen(false)
          setCreatePackageSelection(null)
        }}
        onSuccess={() => {
          setIsBookingDialogOpen(false)
          setCreatePackageSelection(null)
          refetchBookings()
        }}
        servicePackages={servicePackages}
        staffMembers={staffList}
        teams={teams}
        onOpenAvailabilityModal={() => {
          setIsCreateAvailabilityModalOpen(true)
        }}
        onBeforeOpenAvailability={(formData) => {
          setCreateFormData(formData)
        }}
        assignmentType={createAssignmentType}
        setAssignmentType={setCreateAssignmentType}
        calculateEndTime={calculateEndTime}
        packageSelection={createPackageSelection}
        setPackageSelection={setCreatePackageSelection}
        defaultCustomerId={customer?.id}
        defaultFullName={customer?.full_name}
        defaultEmail={customer?.email}
        defaultPhone={customer?.phone}
        defaultAddress={customer?.address || ''}
        defaultCity={customer?.city || ''}
        defaultState={customer?.state || ''}
        defaultZipCode={customer?.zip_code || ''}
        defaultStaffId={selectedCreateStaffId}
        defaultTeamId={selectedCreateTeamId}
        recurringDates={createRecurringDates}
        setRecurringDates={setCreateRecurringDates}
        recurringPattern={createRecurringPattern}
        setRecurringPattern={setCreateRecurringPattern}
      />

      {/* Staff Availability Modal (for Create) */}
      {createFormData && (createFormData.service_package_id || createFormData.package_v2_id) && (createRecurringDates.length > 0 || createFormData.booking_date) && createFormData.start_time && (
        <StaffAvailabilityModal
          isOpen={isCreateAvailabilityModalOpen}
          onClose={() => setIsCreateAvailabilityModalOpen(false)}
          assignmentType={createAssignmentType === 'staff' ? 'individual' : 'team'}
          date={createRecurringDates.length === 0 ? createFormData.booking_date : undefined}
          dates={createRecurringDates.length > 0 ? createRecurringDates : undefined}
          startTime={createFormData.start_time}
          endTime={createFormData.end_time || ''}
          servicePackageId={createFormData.service_package_id || createFormData.package_v2_id || ''}
          onSelectStaff={(staffId) => {
            setSelectedCreateStaffId(staffId)
            setSelectedCreateTeamId('')
            setCreateAssignmentType('staff')
            setIsCreateAvailabilityModalOpen(false)
            toast({
              title: 'Staff Selected',
              description: 'Staff member has been assigned to the booking',
            })
          }}
          onSelectTeam={(teamId) => {
            setSelectedCreateTeamId(teamId)
            setSelectedCreateStaffId('')
            setCreateAssignmentType('team')
            setIsCreateAvailabilityModalOpen(false)
            toast({
              title: 'Team Selected',
              description: 'Team has been assigned to the booking',
            })
          }}
        />
      )}

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
      <CustomerFormDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSuccess={fetchCustomerDetails}
        customer={customer}
      />

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

      {/* Booking Detail Modal */}
      {selectedBookingId && (
        <BookingDetailModal
          booking={bookings.find(b => b.id === selectedBookingId) || null}
          isOpen={isBookingDetailModalOpen}
          onClose={() => {
            setIsBookingDetailModalOpen(false)
            setSelectedBookingId(null)
            refetchBookings()
          }}
          onEdit={(booking) => {
            handleEditBooking(booking)
          }}
          onCancel={archiveBooking}
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
              refetchBookings()
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

              refetchBookings()
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
                  payment_date: getBangkokDateString(),
                  amount_paid: booking?.total_price || 0,
                })
                .eq('id', bookingId)

              if (error) throw error

              toast({
                title: 'Success',
                description: 'Payment marked as paid',
              })

              refetchBookings()
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
            // Map 'pending' to 'unpaid' for display
            const displayStatus = status === 'pending' ? 'unpaid' : (status || 'unpaid')
            return (
              <StatusBadge variant={getPaymentStatusVariant(displayStatus)}>
                {getPaymentStatusLabel(displayStatus)}
              </StatusBadge>
            )
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
            setSelectedEditStaffId('')
            setSelectedEditTeamId('')
          }}
          booking={selectedBooking}
          onSuccess={() => {
            refetchBookings()
          }}
          servicePackages={servicePackages}
          staffMembers={staffList}
          teams={teams}
          onOpenAvailabilityModal={() => {
            setIsEditBookingAvailabilityOpen(true)
          }}
          onBeforeOpenAvailability={(formData) => {
            setEditFormData(formData)
          }}
          editForm={editBookingForm}
          assignmentType={editBookingAssignmentType}
          onAssignmentTypeChange={setEditBookingAssignmentType}
          calculateEndTime={calculateEndTime}
          packageSelection={editPackageSelection}
          setPackageSelection={setEditPackageSelection}
          defaultStaffId={selectedEditStaffId}
          defaultTeamId={selectedEditTeamId}
        />
      )}

      {/* Staff Availability Modal - Edit */}
      {editFormData && (editFormData.service_package_id || editFormData.package_v2_id) && editFormData.booking_date && editFormData.start_time && (
        <StaffAvailabilityModal
          isOpen={isEditBookingAvailabilityOpen}
          onClose={() => {
            setIsEditBookingAvailabilityOpen(false)
          }}
          assignmentType={editBookingAssignmentType === 'staff' ? 'individual' : 'team'}
          onSelectStaff={(staffId) => {
            setSelectedEditStaffId(staffId)
            setSelectedEditTeamId('')
            setEditBookingAssignmentType('staff')
            setIsEditBookingAvailabilityOpen(false)
            toast({
              title: 'Staff Selected',
              description: 'Staff member has been assigned to the booking',
            })
          }}
          onSelectTeam={(teamId) => {
            setSelectedEditTeamId(teamId)
            setSelectedEditStaffId('')
            setEditBookingAssignmentType('team')
            setIsEditBookingAvailabilityOpen(false)
            toast({
              title: 'Team Selected',
              description: 'Team has been assigned to the booking',
            })
          }}
          date={editFormData.booking_date || ''}
          startTime={editFormData.start_time || ''}
          endTime={editFormData.end_time || ''}
          servicePackageId={editFormData.service_package_id || editFormData.package_v2_id || ''}
          servicePackageName={
            servicePackages.find(pkg => pkg.id === (editFormData.service_package_id || editFormData.package_v2_id))?.name
          }
          currentAssignedStaffId={editBookingFormState.staff_id}
          currentAssignedTeamId={editBookingFormState.team_id}
          excludeBookingId={selectedBooking?.id}
        />
      )}
    </div>
  )
}
