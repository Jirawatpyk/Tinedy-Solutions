import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

interface Customer {
  id: string
  full_name: string
  email: string
  phone: string
}

interface ServicePackage {
  id: string
  name: string
  base_price: number
  service_type: string
}

interface Staff {
  id: string
  full_name: string
}

interface Team {
  id: string
  name: string
}

interface CreateBookingModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  onSuccess: () => void
}

export function CreateBookingModal({
  isOpen,
  onClose,
  selectedDate,
  onSuccess,
}: CreateBookingModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([])
  const [staffMembers, setStaffMembers] = useState<Staff[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [assignmentType, setAssignmentType] = useState<'staff' | 'team'>('staff')

  const [formData, setFormData] = useState({
    customer_id: '',
    service_package_id: '',
    staff_id: '',
    team_id: '',
    booking_date: '',
    start_time: '09:00',
    end_time: '10:00',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
  })

  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchCustomers()
      fetchServicePackages()
      fetchStaffMembers()
      fetchTeams()

      // Set booking date from selected date
      if (selectedDate) {
        setFormData(prev => ({
          ...prev,
          booking_date: format(selectedDate, 'yyyy-MM-dd')
        }))
      }
    }
  }, [isOpen, selectedDate])

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, email, phone')
        .order('full_name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchServicePackages = async () => {
    try {
      const { data, error } = await supabase
        .from('service_packages')
        .select('id, name, base_price, service_type')
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
        .select('id, full_name')
        .eq('role', 'staff')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validation
      if (!formData.customer_id || !formData.service_package_id || !formData.booking_date) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        })
        return
      }

      if (assignmentType === 'staff' && !formData.staff_id) {
        toast({
          title: 'Validation Error',
          description: 'Please select a staff member',
          variant: 'destructive',
        })
        return
      }

      if (assignmentType === 'team' && !formData.team_id) {
        toast({
          title: 'Validation Error',
          description: 'Please select a team',
          variant: 'destructive',
        })
        return
      }

      // Get service package price
      const selectedPackage = servicePackages.find(p => p.id === formData.service_package_id)
      const totalPrice = selectedPackage?.base_price || 0

      // Prepare booking data
      const bookingData = {
        customer_id: formData.customer_id,
        service_package_id: formData.service_package_id,
        staff_id: assignmentType === 'staff' ? formData.staff_id : null,
        team_id: assignmentType === 'team' ? formData.team_id : null,
        booking_date: formData.booking_date,
        start_time: formData.start_time + ':00',
        end_time: formData.end_time + ':00',
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        notes: formData.notes,
        status: 'pending',
        total_price: totalPrice,
        payment_status: 'pending',
      }

      const { error } = await supabase
        .from('bookings')
        .insert([bookingData])

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking created successfully',
      })

      // Reset form
      setFormData({
        customer_id: '',
        service_package_id: '',
        staff_id: '',
        team_id: '',
        booking_date: '',
        start_time: '09:00',
        end_time: '10:00',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        notes: '',
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating booking:', error)
      toast({
        title: 'Error',
        description: 'Failed to create booking',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
          <DialogDescription>
            {selectedDate && `Creating booking for ${format(selectedDate, 'MMMM dd, yyyy')}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <Select
              value={formData.customer_id}
              onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.full_name} - {customer.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Package */}
          <div className="space-y-2">
            <Label htmlFor="service">Service Package *</Label>
            <Select
              value={formData.service_package_id}
              onValueChange={(value) => setFormData({ ...formData, service_package_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {servicePackages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} - ${pkg.base_price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Type */}
          <div className="space-y-2">
            <Label>Assignment Type *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={assignmentType === 'staff'}
                  onChange={() => setAssignmentType('staff')}
                  className="w-4 h-4"
                />
                <span>Assign to Staff</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={assignmentType === 'team'}
                  onChange={() => setAssignmentType('team')}
                  className="w-4 h-4"
                />
                <span>Assign to Team</span>
              </label>
            </div>
          </div>

          {/* Staff or Team Selection */}
          {assignmentType === 'staff' ? (
            <div className="space-y-2">
              <Label>Staff Member *</Label>
              <Select
                value={formData.staff_id}
                onValueChange={(value) => setFormData({ ...formData, staff_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
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
          ) : (
            <div className="space-y-2">
              <Label>Team *</Label>
              <Select
                value={formData.team_id}
                onValueChange={(value) => setFormData({ ...formData, team_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
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

          {/* Date and Time */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.booking_date}
                onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
              />
            </div>
            <div className="space-y-2">
              <Label>ZIP Code</Label>
              <Input
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                placeholder="ZIP"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Booking'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
