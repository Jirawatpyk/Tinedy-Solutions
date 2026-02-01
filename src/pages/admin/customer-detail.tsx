import type { CustomerRecord } from '@/types'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { useStaffList } from '@/hooks/useStaff'
import { useBookingsByCustomer } from '@/hooks/useBookings'
import { useBookingStatusManager } from '@/hooks/useBookingStatusManager'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useSoftDelete } from '@/hooks/use-soft-delete'
import { useOptimisticPayment, useOptimisticDelete } from '@/hooks/optimistic'
import { mapErrorToUserMessage, getDeleteErrorMessage } from '@/lib/error-messages'
import { type BookingFormState } from '@/hooks/useBookingForm'
import type { PackageSelectionData } from '@/components/service-packages'
import { useServicePackages } from '@/hooks/useServicePackages'
import { groupBookingsByRecurringGroup, sortRecurringGroup, countBookingsByStatus, isRecurringBooking } from '@/lib/recurring-utils'
import type { RecurringGroup, RecurringPattern } from '@/types/recurring-booking'
import { ArrowLeft, Edit } from 'lucide-react'
import * as XLSX from 'xlsx'
import { formatDate } from '@/lib/utils'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import type { Booking } from '@/types/booking'
import { StatusBadge, getPaymentStatusVariant, getPaymentStatusLabel } from '@/components/common/StatusBadge'

import {
  CustomerProfileHeader,
  CustomerMetricsSection,
  BookingActivityChart,
  BookingHistorySection,
  BookingModalsContainer,
} from '@/components/customer-detail'
import type { CustomerStats } from '@/components/customer-detail'

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

interface Team {
  id: string
  name: string
}

export function AdminCustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { softDelete } = useSoftDelete('bookings')

  // Initialize optimistic delete hook for customers
  const customerDeleteOps = useOptimisticDelete({
    table: 'customers',
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.customers.all })
      navigate(`/admin/customers`)
    },
  })

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
    enabled: !!id,
    enableRealtime: true,
  })

  const bookings = rawBookings as unknown as CustomerBooking[]
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Dialog states
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
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

  // Use useBookingStatusManager for status management
  const {
    showStatusConfirmDialog,
    pendingStatusChange,
    getStatusBadge,
    getAvailableStatuses,
    getStatusLabel,
    getStatusTransitionMessage,
    handleStatusChange,
    confirmStatusChange,
    cancelStatusChange,
  } = useBookingStatusManager({
    selectedBooking,
    setSelectedBooking,
    onSuccess: refetchBookings,
  })

  // Initialize optimistic payment hook
  const payment = useOptimisticPayment({
    selectedBooking,
    setSelectedBooking,
    onSuccess: refetchBookings,
  })

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
  const { packages: servicePackages } = useServicePackages()
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

  // Fetch stats only (for realtime updates)
  const fetchStats = useCallback(async () => {
    if (!id) return

    try {
      const { data: statsData, error: statsError } = await supabase
        .from('customer_lifetime_value')
        .select('*')
        .eq('id', id)
        .single()

      if (statsError) {
        console.warn('Stats view not available:', statsError)
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
      console.error('Error fetching stats:', error)
    }
  }, [id])

  const fetchCustomerDetails = useCallback(async () => {
    try {
      setLoading(true)

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (customerError) throw customerError
      setCustomer(customerData)

      await fetchStats()
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
  }, [id, toast, fetchStats])

  const fetchModalData = useCallback(async () => {
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .is('deleted_at', null)
        .order('name')

      if (teamsError) throw teamsError
      setTeams(teamsData || [])
    } catch (error) {
      console.error('Error fetching modal data:', error)
    }
  }, [])

  useEffect(() => {
    if (id) {
      Promise.all([
        fetchCustomerDetails(),
        fetchModalData()
      ])
    }
  }, [id, fetchCustomerDetails, fetchModalData])

  // Sync selectedBooking with bookings array when realtime updates occur
  useEffect(() => {
    if (selectedBooking) {
      const updatedBooking = bookings.find(b => b.id === selectedBooking.id)
      if (updatedBooking && JSON.stringify(updatedBooking) !== JSON.stringify(selectedBooking)) {
        setSelectedBooking(updatedBooking as unknown as Booking)
      }
    }
  }, [bookings, selectedBooking])

  // Refetch stats when bookings change (realtime update)
  const bookingsHash = useMemo(() => {
    return bookings.map(b => `${b.id}:${b.status}:${b.payment_status}:${b.total_price}`).join('|')
  }, [bookings])

  const prevBookingsHashRef = useRef(bookingsHash)
  useEffect(() => {
    if (bookingsHash !== prevBookingsHashRef.current) {
      prevBookingsHashRef.current = bookingsHash
      fetchStats()
    }
  }, [bookingsHash, fetchStats])

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

    setSelectedEditStaffId('')
    setSelectedEditTeamId('')

    if (booking.staff_id) {
      setEditBookingAssignmentType('staff')
    } else if (booking.team_id) {
      setEditBookingAssignmentType('team')
    } else {
      setEditBookingAssignmentType('none')
    }

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

    if (booking.service_package_id || ('package_v2_id' in booking && booking.package_v2_id)) {
      const packageId = ('package_v2_id' in booking && booking.package_v2_id) || booking.service_package_id

      const pkg = servicePackages.find(p => p.id === packageId)

      if (pkg) {
        const isTiered = 'pricing_model' in pkg && pkg.pricing_model === 'tiered'

        if (isTiered && 'area_sqm' in booking && 'frequency' in booking && booking.area_sqm && booking.frequency) {
          setEditPackageSelection({
            packageId: pkg.id,
            pricingModel: 'tiered',
            areaSqm: Number(booking.area_sqm) || 0,
            frequency: (booking.frequency as 1 | 2 | 4 | 8) || 1,
            price: booking.total_price || 0,
            requiredStaff: 1,
            packageName: pkg.name,
          })
        } else {
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
      fetchCustomerDetails()
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

  const archiveCustomer = () => {
    if (!id) return
    customerDeleteOps.softDelete.mutate({ id })
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

  // --- Filtering & grouping logic ---

  const filteredBookings = bookings.filter((booking) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = (
        booking.service?.name?.toLowerCase().includes(query) ||
        booking.staff?.full_name?.toLowerCase().includes(query) ||
        booking.status.toLowerCase().includes(query)
      )
      if (!matchesSearch) return false
    }

    if (statusFilter !== 'all' && booking.status !== statusFilter) {
      return false
    }

    if (paymentStatusFilter !== 'all' && booking.payment_status !== paymentStatusFilter) {
      return false
    }

    return true
  })

  const { combinedItems } = useMemo(() => {
    const recurring: RecurringGroup[] = []
    const standalone: typeof filteredBookings = []
    const processedGroupIds = new Set<string>()

    const recurringBookings = filteredBookings.filter(isRecurringBooking)
    const groupedMap = groupBookingsByRecurringGroup(recurringBookings)

    groupedMap.forEach((groupBookings, groupId) => {
      if (!processedGroupIds.has(groupId)) {
        const sortedBookings = sortRecurringGroup(groupBookings)
        const bookingStats = countBookingsByStatus(sortedBookings)
        const firstBooking = sortedBookings[0]

        recurring.push({
          groupId,
          pattern: firstBooking.recurring_pattern!,
          totalBookings: sortedBookings.length,
          bookings: sortedBookings,
          completedCount: bookingStats.completed,
          confirmedCount: bookingStats.confirmed,
          inProgressCount: bookingStats.inProgress,
          cancelledCount: bookingStats.cancelled,
          noShowCount: bookingStats.noShow,
          upcomingCount: bookingStats.upcoming,
        })

        processedGroupIds.add(groupId)
      }
    })

    filteredBookings.forEach((booking) => {
      if (!booking.is_recurring || !booking.recurring_group_id) {
        standalone.push(booking)
      }
    })

    const combined = [
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

    combined.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return { recurringGroups: recurring, standaloneBookings: standalone, combinedItems: combined }
  }, [filteredBookings])

  // Pagination logic
  const totalBookingsCount = combinedItems.reduce((count, item) => {
    if (item.type === 'group') {
      return count + item.data.bookings.length
    }
    return count + 1
  }, 0)

  const paginatedItems = useMemo(() => {
    let bookingsSoFar = 0
    const targetStart = (currentPage - 1) * itemsPerPage
    const targetEnd = targetStart + itemsPerPage
    const result: typeof combinedItems = []

    for (const item of combinedItems) {
      const itemBookingsCount = item.type === 'group' ? item.data.bookings.length : 1

      const itemStart = bookingsSoFar
      const itemEnd = bookingsSoFar + itemBookingsCount

      if (itemEnd > targetStart && itemStart < targetEnd) {
        result.push(item)
      }

      bookingsSoFar += itemBookingsCount

      if (bookingsSoFar >= targetEnd) break
    }

    return result
  }, [combinedItems, currentPage, itemsPerPage])

  const totalPages = Math.ceil(totalBookingsCount / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalBookingsCount)

  // Reset to page 1 when search query or status filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, paymentStatusFilter])

  // Export to Excel function
  const exportToExcel = () => {
    if (!customer) return

    const data = filteredBookings.map((booking) => ({
      'Date': formatDate(booking.booking_date),
      'Time': booking.start_time,
      'Service': booking.service?.name || booking.service_packages?.name || 'N/A',
      'Service Type': booking.service?.service_type || booking.service_packages?.service_type || 'N/A',
      'Staff': booking.staff?.full_name || booking.profiles?.full_name || 'N/A',
      'Team': booking.teams?.name || 'N/A',
      'Status': booking.status,
      'Amount (฿)': booking.total_price || 0,
      'Payment Status': booking.payment_status || 'unpaid',
      'Notes': booking.notes || '',
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)

    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 10 },
      { wch: 25 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 30 },
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Booking History')

    const filename = `${customer.full_name}_booking_history_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, filename)

    toast({
      title: 'Success',
      description: 'Booking history exported to Excel successfully',
    })
  }

  // --- Loading state ---

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

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SimpleTooltip content="Back">
            <Link to={`${basePath}/customers`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          </SimpleTooltip>
          <div>
            <p className="text-sm text-muted-foreground">View and manage customer details</p>
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2">
          <SimpleTooltip content="Edit">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsEditDialogOpen(true)}
              className="h-8 w-8 sm:hidden"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </SimpleTooltip>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="hidden sm:flex h-9"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>

          <PermissionAwareDeleteButton
            resource="customers"
            itemName={customer.full_name}
            onDelete={deleteCustomer}
            onCancel={archiveCustomer}
            cancelText="Archive"
            buttonVariant="outline"
            responsive
            warningMessage={
              stats?.total_bookings && stats.total_bookings > 0
                ? `This customer has ${stats.total_bookings} booking(s) that will also be deleted.`
                : undefined
            }
          />
        </div>
      </div>

      {/* Customer Profile Header */}
      <CustomerProfileHeader
        customer={customer}
        onCreateBooking={handleCreateBooking}
        onAddNote={() => setIsNoteDialogOpen(true)}
        onCopyLineId={() => {
          navigator.clipboard.writeText(customer.line_id || '')
          toast({
            title: 'LINE ID Copied',
            description: `"${customer.line_id}" copied to clipboard. Search in LINE app to start chat.`,
          })
        }}
      />

      {/* Customer Metrics */}
      <CustomerMetricsSection
        stats={stats}
        customerCreatedAt={customer.created_at}
      />

      {/* Customer Activity Chart */}
      <BookingActivityChart bookings={bookings} />

      {/* Booking History */}
      <BookingHistorySection
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        paymentStatusFilter={paymentStatusFilter}
        onPaymentStatusFilterChange={setPaymentStatusFilter}
        paginatedItems={paginatedItems}
        totalItems={totalBookingsCount}
        filteredBookingsCount={filteredBookings.length}
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={setCurrentPage}
        onExportExcel={exportToExcel}
        onBookingClick={(bookingId) => {
          setSelectedBookingId(bookingId)
          setIsBookingDetailModalOpen(true)
        }}
        onStatusChange={handleStatusChange}
        onVerifyPayment={(bookingId) => {
          const booking = bookings.find(b => b.id === bookingId)
          payment.verifyPayment.mutate({
            bookingId,
            recurringGroupId: booking?.recurring_group_id || undefined,
          })
        }}
        getStatusBadge={getStatusBadge}
        getAvailableStatuses={getAvailableStatuses}
        getStatusLabel={getStatusLabel}
        customerFullName={customer.full_name}
        customerEmail={customer.email}
      />

      {/* All Modals */}
      <BookingModalsContainer
        customer={customer}
        servicePackages={servicePackages}
        staffList={staffList}
        teams={teams}
        // Create booking modal
        isBookingDialogOpen={isBookingDialogOpen}
        onCloseBookingDialog={() => {
          setIsBookingDialogOpen(false)
          setCreatePackageSelection(null)
        }}
        onBookingSuccess={() => {
          setIsBookingDialogOpen(false)
          setCreatePackageSelection(null)
          refetchBookings()
        }}
        createAssignmentType={createAssignmentType}
        setCreateAssignmentType={setCreateAssignmentType}
        calculateEndTime={calculateEndTime}
        createPackageSelection={createPackageSelection}
        setCreatePackageSelection={setCreatePackageSelection}
        selectedCreateStaffId={selectedCreateStaffId}
        selectedCreateTeamId={selectedCreateTeamId}
        createRecurringDates={createRecurringDates}
        setCreateRecurringDates={setCreateRecurringDates}
        createRecurringPattern={createRecurringPattern}
        setCreateRecurringPattern={setCreateRecurringPattern}
        // Create availability modal
        isCreateAvailabilityModalOpen={isCreateAvailabilityModalOpen}
        onCloseCreateAvailability={() => setIsCreateAvailabilityModalOpen(false)}
        onOpenCreateAvailability={() => setIsCreateAvailabilityModalOpen(true)}
        createFormData={createFormData}
        onBeforeOpenCreateAvailability={(formData) => setCreateFormData(formData)}
        onSelectCreateStaff={(staffId) => {
          setSelectedCreateStaffId(staffId)
          setSelectedCreateTeamId('')
          setCreateAssignmentType('staff')
          setIsCreateAvailabilityModalOpen(false)
          toast({
            title: 'Staff Selected',
            description: 'Staff member has been assigned to the booking',
          })
        }}
        onSelectCreateTeam={(teamId) => {
          setSelectedCreateTeamId(teamId)
          setSelectedCreateStaffId('')
          setCreateAssignmentType('team')
          setIsCreateAvailabilityModalOpen(false)
          toast({
            title: 'Team Selected',
            description: 'Team has been assigned to the booking',
          })
        }}
        // Note dialog
        isNoteDialogOpen={isNoteDialogOpen}
        setIsNoteDialogOpen={setIsNoteDialogOpen}
        noteText={noteText}
        setNoteText={setNoteText}
        onAddNote={handleAddNote}
        submitting={submitting}
        // Edit customer dialog
        isEditDialogOpen={isEditDialogOpen}
        onCloseEditDialog={() => setIsEditDialogOpen(false)}
        onEditSuccess={fetchCustomerDetails}
        // Booking detail modal
        isBookingDetailModalOpen={isBookingDetailModalOpen}
        selectedBookingId={selectedBookingId}
        bookings={bookings}
        onCloseDetailModal={() => {
          setIsBookingDetailModalOpen(false)
          setSelectedBookingId(null)
          refetchBookings()
        }}
        onEditBooking={(booking) => handleEditBooking(booking as CustomerBooking | Booking)}
        onArchiveBooking={archiveBooking}
        onDeleteBooking={async (bookingId) => {
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
          } catch (_error) {
            toast({
              title: 'Error',
              description: 'Failed to delete booking',
              variant: 'destructive',
            })
          }
        }}
        onStatusChange={handleStatusChange}
        onMarkAsPaid={(bookingId, method) => {
          const booking = bookings.find(b => b.id === bookingId)
          payment.markAsPaid.mutate({
            bookingId,
            recurringGroupId: booking?.recurring_group_id || undefined,
            paymentMethod: method,
            amount: booking?.total_price || 0,
          })
        }}
        onVerifyPayment={(bookingId) => {
          const booking = bookings.find(b => b.id === bookingId)
          payment.verifyPayment.mutate({
            bookingId,
            recurringGroupId: booking?.recurring_group_id || undefined,
          })
        }}
        onRequestRefund={(bookingId) => {
          const booking = bookings.find(b => b.id === bookingId)
          payment.requestRefund.mutate({
            bookingId,
            recurringGroupId: booking?.recurring_group_id || undefined,
          })
        }}
        onCompleteRefund={(bookingId) => {
          const booking = bookings.find(b => b.id === bookingId)
          payment.completeRefund.mutate({
            bookingId,
            recurringGroupId: booking?.recurring_group_id || undefined,
          })
        }}
        onCancelRefund={(bookingId) => {
          const booking = bookings.find(b => b.id === bookingId)
          payment.cancelRefund.mutate({
            bookingId,
            recurringGroupId: booking?.recurring_group_id || undefined,
          })
        }}
        getStatusBadge={getStatusBadge}
        getPaymentStatusBadge={(status) => {
          const displayStatus = status === 'pending' ? 'unpaid' : (status || 'unpaid')
          return (
            <StatusBadge variant={getPaymentStatusVariant(displayStatus)}>
              {getPaymentStatusLabel(displayStatus)}
            </StatusBadge>
          )
        }}
        getAvailableStatuses={getAvailableStatuses}
        getStatusLabel={getStatusLabel}
        // Edit booking modal
        isBookingEditOpen={isBookingEditOpen}
        isEditBookingAvailabilityOpen={isEditBookingAvailabilityOpen}
        selectedBooking={selectedBooking}
        onCloseEditBooking={() => {
          setIsBookingEditOpen(false)
          editBookingForm.reset()
          setSelectedEditStaffId('')
          setSelectedEditTeamId('')
        }}
        onEditBookingSuccess={() => refetchBookings()}
        editBookingForm={editBookingForm}
        editBookingAssignmentType={editBookingAssignmentType}
        onEditAssignmentTypeChange={setEditBookingAssignmentType}
        editPackageSelection={editPackageSelection}
        setEditPackageSelection={setEditPackageSelection}
        selectedEditStaffId={selectedEditStaffId}
        selectedEditTeamId={selectedEditTeamId}
        // Edit availability modal
        editFormData={editFormData}
        onOpenEditAvailability={() => setIsEditBookingAvailabilityOpen(true)}
        onBeforeOpenEditAvailability={(formData) => setEditFormData(formData)}
        onCloseEditAvailability={() => setIsEditBookingAvailabilityOpen(false)}
        onSelectEditStaff={(staffId) => {
          setSelectedEditStaffId(staffId)
          setSelectedEditTeamId('')
          setEditBookingAssignmentType('staff')
          setIsEditBookingAvailabilityOpen(false)
          toast({
            title: 'Staff Selected',
            description: 'Staff member has been assigned to the booking',
          })
        }}
        onSelectEditTeam={(teamId) => {
          setSelectedEditTeamId(teamId)
          setSelectedEditStaffId('')
          setEditBookingAssignmentType('team')
          setIsEditBookingAvailabilityOpen(false)
          toast({
            title: 'Team Selected',
            description: 'Team has been assigned to the booking',
          })
        }}
        editBookingFormState={editBookingFormState}
        // Status confirm dialog
        showStatusConfirmDialog={showStatusConfirmDialog}
        pendingStatusChange={pendingStatusChange}
        getStatusTransitionMessage={getStatusTransitionMessage}
        confirmStatusChange={confirmStatusChange}
        cancelStatusChange={cancelStatusChange}
      />
    </div>
  )
}
