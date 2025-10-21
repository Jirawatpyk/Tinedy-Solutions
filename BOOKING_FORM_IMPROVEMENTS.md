# Booking Form Improvements Guide

## สรุปการปรับปรุง

ให้แก้ไข `src/pages/admin/bookings.tsx` ตามขั้นตอนด้านล่าง เพื่อ:
1. ✅ Auto-calculate End Time จาก Start Time + Duration
2. ✅ Quick Add Customer (สร้างลูกค้าใหม่แบบด่วน)
3. ✅ Auto-fill Address เมื่อเลือกลูกค้า

---

## Step 1: เพิ่ม Calculate End Time Function

เพิ่มฟังก์ชันคำนวณ end_time หลังบรรทัด 232 (ก่อน `handleSubmit`):

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

---

## Step 2: เพิ่ม Quick Add Customer Function

เพิ่มฟังก์ชันสร้างลูกค้าใหม่แบบด่วน หลัง `calculateEndTime`:

```typescript
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          full_name: quickCustomerForm.full_name,
          email: quickCustomerForm.email,
          phone: quickCustomerForm.phone,
          relationship_level: 'new',
          preferred_contact_method: 'phone',
        })
        .select('id, full_name, email, phone, address, city, state, zip_code')
        .single()

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Customer created successfully',
      })

      // Add to customers list
      setCustomers([...customers, data])

      // Select the new customer
      setFormData({ ...formData, customer_id: data.id })

      // Close dialog and reset form
      setIsQuickAddCustomerOpen(false)
      setQuickCustomerForm({ full_name: '', email: '', phone: '' })

      // Refresh customers list
      fetchCustomers()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create customer',
        variant: 'destructive',
      })
    }
  }
```

---

## Step 3: เพิ่ม Auto-fill Address Function

เพิ่มฟังก์ชัน auto-fill address เมื่อเลือกลูกค้า:

```typescript
  const handleCustomerChange = (customerId: string) => {
    const selected = customers.find(c => c.id === customerId)
    if (selected) {
      setFormData({
        ...formData,
        customer_id: customerId,
        address: selected.address || '',
        city: selected.city || '',
        state: selected.state || '',
        zip_code: selected.zip_code || '',
      })
    } else {
      setFormData({ ...formData, customer_id: customerId })
    }
  }
```

---

## Step 4: แก้ไขฟอร์ม - Customer Section (บรรทัด 435-455)

**เปลี่ยนจาก:**
```typescript
<div className="space-y-2 sm:col-span-2">
  <Label htmlFor="customer_id">Customer *</Label>
  <Select
    value={formData.customer_id}
    onValueChange={(value) =>
      setFormData({ ...formData, customer_id: value })
    }
    required
  >
    <SelectTrigger>
      <SelectValue placeholder="Select customer" />
    </SelectTrigger>
    <SelectContent>
      {customers.map((customer) => (
        <SelectItem key={customer.id} value={customer.id}>
          {customer.full_name} ({customer.email})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**เป็น:**
```typescript
<div className="space-y-2 sm:col-span-2">
  <div className="flex items-center justify-between">
    <Label htmlFor="customer_id">Customer *</Label>
    <Button
      type="button"
      variant="link"
      size="sm"
      onClick={() => setIsQuickAddCustomerOpen(true)}
      className="text-tinedy-blue h-auto p-0"
    >
      + Add New Customer
    </Button>
  </div>
  <Select
    value={formData.customer_id}
    onValueChange={handleCustomerChange}
    required
  >
    <SelectTrigger>
      <SelectValue placeholder="Select customer" />
    </SelectTrigger>
    <SelectContent>
      {customers.map((customer) => (
        <SelectItem key={customer.id} value={customer.id}>
          {customer.full_name} ({customer.email})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

---

## Step 5: แก้ไข Start Time & End Time (บรรทัด 568-592)

**เปลี่ยนจาก:**
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
  <Label htmlFor="end_time">End Time *</Label>
  <Input
    id="end_time"
    type="time"
    value={formData.end_time}
    onChange={(e) =>
      setFormData({ ...formData, end_time: e.target.value })
    }
    required
  />
</div>
```

**เป็น:**
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

---

## Step 6: แก้ handleSubmit ให้คำนวณ end_time ก่อน insert (บรรทัด 233)

**เปลี่ยนบรรทัด 233-262 จาก:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  try {
    const submitData = {
      ...formData,
      staff_id: assignmentType === 'staff' ? (formData.staff_id || null) : null,
      team_id: assignmentType === 'team' ? (formData.team_id || null) : null,
      status: 'pending',
    }

    const { error } = await supabase.from('bookings').insert(submitData)
```

**เป็น:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  try {
    // Calculate end_time
    const selectedPackage = servicePackages.find(pkg => pkg.id === formData.service_package_id)
    const endTime = selectedPackage
      ? calculateEndTime(formData.start_time, selectedPackage.duration_minutes)
      : formData.end_time

    const submitData = {
      ...formData,
      end_time: endTime,
      staff_id: assignmentType === 'staff' ? (formData.staff_id || null) : null,
      team_id: assignmentType === 'team' ? (formData.team_id || null) : null,
      status: 'pending',
    }

    const { error } = await supabase.from('bookings').insert(submitData)
```

---

## Step 7: เพิ่ม Quick Add Customer Dialog (ก่อนปิด return ของ component)

เพิ่มก่อน `</div>` สุดท้ายของ return statement (ก่อนบรรทัด 846):

```typescript
      {/* Quick Add Customer Dialog */}
      <Dialog open={isQuickAddCustomerOpen} onOpenChange={setIsQuickAddCustomerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Add Customer</DialogTitle>
            <DialogDescription>
              Add basic customer information. You can update details later from the Customers page.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickAddCustomer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick_full_name">Full Name *</Label>
              <Input
                id="quick_full_name"
                value={quickCustomerForm.full_name}
                onChange={(e) =>
                  setQuickCustomerForm({ ...quickCustomerForm, full_name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick_email">Email *</Label>
              <Input
                id="quick_email"
                type="email"
                value={quickCustomerForm.email}
                onChange={(e) =>
                  setQuickCustomerForm({ ...quickCustomerForm, email: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick_phone">Phone *</Label>
              <Input
                id="quick_phone"
                type="tel"
                value={quickCustomerForm.phone}
                onChange={(e) =>
                  setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })
                }
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuickAddCustomerOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-tinedy-blue">
                Add Customer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

## สรุปการปรับปรุง

### ✅ Auto-calculate End Time
- เพิ่มฟังก์ชัน `calculateEndTime()`
- แสดง End Time แบบ disabled field
- Auto-update เมื่อเลือก service หรือเปลี่ยน start time

### ✅ Quick Add Customer
- ปุ่ม "+ Add New Customer" ข้างๆ label
- Dialog เล็กๆ กรอกแค่ ชื่อ, อีเมล, เบอร์โทร
- สร้างแล้วเลือกลูกค้าใหม่ทันที
- กลับมากรอก address ในฟอร์ม booking ต่อ

### ✅ Auto-fill Address
- เมื่อเลือกลูกค้า จะดึงข้อมูล address, city, state, zip_code มา auto-fill
- ยังแก้ไขได้ถ้าต้องการ address อื่น

---

## UX Flow

**กรณีลูกค้าเก่า:**
1. เลือกลูกค้าจาก dropdown
2. Address auto-fill ✨
3. กรอก service, date, time
4. Submit

**กรณีลูกค้าใหม่:**
1. คลิก "+ Add New Customer"
2. กรอกชื่อ, อีเมล, เบอร์โทร (แค่ 3 ฟิลด์)
3. ลูกค้าใหม่ถูกเลือกอัตโนมัติ
4. กรอก address ในฟอร์ม booking
5. กรอก service, date, time
6. Submit

---

## ข้อดี
- ⚡ เร็วขึ้น - ไม่ต้องออกจากหน้า Booking
- 📋 Auto-fill - ลดการพิมพ์ซ้ำ
- 🎯 Flexible - สามารถแก้ address ในฟอร์มได้ (กรณีที่บ้านต่างจากข้อมูลเดิม)
- ✅ End Time auto-calculate - ไม่ผิดพลาด

---

## หมายเหตุ
- ลูกค้าที่สร้างจาก Quick Add จะมี `relationship_level = 'new'`
- สามารถไปแก้ไขข้อมูลเพิ่มเติมได้ที่หน้า Customers ภายหลัง
- Address ที่กรอกในฟอร์ม booking จะเก็บไว้ที่ `bookings.address` ไม่ได้ update `customers.address`
