import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Plus, Search, Trash2, Users, User, Info, X, Calendar, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BookingDetailModal } from './booking-detail-modal'

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
  payment_status?: string
  payment_method?: string
  amount_paid?: number
  payment_date?: string
  payment_notes?: string
  customers: { full_name: string; email: string } | null
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
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [staffFilter, setStaffFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [assignmentType, setAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null)
  const [checkingCustomer, setCheckingCustomer] = useState(false)
  // Advanced Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all')
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  // Detail Modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    booking_id: '',
    customer_id: '',
    service_package_id: '',
    staff_id: '',
    team_id: '',
    booking_date: '',
    start_time: '',
    end_time: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
    total_price: 0,
    status: '',
  })
  // Bulk Actions
  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  // Conflict Detection
  const [conflictingBookings, setConflictingBookings] = useState<Booking[]>([])
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [pendingBookingData, setPendingBookingData] = useState<any>(null)
  const [conflictOverride, setConflictOverride] = useState(false)
  // Status Workflow
  const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    bookingId: string
    currentStatus: string
    newStatus: string
  } | null>(null)
  const [formData, setFormData] = useState({
    customer_id: '',
    full_name: '',
    email: '',
    phone: '',
    service_package_id: '',
    staff_id: '',
    team_id: '',
    booking_date: '',
    start_time: '',
    end_time: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
    total_price: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchBookings()
    fetchServicePackages()
    fetchStaffMembers()
    fetchTeams()
     
  }, [])

  const filterBookings = () => {
    let filtered = bookings

    if (searchQuery) {
      filtered = filtered.filter(
        (booking) =>
          booking.customers?.full_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          booking.service_packages?.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((booking) => booking.status === statusFilter)
    }

    if (staffFilter !== 'all') {
      if (staffFilter === 'unassigned') {
        filtered = filtered.filter((booking) => !booking.staff_id)
      } else {
        filtered = filtered.filter((booking) => booking.staff_id === staffFilter)
      }
    }

    if (teamFilter !== 'all') {
      filtered = filtered.filter((booking) => booking.team_id === teamFilter)
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter((booking) => booking.booking_date >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter((booking) => booking.booking_date <= dateTo)
    }

    // Service type filter
    if (serviceTypeFilter !== 'all') {
      filtered = filtered.filter(
        (booking) => booking.service_packages?.service_type === serviceTypeFilter
      )
    }

    setFilteredBookings(filtered)
  }

  useEffect(() => {
    filterBookings()
    setCurrentPage(1) // Reset to page 1 when filters change
  }, [searchQuery, statusFilter, staffFilter, teamFilter, dateFrom, dateTo, serviceTypeFilter, bookings])

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customers (full_name, email),
          service_packages (name, service_type),
          profiles (full_name),
          teams (name)
        `)
        .order('booking_date', { ascending: false })

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
  }

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

  // Check existing customer by email
  const handleEmailBlur = async () => {
    if (!formData.email || formData.email.trim() === '') return

    setCheckingCustomer(true)

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', formData.email.trim())
        .single()

      if (data && !error) {
        setExistingCustomer(data)
        toast({
          title: '✅ Customer Found!',
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
    if (!formData.phone || formData.phone.trim() === '' || existingCustomer) return

    setCheckingCustomer(true)

    try {
      const { data, error} = await supabase
        .from('customers')
        .select('*')
        .eq('phone', formData.phone.trim())
        .single()

      if (data && !error) {
        setExistingCustomer(data)
        toast({
          title: '✅ Customer Found (by Phone)!',
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

    setFormData({
      ...formData,
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

  // Check for booking conflicts
  const checkBookingConflicts = async (
    bookingDate: string,
    startTime: string,
    endTime: string,
    staffId: string | null,
    teamId: string | null,
    excludeBookingId?: string
  ): Promise<Booking[]> => {
    try {
      // Only check conflicts if staff or team is assigned
      if (!staffId && !teamId) return []

      let query = supabase
        .from('bookings')
        .select(`
          *,
          customers (full_name, email),
          service_packages (name, service_type),
          profiles (full_name),
          teams (name)
        `)
        .eq('booking_date', bookingDate)
        .not('status', 'in', '(cancelled,no_show)')

      // Check staff or team conflicts
      if (staffId) {
        query = query.eq('staff_id', staffId)
      } else if (teamId) {
        query = query.eq('team_id', teamId)
      }

      // Exclude current booking when editing
      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId)
      }

      const { data, error } = await query

      if (error) throw error

      // Filter for time overlaps: (new_start < existing_end) AND (new_end > existing_start)
      const conflicts = (data || []).filter((booking) => {
        return startTime < booking.end_time && endTime > booking.start_time
      })

      return conflicts
    } catch (error) {
      console.error('Error checking conflicts:', error)
      return []
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      let customerId = formData.customer_id

      // If no customer_id, create new customer
      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zip_code,
            relationship_level: 'new',
            preferred_contact_method: 'phone',
          })
          .select()
          .single()

        if (customerError) throw customerError
        customerId = newCustomer.id
      }

      // Calculate end_time
      const selectedPackage = servicePackages.find(pkg => pkg.id === formData.service_package_id)
      const endTime = selectedPackage
        ? calculateEndTime(formData.start_time, selectedPackage.duration_minutes)
        : formData.end_time

      const submitData = {
        customer_id: customerId,
        service_package_id: formData.service_package_id,
        booking_date: formData.booking_date,
        start_time: formData.start_time,
        end_time: endTime,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        notes: formData.notes,
        total_price: formData.total_price,
        staff_id: assignmentType === 'staff' ? (formData.staff_id || null) : null,
        team_id: assignmentType === 'team' ? (formData.team_id || null) : null,
        status: 'pending',
      }

      // Check for conflicts (unless user has already confirmed override)
      if (!conflictOverride) {
        const conflicts = await checkBookingConflicts(
          submitData.booking_date,
          submitData.start_time,
          endTime,
          submitData.staff_id,
          submitData.team_id
        )

        if (conflicts.length > 0) {
          // Show conflict warning dialog
          setConflictingBookings(conflicts)
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create booking',
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
      setConflictingBookings([])
      fetchBookings()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create booking',
        variant: 'destructive',
      })
    }
  }

  // Cancel conflict override
  const cancelConflictOverride = () => {
    setShowConflictDialog(false)
    setPendingBookingData(null)
    setConflictingBookings([])
    setConflictOverride(false)
  }

  const resetForm = () => {
    setFormData({
      customer_id: '',
      full_name: '',
      email: '',
      phone: '',
      service_package_id: '',
      staff_id: '',
      team_id: '',
      booking_date: '',
      start_time: '',
      end_time: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      notes: '',
      total_price: 0,
    })
    setAssignmentType('none')
    setExistingCustomer(null)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'warning' as const, label: 'Pending' },
      confirmed: { variant: 'info' as const, label: 'Confirmed' },
      in_progress: { variant: 'default' as const, label: 'In Progress' },
      completed: { variant: 'success' as const, label: 'Completed' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
      no_show: { variant: 'destructive' as const, label: 'No Show' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: 'default' as const,
      label: status,
    }

    return <Badge variant={config.variant}>{config.label}</Badge>
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update booking status',
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

  // Quick filter functions
  const setQuickFilter = (filter: 'today' | 'week' | 'month') => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    if (filter === 'today') {
      setDateFrom(todayStr)
      setDateTo(todayStr)
    } else if (filter === 'week') {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      setDateFrom(weekStart.toISOString().split('T')[0])
      setDateTo(weekEnd.toISOString().split('T')[0])
    } else if (filter === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setDateFrom(monthStart.toISOString().split('T')[0])
      setDateTo(monthEnd.toISOString().split('T')[0])
    }
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setStaffFilter('all')
    setTeamFilter('all')
    setDateFrom('')
    setDateTo('')
    setServiceTypeFilter('all')
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (searchQuery) count++
    if (statusFilter !== 'all') count++
    if (staffFilter !== 'all') count++
    if (teamFilter !== 'all') count++
    if (dateFrom) count++
    if (dateTo) count++
    if (serviceTypeFilter !== 'all') count++
    return count
  }

  const openBookingDetail = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailOpen(true)
  }

  const openEditBooking = (booking: Booking) => {
    setEditFormData({
      booking_id: booking.id,
      customer_id: booking.customers?.email || '',
      service_package_id: booking.service_package_id,
      staff_id: booking.staff_id || '',
      team_id: booking.team_id || '',
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      address: booking.address,
      city: '',
      state: '',
      zip_code: '',
      notes: '',
      total_price: Number(booking.total_price),
      status: booking.status,
    })
    setIsEditOpen(true)
    setIsDetailOpen(false)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Calculate end_time
      const selectedPackage = servicePackages.find(pkg => pkg.id === editFormData.service_package_id)
      const endTime = selectedPackage
        ? calculateEndTime(editFormData.start_time, selectedPackage.duration_minutes)
        : editFormData.end_time

      const updateData = {
        service_package_id: editFormData.service_package_id,
        booking_date: editFormData.booking_date,
        start_time: editFormData.start_time,
        end_time: endTime,
        address: editFormData.address,
        notes: editFormData.notes,
        total_price: editFormData.total_price,
        staff_id: editFormData.staff_id || null,
        team_id: editFormData.team_id || null,
        status: editFormData.status,
      }

      // Check for conflicts (unless user has already confirmed override)
      if (!conflictOverride) {
        const conflicts = await checkBookingConflicts(
          updateData.booking_date,
          updateData.start_time,
          endTime,
          updateData.staff_id,
          updateData.team_id,
          editFormData.booking_id // Exclude current booking from conflict check
        )

        if (conflicts.length > 0) {
          // Show conflict warning dialog
          setConflictingBookings(conflicts)
          setPendingBookingData({ ...updateData, booking_id: editFormData.booking_id, isEdit: true })
          setShowConflictDialog(true)
          return // Stop submission and show dialog
        }
      }

      // No conflicts or user confirmed override - proceed with update
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', editFormData.booking_id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking updated successfully',
      })
      setIsEditOpen(false)
      setConflictOverride(false)
      fetchBookings()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update booking',
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
      setConflictingBookings([])
      fetchBookings()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update booking',
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update bookings',
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete bookings',
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payment',
        variant: 'destructive',
      })
    }
  }

  const getPaymentStatusBadge = (status?: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Paid</Badge>
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Partial</Badge>
      case 'refunded':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-300">Refunded</Badge>
      default:
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Unpaid</Badge>
    }
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
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
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
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
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
                    value={formData.service_package_id}
                    onValueChange={(value) => {
                      const selectedPackage = servicePackages.find(p => p.id === value)
                      setFormData({
                        ...formData,
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

                {/* Assignment Type Selector */}
                <div className="space-y-2 sm:col-span-2">
                  <Label>Assign to</Label>
                  <Select
                    value={assignmentType}
                    onValueChange={(value: 'staff' | 'team' | 'none') => {
                      setAssignmentType(value)
                      setFormData({ ...formData, staff_id: '', team_id: '' })
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
                      value={formData.staff_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, staff_id: value })
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
                      value={formData.team_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, team_id: value })
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

                <div className="space-y-2">
                  <Label htmlFor="booking_date">Booking Date *</Label>
                  <Input
                    id="booking_date"
                    type="date"
                    value={formData.booking_date}
                    onChange={(e) =>
                      setFormData({ ...formData, booking_date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
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
                      formData.start_time && formData.service_package_id
                        ? calculateEndTime(
                            formData.start_time,
                            servicePackages.find(pkg => pkg.id === formData.service_package_id)?.duration_minutes || 0
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
                    value={formData.total_price}
                    onChange={(e) =>
                      setFormData({ ...formData, total_price: parseFloat(e.target.value) })
                    }
                    required
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip_code">Zip Code *</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) =>
                      setFormData({ ...formData, zip_code: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
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
                  Create Booking
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
            {getActiveFilterCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="From"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1"
              />
              <Input
                type="date"
                placeholder="To"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
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

            <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
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
            <Select value={staffFilter} onValueChange={setStaffFilter}>
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

            <Select value={teamFilter} onValueChange={setTeamFilter}>
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
      <BookingDetailModal
        booking={selectedBooking}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={openEditBooking}
        onDelete={deleteBooking}
        onStatusChange={handleStatusChange}
        onMarkAsPaid={markAsPaid}
        getStatusBadge={getStatusBadge}
        getPaymentStatusBadge={getPaymentStatusBadge}
        getAvailableStatuses={getAvailableStatuses}
        getStatusLabel={getStatusLabel}
      />

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
                  value={editFormData.service_package_id}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, service_package_id: value })
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
                  value={editFormData.booking_date}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, booking_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_start_time">Start Time *</Label>
                <Input
                  id="edit_start_time"
                  type="time"
                  value={editFormData.start_time}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, start_time: e.target.value })
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
                    editFormData.start_time && editFormData.service_package_id
                      ? calculateEndTime(
                          editFormData.start_time,
                          servicePackages.find(pkg => pkg.id === editFormData.service_package_id)?.duration_minutes || 0
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
                  value={editFormData.status}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, status: value })
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
                  value={editFormData.total_price}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, total_price: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_staff">Assigned Staff</Label>
                <Select
                  value={editFormData.staff_id || 'none'}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, staff_id: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_team">Assigned Team</Label>
                <Select
                  value={editFormData.team_id || 'none'}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, team_id: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_address">Address *</Label>
              <Input
                id="edit_address"
                value={editFormData.address}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, address: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Input
                id="edit_notes"
                value={editFormData.notes}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, notes: e.target.value })
                }
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
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
                <strong>Warning:</strong> Found {conflictingBookings.length} conflicting booking{conflictingBookings.length > 1 ? 's' : ''} on the same date and time.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              <h3 className="font-semibold">Conflicting Bookings:</h3>
              {conflictingBookings.map((conflict) => (
                <div key={conflict.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{conflict.customers?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{conflict.service_packages?.name}</p>
                      <p className="text-xs text-red-600 font-medium">
                        {formatDate(conflict.booking_date)} • {conflict.start_time} - {conflict.end_time}
                      </p>
                      {conflict.profiles && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Staff: {conflict.profiles.full_name}
                        </p>
                      )}
                      {conflict.teams && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Team: {conflict.teams.name}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(conflict.status)}
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
                    setCurrentPage(1)
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
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredBookings.length)} to {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings
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
              (() => {
                // Calculate pagination
                const startIndex = (currentPage - 1) * itemsPerPage
                const endIndex = startIndex + itemsPerPage
                const paginatedBookings = filteredBookings.slice(startIndex, endIndex)

                return paginatedBookings.map((booking) => (
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
                      {formatDate(booking.booking_date)} • {booking.start_time} - {booking.end_time}
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
              })()
            )}
          </div>

          {/* Pagination Controls - Bottom */}
          {filteredBookings.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {Math.ceil(filteredBookings.length / itemsPerPage)}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(filteredBookings.length / itemsPerPage)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.ceil(filteredBookings.length / itemsPerPage))}
                  disabled={currentPage >= Math.ceil(filteredBookings.length / itemsPerPage)}
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
