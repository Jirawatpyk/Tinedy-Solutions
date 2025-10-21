# Smart Customer Lookup - Implementation Guide

ใช้ร่วมกับ bookings.tsx เพื่อ implement Smart Customer Lookup

## Changes Required

เนื่องจากไฟล์ bookings.tsx ยาว 859 บรรทัด ให้แก้ไขดังนี้:

### 1. เพิ่ม Import Alert

```typescript
// เพิ่มใน import section (บรรทัด 1-26)
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
```

### 2. เพิ่ม State (แทนบรรทัด 75-108)

```typescript
const [bookings, setBookings] = useState<Booking[]>([])
const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
const [loading, setLoading] = useState(true)
const [searchQuery, setSearchQuery] = useState('')
const [statusFilter, setStatusFilter] = useState('all')
const [isDialogOpen, setIsDialogOpen] = useState(false)
const [customers, setCustomers] = useState<Customer[]>([])
const [servicePackages, setServicePackages] = useState<ServicePackage[]>([])
const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
const [teams, setTeams] = useState<Team[]>([])
const [staffFilter, setStaffFilter] = useState('all')
const [teamFilter, setTeamFilter] = useState('all')
const [assignmentType, setAssignmentType] = useState<'staff' | 'team' | 'none'>('none')

// Smart Lookup States - ใหม่!
const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null)
const [checkingCustomer, setCheckingCustomer] = useState(false)

const [formData, setFormData] = useState({
  customer_id: '',
  full_name: '',     // เพิ่ม
  email: '',         // เพิ่ม
  phone: '',         // เพิ่ม
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
```

### 3. เพิ่มฟังก์ชัน Calculate End Time (หลังบรรทัด 242)

```typescript
// Calculate end_time from start_time and duration
const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  if (!startTime) return ''
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
}
```

### 4. เพิ่มฟังก์ชัน Check Customer by Email (หลัง calculateEndTime)

```typescript
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
    // No customer found - that's ok
    setExistingCustomer(null)
  } finally {
    setCheckingCustomer(false)
  }
}
```

### 5. เพิ่มฟังก์ชัน Check Customer by Phone (หลัง handleEmailBlur)

```typescript
const handlePhoneBlur = async () => {
  if (!formData.phone || formData.phone.trim() === '' || existingCustomer) return

  setCheckingCustomer(true)

  try {
    const { data, error } = await supabase
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
```

### 6. เพิ่มฟังก์ชัน Use Existing Customer (หลัง handlePhoneBlur)

```typescript
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
```

### 7. แก้ไข handleSubmit (แทนบรรทัด 244-273)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  try {
    let customerId = formData.customer_id

    // ถ้าไม่มี customer_id = ลูกค้าใหม่
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

    const { error } = await supabase.from('bookings').insert(submitData)

    if (error) throw error

    toast({
      title: 'Success',
      description: 'Booking created successfully',
    })
    setIsDialogOpen(false)
    resetForm()
    fetchBookings()
    fetchCustomers() // Refresh customer list
  } catch (error: any) {
    toast({
      title: 'Error',
      description: error.message || 'Failed to create booking',
      variant: 'destructive',
    })
  }
}
```

### 8. แก้ไข resetForm (แทนบรรทัด 275-292)

```typescript
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
```

### 9. แก้ไข Form - Customer Section (แทนบรรทัด 445-466)

```typescript
{/* Customer Information */}
<div className="space-y-4 sm:col-span-2 border-t pt-4">
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
```

### 10. แก้ไข Time Fields (แทนบรรทัด 579-603)

```typescript
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
  <Label htmlFor="end_time_display">End Time (Auto)</Label>
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
```

## ผลลัพธ์ที่ได้

1. ✅ กรอกชื่อ, อีเมล, เบอร์
2. ✅ Blur จากอีเมล → ระบบเช็คทันที
3. ✅ ถ้าเจอ → แสดง Alert พร้อมปุ่ม "Use Existing Data"
4. ✅ คลิกปุ่ม → Auto-fill ทุกอย่าง
5. ✅ End Time คำนวณอัตโนมัติ
6. ✅ ถ้าไม่เจอ → สร้างลูกค้าใหม่พร้อมกับ booking

## UX Flow

```
กรอกอีเมล: may@example.com
    ↓
[Blur event]
    ↓
ระบบเช็ค... (Checking...)
    ↓
✅ Customer Found!
┌────────────────────────────────────────┐
│ Customer Found: May (0918357924)       │
│               [Use Existing Data]      │
└────────────────────────────────────────┘
    ↓
คลิก "Use Existing Data"
    ↓
✨ Auto-fill:
- Full Name: May
- Phone: 0918357924
- Address: 889/315, Korat
- City: Korat
- State: Korat
- ZIP: 30000
```

ต้องการให้ฉันสร้างไฟล์ bookings.tsx ใหม่ทั้งหมดที่แก้ไขเรียบร้อยแล้วไหมครับ?
