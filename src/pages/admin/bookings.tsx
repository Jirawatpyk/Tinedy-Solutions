import { useEffect, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useBookingFilters } from '@/hooks/useBookingFilters'
import { usePagination } from '@/hooks/useBookingPagination'
import { useConflictDetection } from '@/hooks/useConflictDetection'
import { useBookingForm } from '@/hooks/useBookingForm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Trash2, Users, User, Info, X, Calendar, Download, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BookingDetailModal } from './booking-detail-modal'
import { getErrorMessage } from '@/lib/error-utils'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import { StatusBadge, getBookingStatusVariant, getPaymentStatusVariant, getBookingStatusLabel, getPaymentStatusLabel } from '@/components/common/StatusBadge'

// Helper function to format full address
function formatFullAddress(booking: { address: string; city: string; state: string; zip_code: string }): string {
  const parts = [
    booking.address,
    booking.city,
    booking.state,
    booking.zip_code
  ].filter(part => part && part.trim())

  return parts.join(', ')
}

interface Booking {
  id: string
  booking_date: string
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
  service_package_id: string
  notes: string | null
  payment_status?: string
  payment_method?: string
  amount_paid?: number
  payment_date?: string
  payment_notes?: string
  customers: { id: string; full_name: string; email: string } | null
  service_packages: { name: string; service_type: string } | null
  profiles: { full_name: string } | null
  teams: { name: string } | null
}

interface Customer {
  id: string
  full_name: string
  email: string
  phone: string
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
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

export function AdminBookings() {
  const location = useLocation()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [assignmentType, setAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [editAssignmentType, setEditAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null)
  const [checkingCustomer, setCheckingCustomer] = useState(false)
  // Booking filters hook
  const {
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount,
    setQuickFilter
  } = useBookingFilters()
  // Items per page state (for dynamic pagination)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  // Pagination hook
  const {
    items: paginatedBookings,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    goToPage,
    metadata
  } = usePagination(filteredBookings, {
    initialPage: 1,
    itemsPerPage: itemsPerPage
  })
  // Detail Modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false)
  // Edit Booking Form - Using useBookingForm hook
  const editForm = useBookingForm({
    onSubmit: async () => {
      // This will be handled by the existing handleEditSubmit logic
    }
  })
  // Bulk Actions
  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  // Conflict Detection (using hook)
  const {
    conflicts,
    checkConflicts,
    clearConflicts,
  } = useConflictDetection()
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [pendingBookingData, setPendingBookingData] = useState<Record<string, unknown> | null>(null)
  const [conflictOverride, setConflictOverride] = useState(false)
  // Status Workflow
  const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    bookingId: string
    currentStatus: string
    newStatus: string
  } | null>(null)
  // Staff Availability Modal
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false)
  const [isEditAvailabilityModalOpen, setIsEditAvailabilityModalOpen] = useState(false)
  const { toast } = useToast()

  // Create Booking Form - Using useBookingForm hook
  const createForm = useBookingForm({
    onSubmit: async () => {
      // This will be handled by the existing handleSubmit logic
      // We'll keep the existing submission flow but manage state with hook
    }
  })

  const fetchBookings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customers (id, full_name, email),
          service_packages (name, service_type),
          profiles (full_name),
          teams (name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const filterBookings = useCallback(() => {
    let filtered = bookings

    if (filters.searchQuery) {
      filtered = filtered.filter(
        (booking) =>
          booking.customers?.full_name
            .toLowerCase()
            .includes(filters.searchQuery.toLowerCase()) ||
          booking.service_packages?.name
            .toLowerCase()
            .includes(filters.searchQuery.toLowerCase())
      )
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter((booking) => booking.status === filters.status)
    }

    if (filters.staffId !== 'all') {
      if (filters.staffId === 'unassigned') {
        filtered = filtered.filter((booking) => !booking.staff_id)
      } else {
        filtered = filtered.filter((booking) => booking.staff_id === filters.staffId)
      }
    }

    if (filters.teamId !== 'all') {
      filtered = filtered.filter((booking) => booking.team_id === filters.teamId)
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter((booking) => booking.booking_date >= filters.dateFrom)
    }

    if (filters.dateTo) {
      filtered = filtered.filter((booking) => booking.booking_date <= filters.dateTo)
    }

    // Service type filter
    if (filters.serviceType !== 'all') {
      filtered = filtered.filter(
        (booking) => booking.service_packages?.service_type === filters.serviceType
      )
    }

    setFilteredBookings(filtered)
  }, [bookings, filters])

  useEffect(() => {
    fetchBookings()
    fetchServicePackages()
    fetchStaffMembers()
    fetchTeams()
  }, [fetchBookings])

  useEffect(() => {
    filterBookings()
  }, [filterBookings])

  // Reset to page 1 when filters change
  useEffect(() => {
    goToPage(1)
  }, [filters, goToPage])

  // Handle navigation from Dashboard - open Edit modal
  useEffect(() => {
    const state = location.state as { editBookingId?: string; bookingData?: Booking; createBooking?: boolean; bookingDate?: string } | null

    // Handle create booking from Calendar
    if (state?.createBooking && state?.bookingDate) {
      // Pre-fill the booking date using hook
      createForm.setValues({ booking_date: state.bookingDate || '' })
      // Open create dialog
      setIsDialogOpen(true)
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, document.title)
      return
    }

    // Handle edit booking from Dashboard/Calendar
    if (state?.editBookingId && bookings.length > 0) {
      const booking = bookings.find(b => b.id === state.editBookingId)
      if (booking) {
        // Open edit modal - populate form using hook
        editForm.setValues({
          customer_id: booking.customers?.id || '',
          service_package_id: booking.service_package_id,
          staff_id: booking.staff_id || '',
          team_id: booking.team_id || '',
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          address: booking.address,
          city: booking.city || '',
          state: booking.state || '',
          zip_code: booking.zip_code || '',
          notes: booking.notes || '',
          total_price: Number(booking.total_price),
          status: booking.status,
        })

        // Set assignment type based on booking data
        if (booking.staff_id) {
          setEditAssignmentType('staff')
        } else if (booking.team_id) {
          setEditAssignmentType('team')
        } else {
          setEditAssignmentType('none')
        }

        setIsEditOpen(true)
        setIsDetailOpen(false)

        // Clear the state to prevent reopening on refresh
        window.history.replaceState({}, document.title)
      }
    }
  }, [location.state, bookings, createForm, editForm])

  const fetchServicePackages = async () => {
    try {
      const { data, error } = await supabase
        .from('service_packages')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setServicePackages(data || [])
    } catch (error) {
      console.error('Error fetching service packages:', error)
    }
  }

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name')

      if (error) throw error
      setStaffMembers(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

  // Calculate end_time from start_time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    if (!startTime) return ''
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60) % 24
    const endMinutes = totalMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
  }

  // Format time to remove seconds (HH:MM:SS -> HH:MM)
  const formatTime = (time: string) => {
    return time.split(':').slice(0, 2).join(':')
  }

  // Check existing customer by email
  const handleEmailBlur = async () => {
    if (!createForm.formData.email || createForm.formData.email.trim() === '') return

    setCheckingCustomer(true)

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', createForm.formData.email.trim())
        .single()

      if (data && !error) {
        setExistingCustomer(data)
        toast({
          title: 'Customer Found!',
          description: `${data.full_name} (${data.phone})`,
          duration: 10000,
        })
      } else {
        setExistingCustomer(null)
      }
    } catch (error) {
      setExistingCustomer(null)
    } finally {
      setCheckingCustomer(false)
    }
  }

  // Check existing customer by phone
  const handlePhoneBlur = async () => {
    if (!createForm.formData.phone || createForm.formData.phone.trim() === '' || existingCustomer) return

    setCheckingCustomer(true)

    try {
      const { data, error} = await supabase
        .from('customers')
        .select('*')
        .eq('phone', createForm.formData.phone.trim())
        .single()

      if (data && !error) {
        setExistingCustomer(data)
        toast({
          title: 'Customer Found (by Phone)!',
          description: `${data.full_name} (${data.email})`,
          duration: 10000,
        })
      }
    } catch (error) {
      // No customer found
    } finally {
      setCheckingCustomer(false)
    }
  }

  // Use existing customer data
  const useExistingCustomer = () => {
    if (!existingCustomer) return

    createForm.setValues({
      customer_id: existingCustomer.id,
      full_name: existingCustomer.full_name,
      email: existingCustomer.email,
      phone: existingCustomer.phone,
      address: existingCustomer.address || '',
      city: existingCustomer.city || '',
      state: existingCustomer.state || '',
      zip_code: existingCustomer.zip_code || '',
    })

    toast({
      title: 'Customer data loaded',
      description: 'Address information auto-filled',
    })
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      let customerId = createForm.formData.customer_id

      // If no customer_id, create new customer
      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            full_name: createForm.formData.full_name,
            email: createForm.formData.email,
            phone: createForm.formData.phone,
            address: createForm.formData.address,
            city: createForm.formData.city,
            state: createForm.formData.state,
            zip_code: createForm.formData.zip_code,
            relationship_level: 'new',
            preferred_contact_method: 'phone',
          })
          .select()
          .single()

        if (customerError) throw customerError
        customerId = newCustomer.id
      }

      // Calculate end_time
      const selectedPackage = servicePackages.find(pkg => pkg.id === createForm.formData.service_package_id)
      const endTime = selectedPackage
        ? calculateEndTime(createForm.formData.start_time || '', selectedPackage.duration_minutes)
        : createForm.formData.end_time || ''

      const submitData = {
        customer_id: customerId,
        service_package_id: createForm.formData.service_package_id,
        booking_date: createForm.formData.booking_date,
        start_time: createForm.formData.start_time,
        end_time: endTime,
        address: createForm.formData.address,
        city: createForm.formData.city,
        state: createForm.formData.state,
        zip_code: createForm.formData.zip_code,
        notes: createForm.formData.notes,
        total_price: createForm.formData.total_price,
        staff_id: assignmentType === 'staff' ? (createForm.formData.staff_id || null) : null,
        team_id: assignmentType === 'team' ? (createForm.formData.team_id || null) : null,
        status: 'pending',
      }

      // Check for conflicts (unless user has already confirmed override)
      if (!conflictOverride) {
        const detectedConflicts = await checkConflicts({
          staffId: submitData.staff_id,
          teamId: submitData.team_id,
          bookingDate: submitData.booking_date || '',
          startTime: submitData.start_time || '',
          endTime: endTime
        })

        if (detectedConflicts.length > 0) {
          // Show conflict warning dialog
          setPendingBookingData({ ...submitData, customer_id: customerId })
          setShowConflictDialog(true)
          return // Stop submission and show dialog
        }
      }

      // No conflicts or user confirmed override - proceed with booking
      const { error } = await supabase.from('bookings').insert(submitData)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking created successfully',
      })
      setIsDialogOpen(false)
      resetForm()
      setConflictOverride(false)
      fetchBookings()
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  // Proceed with booking after conflict override
  const proceedWithConflictOverride = async () => {
    if (!pendingBookingData) return

    try {
      const { error } = await supabase.from('bookings').insert(pendingBookingData)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking created successfully (conflict overridden)',
      })
      setIsDialogOpen(false)
      setShowConflictDialog(false)
      resetForm()
      setConflictOverride(false)
      setPendingBookingData(null)
      clearConflicts()
      fetchBookings()
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  // Cancel conflict override
  const cancelConflictOverride = () => {
    setShowConflictDialog(false)
    setPendingBookingData(null)
    clearConflicts()
    setConflictOverride(false)
  }

  const resetForm = () => {
    createForm.reset()
    setAssignmentType('none')
    setExistingCustomer(null)
    clearConflicts()
  }

  const getStatusBadge = (status: string) => {
    return (
      <StatusBadge variant={getBookingStatusVariant(status)}>
        {getBookingStatusLabel(status)}
      </StatusBadge>
    )
  }

  // Status Transition Rules
  const getValidTransitions = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['in_progress', 'cancelled', 'no_show'],
      in_progress: ['completed', 'cancelled'],
      completed: [], // Final state
      cancelled: [], // Final state
      no_show: [], // Final state
    }
    return transitions[currentStatus] || []
  }

  // Get available status options for dropdown (current + valid transitions)
  const getAvailableStatuses = (currentStatus: string): string[] => {
    const validTransitions = getValidTransitions(currentStatus)
    return [currentStatus, ...validTransitions]
  }

  // Get status label
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No Show',
    }
    return labels[status] || status
  }

  const isValidTransition = (currentStatus: string, newStatus: string): boolean => {
    const validTransitions = getValidTransitions(currentStatus)
    return validTransitions.includes(newStatus)
  }

  const getStatusTransitionMessage = (currentStatus: string, newStatus: string): string => {
    const messages: Record<string, Record<string, string>> = {
      pending: {
        confirmed: 'Confirm this booking?',
        cancelled: 'Cancel this booking? This action cannot be undone.',
      },
      confirmed: {
        in_progress: 'Mark this booking as in progress?',
        cancelled: 'Cancel this booking? This action cannot be undone.',
        no_show: 'Mark this booking as no-show? This action cannot be undone.',
      },
      in_progress: {
        completed: 'Mark this booking as completed?',
        cancelled: 'Cancel this booking? This action cannot be undone.',
      },
    }
    return messages[currentStatus]?.[newStatus] || `Change status to ${newStatus}?`
  }

  // Handle status change with validation
  const handleStatusChange = (bookingId: string, currentStatus: string, newStatus: string) => {
    // Same status - ignore
    if (currentStatus === newStatus) return

    // Check if transition is valid
    if (!isValidTransition(currentStatus, newStatus)) {
      toast({
        title: 'Invalid Status Transition',
        description: `Cannot change from "${currentStatus}" to "${newStatus}". Please follow the workflow: ${getValidTransitions(currentStatus).join(', ')}`,
        variant: 'destructive',
      })
      return
    }

    // Show confirmation dialog
    setPendingStatusChange({ bookingId, currentStatus, newStatus })
    setShowStatusConfirmDialog(true)
  }

  // Confirm and execute status change
  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: pendingStatusChange.newStatus })
        .eq('id', pendingStatusChange.bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Status changed to ${pendingStatusChange.newStatus}`,
      })

      // Update selected booking if it's the same one
      if (selectedBooking && selectedBooking.id === pendingStatusChange.bookingId) {
        setSelectedBooking({ ...selectedBooking, status: pendingStatusChange.newStatus })
      }

      setShowStatusConfirmDialog(false)
      setPendingStatusChange(null)
      fetchBookings()
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  // Cancel status change
  const cancelStatusChange = () => {
    setShowStatusConfirmDialog(false)
    setPendingStatusChange(null)
  }

  const deleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return

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
      fetchBookings()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete booking',
        variant: 'destructive',
      })
    }
  }


  const openBookingDetail = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailOpen(true)
  }

  const openEditBooking = (booking: Booking) => {
    editForm.setValues({
      customer_id: booking.customers?.id || '',
      service_package_id: booking.service_package_id,
      staff_id: booking.staff_id || '',
      team_id: booking.team_id || '',
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      address: booking.address,
      city: booking.city || '',
      state: booking.state || '',
      zip_code: booking.zip_code || '',
      notes: booking.notes || '',
      total_price: Number(booking.total_price),
      status: booking.status,
    })

    // Set assignment type based on booking data
    if (booking.staff_id) {
      setEditAssignmentType('staff')
    } else if (booking.team_id) {
      setEditAssignmentType('team')
    } else {
      setEditAssignmentType('none')
    }

    setIsEditOpen(true)
    setIsDetailOpen(false)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Calculate end_time
      const selectedPackage = servicePackages.find(pkg => pkg.id === editForm.formData.service_package_id)
      const endTime = selectedPackage
        ? calculateEndTime(editForm.formData.start_time || '', selectedPackage.duration_minutes)
        : editForm.formData.end_time || ''

      // Store booking_id separately (not in editForm.formData)
      const bookingId = selectedBooking?.id || ''

      const updateData = {
        service_package_id: editForm.formData.service_package_id,
        booking_date: editForm.formData.booking_date,
        start_time: editForm.formData.start_time,
        end_time: endTime,
        address: editForm.formData.address,
        city: editForm.formData.city,
        state: editForm.formData.state,
        zip_code: editForm.formData.zip_code,
        notes: editForm.formData.notes,
        total_price: editForm.formData.total_price,
        staff_id: editForm.formData.staff_id || null,
        team_id: editForm.formData.team_id || null,
        status: editForm.formData.status,
      }

      // Check for conflicts (unless user has already confirmed override)
      if (!conflictOverride) {
        const detectedConflicts = await checkConflicts({
          staffId: updateData.staff_id,
          teamId: updateData.team_id,
          bookingDate: updateData.booking_date || '',
          startTime: updateData.start_time || '',
          endTime: endTime,
          excludeBookingId: bookingId // Exclude current booking from conflict check
        })

        if (detectedConflicts.length > 0) {
          // Show conflict warning dialog
          setPendingBookingData({ ...updateData, booking_id: bookingId, isEdit: true })
          setShowConflictDialog(true)
          return // Stop submission and show dialog
        }
      }

      // No conflicts or user confirmed override - proceed with update
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking updated successfully',
      })
      setIsEditOpen(false)
      setConflictOverride(false)
      fetchBookings()
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  // Proceed with edit after conflict override
  const proceedWithEditConflictOverride = async () => {
    if (!pendingBookingData || !pendingBookingData.isEdit) return

    try {
      const { booking_id, isEdit: _isEdit, ...updateData} = pendingBookingData

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking_id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking updated successfully (conflict overridden)',
      })
      setIsEditOpen(false)
      setShowConflictDialog(false)
      setConflictOverride(false)
      setPendingBookingData(null)
      clearConflicts()
      fetchBookings()
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  // Bulk Actions Functions
  const toggleSelectAll = () => {
    if (selectedBookings.length === filteredBookings.length) {
      setSelectedBookings([])
    } else {
      setSelectedBookings(filteredBookings.map(b => b.id))
    }
  }

  const toggleSelectBooking = (bookingId: string) => {
    if (selectedBookings.includes(bookingId)) {
      setSelectedBookings(selectedBookings.filter(id => id !== bookingId))
    } else {
      setSelectedBookings([...selectedBookings, bookingId])
    }
  }

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedBookings.length === 0) return

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: bulkStatus })
        .in('id', selectedBookings)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Updated ${selectedBookings.length} bookings to ${bulkStatus}`,
      })
      setSelectedBookings([])
      setBulkStatus('')
      fetchBookings()
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedBookings.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedBookings.length} bookings?`)) return

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .in('id', selectedBookings)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Deleted ${selectedBookings.length} bookings`,
      })
      setSelectedBookings([])
      fetchBookings()
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const handleBulkExport = () => {
    if (selectedBookings.length === 0) return

    const bookingsToExport = bookings.filter(b => selectedBookings.includes(b.id))
    const csv = [
      ['Customer', 'Service', 'Date', 'Time', 'Status', 'Price', 'Address'].join(','),
      ...bookingsToExport.map(b => [
        b.customers?.full_name || '',
        b.service_packages?.name || '',
        b.booking_date,
        `${b.start_time}-${b.end_time}`,
        b.status,
        b.total_price,
        formatFullAddress(b)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`
    a.click()

    toast({
      title: 'Success',
      description: `Exported ${selectedBookings.length} bookings to CSV`,
    })
  }

  const markAsPaid = async (bookingId: string, method: string = 'cash') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          payment_method: method,
          amount_paid: selectedBooking?.total_price || 0,
          payment_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking marked as paid',
      })

      if (selectedBooking) {
        setSelectedBooking({
          ...selectedBooking,
          payment_status: 'paid',
          payment_method: method,
          amount_paid: selectedBooking.total_price,
          payment_date: new Date().toISOString().split('T')[0],
        })
      }

      fetchBookings()
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const getPaymentStatusBadge = (status?: string) => {
    const paymentStatus = status || 'unpaid'
    return (
      <StatusBadge variant={getPaymentStatusVariant(paymentStatus)}>
        {getPaymentStatusLabel(paymentStatus)}
      </StatusBadge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Filters skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-full sm:w-48" />
              <Skeleton className="h-10 w-full sm:w-48" />
              <Skeleton className="h-10 w-full sm:w-48" />
            </div>
          </CardContent>
        </Card>

        {/* Bookings list skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-10 w-32" />
                      <Skeleton className="h-10 w-10" />
                    </div>
                  </div>
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
            Bookings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all service bookings
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-tinedy-blue hover:bg-tinedy-blue/90" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
              <DialogDescription>
                Fill in the booking details below
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Customer Information */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="font-medium">Customer Information</h3>

                {/* Customer Found Alert */}
                {existingCustomer && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="flex items-center justify-between">
                      <span className="text-sm">
                        <strong>Customer Found:</strong> {existingCustomer.full_name} ({existingCustomer.phone})
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={useExistingCustomer}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Use Existing Data
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={createForm.formData.full_name || ''}
                      onChange={(e) =>
                        createForm.handleChange('full_name', e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={createForm.formData.email || ''}
                      onChange={(e) =>
                        createForm.handleChange('email', e.target.value)
                      }
                      onBlur={handleEmailBlur}
                      required
                      disabled={checkingCustomer}
                    />
                    {checkingCustomer && (
                      <p className="text-xs text-muted-foreground">Checking...</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={createForm.formData.phone || ''}
                      onChange={(e) =>
                        createForm.handleChange('phone', e.target.value)
                      }
                      onBlur={handlePhoneBlur}
                      required
                      disabled={checkingCustomer}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="service_package_id">Service Package *</Label>
                  <Select
                    value={createForm.formData.service_package_id || ''}
                    onValueChange={(value) => {
                      const selectedPackage = servicePackages.find(p => p.id === value)
                      createForm.setValues({
                        service_package_id: value,
                        total_price: selectedPackage?.price || 0
                      })
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicePackages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} - {formatCurrency(pkg.price)} ({pkg.duration_minutes} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="booking_date">Booking Date *</Label>
                  <Input
                    id="booking_date"
                    type="date"
                    value={createForm.formData.booking_date || ''}
                    onChange={(e) =>
                      createForm.handleChange('booking_date', e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={createForm.formData.start_time || ''}
                    onChange={(e) =>
                      createForm.handleChange('start_time', e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_time_display">End Time (Auto-calculated)</Label>
                  <Input
                    id="end_time_display"
                    type="text"
                    value={
                      createForm.formData.start_time && createForm.formData.service_package_id
                        ? calculateEndTime(
                            createForm.formData.start_time,
                            servicePackages.find(pkg => pkg.id === createForm.formData.service_package_id)?.duration_minutes || 0
                          )
                        : '--:--'
                    }
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_price">Total Price *</Label>
                  <Input
                    id="total_price"
                    type="number"
                    step="0.01"
                    value={createForm.formData.total_price || 0}
                    onChange={(e) =>
                      createForm.handleChange('total_price', parseFloat(e.target.value))
                    }
                    required
                  />
                </div>

                {/* Assignment Type Selector */}
                <div className="space-y-2 sm:col-span-2">
                  <Label>Assign to</Label>
                  <Select
                    value={assignmentType}
                    onValueChange={(value: 'staff' | 'team' | 'none') => {
                      setAssignmentType(value)
                      createForm.setValues({ staff_id: '', team_id: '' })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      <SelectItem value="staff">Individual Staff</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Staff Selector - Conditional */}
                {assignmentType === 'staff' && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="staff_id">Select Staff Member *</Label>
                    <Select
                      value={createForm.formData.staff_id || ''}
                      onValueChange={(value) =>
                        createForm.handleChange('staff_id', value)
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member..." />
                      </SelectTrigger>
                      <SelectContent>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.full_name} ({staff.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Team Selector - Conditional */}
                {assignmentType === 'team' && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="team_id">Select Team *</Label>
                    <Select
                      value={createForm.formData.team_id || ''}
                      onValueChange={(value) =>
                        createForm.handleChange('team_id', value)
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
                  <div className="space-y-2 sm:col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-gradient-to-r from-tinedy-blue/10 to-tinedy-green/10 hover:from-tinedy-blue/20 hover:to-tinedy-green/20 border-tinedy-blue/30"
                      onClick={() => {
                        setIsDialogOpen(false)
                        setIsAvailabilityModalOpen(true)
                      }}
                      disabled={
                        !createForm.formData.booking_date ||
                        !createForm.formData.start_time ||
                        !createForm.formData.service_package_id
                      }
                    >
                      <Sparkles className="h-4 w-4 mr-2 text-tinedy-blue" />
                      Check Staff Availability
                    </Button>
                    {(!createForm.formData.booking_date || !createForm.formData.start_time || !createForm.formData.service_package_id) && (
                      <p className="text-xs text-muted-foreground text-center">
                        Please select date, time, and service package first
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={createForm.formData.address || ''}
                    onChange={(e) =>
                      createForm.handleChange('address', e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={createForm.formData.city || ''}
                    onChange={(e) =>
                      createForm.handleChange('city', e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={createForm.formData.state || ''}
                    onChange={(e) =>
                      createForm.handleChange('state', e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip_code">Zip Code *</Label>
                  <Input
                    id="zip_code"
                    value={createForm.formData.zip_code || ''}
                    onChange={(e) =>
                      createForm.handleChange('zip_code', e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={createForm.formData.notes || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      createForm.handleChange('notes', e.target.value)
                    }
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    clearConflicts()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-tinedy-blue">
                  Create Booking
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Staff Availability Modal - Create Form */}
        {createForm.formData.service_package_id && createForm.formData.booking_date && createForm.formData.start_time && (
          <StaffAvailabilityModal
            isOpen={isAvailabilityModalOpen}
            onClose={() => {
              setIsAvailabilityModalOpen(false)
              setIsDialogOpen(true)
            }}
            assignmentType={assignmentType === 'staff' ? 'individual' : 'team'}
            onSelectStaff={(staffId) => {
              createForm.handleChange('staff_id', staffId)
              setIsAvailabilityModalOpen(false)
              setIsDialogOpen(true)
              toast({
                title: 'Staff Selected',
                description: 'Staff member has been assigned to the booking',
              })
            }}
            onSelectTeam={(teamId) => {
              createForm.handleChange('team_id', teamId)
              setIsAvailabilityModalOpen(false)
              setIsDialogOpen(true)
              toast({
                title: 'Team Selected',
                description: 'Team has been assigned to the booking',
              })
            }}
            date={createForm.formData.booking_date}
            startTime={createForm.formData.start_time}
            endTime={
              createForm.formData.service_package_id
                ? calculateEndTime(
                    createForm.formData.start_time,
                    servicePackages.find(pkg => pkg.id === createForm.formData.service_package_id)?.duration_minutes || 0
                  )
                : createForm.formData.end_time || ''
            }
            servicePackageId={createForm.formData.service_package_id}
            servicePackageName={
              servicePackages.find(pkg => pkg.id === createForm.formData.service_package_id)?.name
            }
          />
        )}

        {/* Staff Availability Modal - Edit Form */}
        {editForm.formData.service_package_id && editForm.formData.booking_date && editForm.formData.start_time && (
          <StaffAvailabilityModal
            isOpen={isEditAvailabilityModalOpen}
            onClose={() => {
              setIsEditAvailabilityModalOpen(false)
              setIsEditOpen(true)
            }}
            assignmentType={editAssignmentType === 'staff' ? 'individual' : 'team'}
            onSelectStaff={(staffId) => {
              editForm.handleChange('staff_id', staffId)
              setIsEditAvailabilityModalOpen(false)
              setIsEditOpen(true)
              toast({
                title: 'Staff Selected',
                description: 'Staff member has been assigned to the booking',
              })
            }}
            onSelectTeam={(teamId) => {
              editForm.handleChange('team_id', teamId)
              setIsEditAvailabilityModalOpen(false)
              setIsEditOpen(true)
              toast({
                title: 'Team Selected',
                description: 'Team has been assigned to the booking',
              })
            }}
            date={editForm.formData.booking_date}
            startTime={editForm.formData.start_time}
            endTime={
              editForm.formData.service_package_id
                ? calculateEndTime(
                    editForm.formData.start_time || '',
                    servicePackages.find(pkg => pkg.id === editForm.formData.service_package_id)?.duration_minutes || 0
                  )
                : editForm.formData.end_time || ''
            }
            servicePackageId={editForm.formData.service_package_id}
            servicePackageName={
              servicePackages.find(pkg => pkg.id === editForm.formData.service_package_id)?.name
            }
            currentAssignedStaffId={editForm.formData.staff_id}
            currentAssignedTeamId={editForm.formData.team_id}
          />
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Quick filters:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickFilter('today')}
              className="h-8"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickFilter('week')}
              className="h-8"
            >
              This Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickFilter('month')}
              className="h-8"
            >
              This Month
            </Button>
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 text-destructive hover:text-destructive"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All ({getActiveFilterCount()})
              </Button>
            )}
          </div>

          {/* Main Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer/service..."
                value={filters.searchQuery}
                onChange={(e) => updateFilter('searchQuery', e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="From"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="flex-1"
              />
              <Input
                type="date"
                placeholder="To"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="flex-1"
              />
            </div>

            <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.serviceType} onValueChange={(value) => updateFilter('serviceType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select value={filters.staffId} onValueChange={(value) => updateFilter('staffId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.teamId} onValueChange={(value) => updateFilter('teamId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Teams" />
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
        </CardContent>
      </Card>

      {/* Booking Detail Modal */}
      {/* eslint-disable @typescript-eslint/no-explicit-any */}
      <BookingDetailModal
        booking={selectedBooking as any}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={openEditBooking as any}
        onDelete={deleteBooking}
        onStatusChange={handleStatusChange}
        onMarkAsPaid={markAsPaid}
        getStatusBadge={getStatusBadge}
        getPaymentStatusBadge={getPaymentStatusBadge}
        getAvailableStatuses={getAvailableStatuses}
        getStatusLabel={getStatusLabel}
      />
      {/* eslint-enable @typescript-eslint/no-explicit-any */}

      {/* Edit Booking Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>
              Update booking information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_service">Service Package *</Label>
                <Select
                  value={editForm.formData.service_package_id || ''}
                  onValueChange={(value) =>
                    editForm.handleChange('service_package_id', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicePackages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - {formatCurrency(pkg.price)} ({pkg.duration_minutes}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_date">Booking Date *</Label>
                <Input
                  id="edit_date"
                  type="date"
                  value={editForm.formData.booking_date || ''}
                  onChange={(e) =>
                    editForm.handleChange('booking_date', e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_start_time">Start Time *</Label>
                <Input
                  id="edit_start_time"
                  type="time"
                  value={editForm.formData.start_time || ''}
                  onChange={(e) =>
                    editForm.handleChange('start_time', e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_end_time">End Time (Auto-calculated)</Label>
                <Input
                  id="edit_end_time"
                  type="text"
                  value={
                    editForm.formData.start_time && editForm.formData.service_package_id
                      ? calculateEndTime(
                          editForm.formData.start_time,
                          servicePackages.find(pkg => pkg.id === editForm.formData.service_package_id)?.duration_minutes || 0
                        )
                      : '--:--'
                  }
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_status">Status *</Label>
                <Select
                  value={editForm.formData.status || ''}
                  onValueChange={(value) =>
                    editForm.handleChange('status', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_price">Total Price *</Label>
                <Input
                  id="edit_price"
                  type="number"
                  step="0.01"
                  value={editForm.formData.total_price || 0}
                  onChange={(e) =>
                    editForm.handleChange('total_price', parseFloat(e.target.value))
                  }
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit_assign_to">Assign to</Label>
                <Select
                  value={editAssignmentType}
                  onValueChange={(value: 'staff' | 'team' | 'none') => {
                    setEditAssignmentType(value)
                    editForm.setValues({ staff_id: '', team_id: '' })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    <SelectItem value="staff">Individual Staff</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Staff Selector - Conditional */}
              {editAssignmentType === 'staff' && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit_staff_id">Select Staff Member *</Label>
                  <Select
                    value={editForm.formData.staff_id || ''}
                    onValueChange={(value) =>
                      editForm.handleChange('staff_id', value)
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {staffMembers.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.full_name} ({staff.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Team Selector - Conditional */}
              {editAssignmentType === 'team' && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit_team_id">Select Team *</Label>
                  <Select
                    value={editForm.formData.team_id || ''}
                    onValueChange={(value) =>
                      editForm.handleChange('team_id', value)
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
              {editAssignmentType !== 'none' && (
                <div className="space-y-2 sm:col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-gradient-to-r from-tinedy-blue/10 to-tinedy-green/10 hover:from-tinedy-blue/20 hover:to-tinedy-green/20 border-tinedy-blue/30"
                    onClick={() => {
                      setIsEditOpen(false)
                      setIsEditAvailabilityModalOpen(true)
                    }}
                    disabled={
                      !editForm.formData.booking_date ||
                      !editForm.formData.start_time ||
                      !editForm.formData.service_package_id
                    }
                  >
                    <Sparkles className="h-4 w-4 mr-2 text-tinedy-blue" />
                    Check Staff Availability
                  </Button>
                  {(!editForm.formData.booking_date || !editForm.formData.start_time || !editForm.formData.service_package_id) && (
                    <p className="text-xs text-muted-foreground text-center">
                      Please select date, time, and service package first
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_address">Address *</Label>
              <Input
                id="edit_address"
                value={editForm.formData.address || ''}
                onChange={(e) =>
                  editForm.handleChange('address', e.target.value)
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_city">City *</Label>
                <Input
                  id="edit_city"
                  value={editForm.formData.city || ''}
                  onChange={(e) =>
                    editForm.handleChange('city', e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_state">State *</Label>
                <Input
                  id="edit_state"
                  value={editForm.formData.state || ''}
                  onChange={(e) =>
                    editForm.handleChange('state', e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_zip_code">Zip Code *</Label>
                <Input
                  id="edit_zip_code"
                  value={editForm.formData.zip_code || ''}
                  onChange={(e) =>
                    editForm.handleChange('zip_code', e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Input
                id="edit_notes"
                value={editForm.formData.notes || ''}
                onChange={(e) =>
                  editForm.handleChange('notes', e.target.value)
                }
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false)
                  clearConflicts()
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Update Booking
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation Dialog */}
      <Dialog open={showStatusConfirmDialog} onOpenChange={setShowStatusConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              {pendingStatusChange && getStatusTransitionMessage(pendingStatusChange.currentStatus, pendingStatusChange.newStatus)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={cancelStatusChange}>
              Cancel
            </Button>
            <Button onClick={confirmStatusChange}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Warning Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive">Booking Conflict Detected!</DialogTitle>
            <DialogDescription>
              The selected staff/team already has bookings at this time. Do you want to proceed anyway?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="bg-red-50 border-red-200">
              <Info className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <strong>Warning:</strong> Found {conflicts.length} conflicting booking{conflicts.length > 1 ? 's' : ''} on the same date and time.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              <h3 className="font-semibold">Conflicting Bookings:</h3>
              {conflicts.map((conflict) => (
                <div key={conflict.booking.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{conflict.booking.customers?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{conflict.booking.service_packages?.name}</p>
                      <p className="text-xs text-red-600 font-medium">
                        {formatDate(conflict.booking.booking_date)} • {formatTime(conflict.booking.start_time)} - {formatTime(conflict.booking.end_time || '')}
                      </p>
                      <p className="text-xs text-red-700 font-semibold">
                        {conflict.message}
                      </p>
                      {conflict.booking.profiles && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Staff: {conflict.booking.profiles.full_name}
                        </p>
                      )}
                      {conflict.booking.teams && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Team: {conflict.booking.teams.name}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(conflict.booking.status)}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={cancelConflictOverride}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (pendingBookingData?.isEdit) {
                    proceedWithEditConflictOverride()
                  } else {
                    proceedWithConflictOverride()
                  }
                }}
              >
                Proceed Anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bookings list */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedBookings.length === filteredBookings.length && filteredBookings.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <CardTitle className="font-display">
                All Bookings ({filteredBookings.length})
              </CardTitle>
            </div>
            {selectedBookings.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{selectedBookings.length} selected</Badge>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleBulkStatusUpdate}
                  disabled={!bulkStatus}
                >
                  Update
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkExport}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Pagination Controls - Top */}
          {filteredBookings.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 pb-4 border-b">
              <div className="flex items-center gap-2">
                <Label htmlFor="itemsPerPage" className="text-sm text-muted-foreground">
                  Show:
                </Label>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value))
                    goToPage(1)
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  per page
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {metadata.startIndex} to {metadata.endIndex} of {metadata.totalItems} bookings
                </span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {filteredBookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No bookings found
              </p>
            ) : (
              paginatedBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedBookings.includes(booking.id)}
                    onCheckedChange={() => toggleSelectBooking(booking.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between flex-1 gap-4 cursor-pointer"
                    onClick={() => openBookingDetail(booking)}
                  >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-tinedy-dark">
                          {booking.customers?.full_name || 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.customers?.email}
                        </p>
                      </div>
                      <div className="sm:hidden">
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center">
                        <Badge variant="outline" className="mr-2">
                          {booking.service_packages?.service_type}
                        </Badge>
                        {booking.service_packages?.name}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </div>
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
                  <div className="flex sm:flex-col items-center sm:items-end gap-4">
                    <div className="flex-1 sm:flex-none">
                      <p className="font-semibold text-tinedy-dark text-lg">
                        {formatCurrency(Number(booking.total_price))}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      {getStatusBadge(booking.status)}
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={booking.status}
                        onValueChange={(value) =>
                          handleStatusChange(booking.id, booking.status, value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableStatuses(booking.status).map((status) => (
                            <SelectItem key={status} value={status}>
                              {getStatusLabel(status)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBooking(booking.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls - Bottom */}
          {filteredBookings.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToFirst}
                  disabled={!metadata.hasPrevPage}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={!metadata.hasPrevPage}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={!metadata.hasNextPage}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToLast}
                  disabled={!metadata.hasNextPage}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
