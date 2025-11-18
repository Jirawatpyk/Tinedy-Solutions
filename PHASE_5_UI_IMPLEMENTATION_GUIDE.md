# 📘 Phase 5: UI Components Implementation Guide

**วันที่:** 2025-01-17
**สถานะ:** 🟢 เสร็จสมบูรณ์: Bookings, Customers, Staff, Teams | 🟡 รอ: Service Packages, Settings

---

## ✅ สิ่งที่เสร็จแล้ว: Bookings Page

### **ไฟล์ที่สร้าง:**

1. **[src/components/common/PermissionAwareDeleteButton.tsx](src/components/common/PermissionAwareDeleteButton.tsx)**
   - Smart delete button ที่แสดง action ต่างกันตาม role
   - **Admin** → แสดงปุ่ม "Delete" (Trash icon, สีแดง) → Hard delete
   - **Manager** → แสดงปุ่ม "Cancel" (Archive icon, สีส้ม) → Soft delete
   - **Staff** → ไม่แสดงปุ่ม
   - ใช้ `usePermissions()` hook ตรวจสอบสิทธิ์
   - Confirmation dialog ที่แตกต่างกันตาม action

### **ไฟล์ที่แก้ไข:**

2. **[src/components/booking/BookingList.tsx](src/components/booking/BookingList.tsx)**
   - Line 8: เปลี่ยนจาก `DeleteButton` เป็น `PermissionAwareDeleteButton`
   - Line 279-285: อัพเดทการใช้ component
     ```typescript
     <PermissionAwareDeleteButton
       resource="bookings"
       itemName={`Booking #${booking.id.slice(0, 8)}`}
       onDelete={() => onDeleteBooking(booking.id)}
       onCancel={() => onDeleteBooking(booking.id)}
       cancelText="Cancel"
     />
     ```

3. **[src/components/booking/RecurringBookingCard.tsx](src/components/booking/RecurringBookingCard.tsx)**
   - Line 31: เปลี่ยนจาก `DeleteButton` เป็น `PermissionAwareDeleteButton`
   - Line 143-149: อัพเดทการใช้ component สำหรับ recurring group

---

## 🎯 ผลลัพธ์:

### **สำหรับ Admin:**
- ✅ เห็นปุ่ม **Delete** (🗑️ สีแดง)
- ✅ สามารถ **hard delete** booking ได้
- ✅ Confirmation: "This action cannot be undone..."

### **สำหรับ Manager:**
- ✅ เห็นปุ่ม **Cancel** (📦 สีส้ม)
- ✅ สามารถ **soft delete** (cancel) booking ได้
- ✅ Confirmation: "This will cancel/archive the item. Admins can restore it later..."
- ✅ ข้อมูลจะถูก mark deleted_at แต่ไม่ถูกลบออกจาก database

### **สำหรับ Staff:**
- ✅ **ไม่เห็นปุ่ม** delete/cancel
- ✅ อ่านอย่างเดียว (read-only)

---

## ✅ สิ่งที่เสร็จแล้ว (Phase 5 Complete): Teams Page

### **ไฟล์ที่แก้ไข:**

1. **[src/components/teams/team-card.tsx](src/components/teams/team-card.tsx)**
   - Line 38: เพิ่ม `onCancel?: (teamId: string) => void` prop
   - Line 53: เพิ่ม `onCancel` parameter
   - Line 122-128: อัพเดทการใช้ `PermissionAwareDeleteButton`

     ```typescript
     <PermissionAwareDeleteButton
       resource="teams"
       itemName={team.name}
       onDelete={() => onDelete(team.id)}
       onCancel={onCancel ? () => onCancel(team.id) : undefined}
       cancelText="Archive"
     />
     ```

2. **[src/pages/admin/teams.tsx](src/pages/admin/teams.tsx)**
   - Line 106: เพิ่ม `.is('deleted_at', null)` filter
   - Line 369-393: เพิ่ม `archiveTeam` function

     ```typescript
     const archiveTeam = async (teamId: string) => {
       try {
         const { error } = await supabase
           .rpc('soft_delete_record', {
             table_name: 'teams',
             record_id: teamId
           })
         // ... handle success/error
       }
     }
     ```

   - Line 682: ส่ง `onCancel={archiveTeam}` prop ให้ TeamCard

### **ผลลัพธ์:**

- ✅ Admin เห็นปุ่ม **Delete** (🗑️ สีแดง) - hard delete
- ✅ Manager เห็นปุ่ม **Archive** (📦 สีส้ม) - soft delete
- ✅ Staff ไม่เห็นปุ่มใดๆ
- ✅ Teams ที่ถูก archive ไม่แสดงในรายการ

---

## 📋 วิธีทำซ้ำสำหรับ Pages อื่นๆ

### **Pattern ที่ใช้ซ้ำได้:**

1. **หาไฟล์ที่มีปุ่ม Delete**
   ```bash
   grep -r "DeleteButton" src/pages/admin/
   grep -r "delete\|Delete" src/pages/admin/customers.tsx
   ```

2. **Import PermissionAwareDeleteButton**
   ```typescript
   import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
   ```

3. **แทนที่ DeleteButton**
   ```typescript
   // Before
   <DeleteButton
     itemName="Customer"
     onDelete={() => handleDelete(id)}
   />

   // After
   <PermissionAwareDeleteButton
     resource="customers"  // ← resource name
     itemName="Customer"
     onDelete={() => handleDelete(id)}
     onCancel={() => handleCancel(id)}  // ← soft delete handler
     cancelText="Archive"  // ← custom text
   />
   ```

4. **เพิ่ม Soft Delete Handler (ถ้ายังไม่มี)**
   ```typescript
   const handleCancel = async (id: string) => {
     const { error } = await supabase
       .rpc('soft_delete_record', {
         table_name: 'customers',
         record_id: id
       })

     if (error) throw error

     toast({
       title: 'Success',
       description: 'Customer archived successfully'
     })

     fetchCustomers()
   }
   ```

---

## 🔧 Customers Page Implementation

### **ไฟล์ที่ต้องแก้: `src/pages/admin/customers.tsx`**

#### **Step 1: เพิ่ม Import**
```typescript
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
```

#### **Step 2: หาปุ่ม Delete**
```bash
grep -n "delete\|Delete\|trash" src/pages/admin/customers.tsx
```

#### **Step 3: แทนที่ DeleteButton**

**ตำแหน่งที่คาดว่าจะมี:**
- ในตาราง customers (แต่ละแถว)
- ใน customer detail modal/card
- ใน bulk actions toolbar

**ตัวอย่าง:**
```typescript
<PermissionAwareDeleteButton
  resource="customers"
  itemName={customer.full_name}
  onDelete={() => deleteCustomer(customer.id)}
  onCancel={() => archiveCustomer(customer.id)}
  cancelText="Archive"
/>
```

#### **Step 4: เพิ่ม Archive Function**
```typescript
const archiveCustomer = async (customerId: string) => {
  try {
    const { error } = await supabase
      .rpc('soft_delete_record', {
        table_name: 'customers',
        record_id: customerId
      })

    if (error) throw error

    toast({
      title: 'Success',
      description: 'Customer archived successfully'
    })

    fetchCustomers()
  } catch (error) {
    console.error('Archive customer error:', error)
    toast({
      title: 'Error',
      description: 'Failed to archive customer',
      variant: 'destructive'
    })
  }
}
```

#### **Step 5: Filter Deleted Records**
```typescript
// ใน fetchCustomers() function
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .is('deleted_at', null)  // ← เพิ่มบรรทัดนี้
  .order('created_at', { ascending: false })
```

---

## 🔧 Staff Page Implementation

### **ไฟล์ที่ต้องแก้: `src/pages/admin/staff.tsx`**

#### **Considerations:**
- **Create Staff**: เฉพาะ Admin เท่านั้น
- **Delete Staff**: เฉพาะ Admin เท่านั้น
- **Update Staff**: Admin และ Manager (แต่ Manager ไม่สามารถเปลี่ยน role)
- **Assign Staff**: Admin และ Manager

#### **Step 1: เพิ่ม Permission Checks สำหรับ Create Button**
```typescript
import { usePermissions } from '@/hooks/use-permissions'

function StaffPage() {
  const { hasFeature } = usePermissions()

  return (
    <>
      {/* Create button - Admin only */}
      {hasFeature('create_staff') && (
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      )}

      {/* Staff list with permission-aware delete */}
      <StaffList
        staff={staff}
        onDelete={deleteStaff}
        onArchive={archiveStaff}
      />
    </>
  )
}
```

#### **Step 2: แทนที่ Delete Button**
```typescript
<PermissionAwareDeleteButton
  resource="staff"
  itemName={staff.full_name}
  onDelete={() => deleteStaff(staff.id)}
  // Manager ไม่มี soft delete สำหรับ staff
  // เพราะ staff คือ user account
/>
```

**Note:** Staff/User accounts ไม่ควรมี soft delete เพราะเป็น critical data ควรให้เฉพาะ Admin delete ได้เท่านั้น

---

## 🔧 Teams Page Implementation

### **ไฟล์ที่ต้องแก้: `src/pages/admin/teams.tsx`**

#### **Permissions:**
- **Create Team**: Admin และ Manager
- **Update Team**: Admin และ Manager
- **Delete Team**: เฉพาะ Admin (hard delete)
- **Archive Team**: Manager (soft delete)

#### **Implementation:**
```typescript
<PermissionAwareDeleteButton
  resource="teams"
  itemName={team.name}
  onDelete={() => deleteTeam(team.id)}
  onCancel={() => archiveTeam(team.id)}
  cancelText="Archive"
/>
```

---

## 🎨 UI/UX Guidelines

### **Icon และ Color Coding:**

| Action | Icon | Color | Role |
|--------|------|-------|------|
| **Delete** (Hard) | 🗑️ Trash2 | Red (`text-destructive`) | Admin only |
| **Cancel/Archive** (Soft) | 📦 Archive | Orange (`text-orange-500`) | Manager |
| **Restore** | ♻️ RotateCcw | Green (`text-green-600`) | Admin, Manager |

### **Confirmation Messages:**

**Hard Delete (Admin):**
```
Title: "Are you sure you want to delete [item]?"
Description: "This action cannot be undone. This will permanently delete the item from the system."
Confirm Button: "Delete" (red)
```

**Soft Delete (Manager):**
```
Title: "Are you sure you want to cancel [item]?"
Description: "This will cancel/archive the item. Admins can restore it later if needed."
Confirm Button: "Cancel" / "Archive" (default)
```

---

## 🧪 Testing Checklist

### **สำหรับแต่ละ Page:**

#### **Admin User:**
- [ ] เห็นปุ่ม "Delete" (red trash icon)
- [ ] คลิกแล้วเห็น confirmation "cannot be undone"
- [ ] Delete แล้วข้อมูลหายจาก database
- [ ] เห็นปุ่ม "Add/Create" (ถ้ามี)
- [ ] เข้าถึง Settings ได้

#### **Manager User:**
- [ ] เห็นปุ่ม "Cancel/Archive" (orange archive icon)
- [ ] คลิกแล้วเห็น confirmation "can restore later"
- [ ] Cancel แล้วข้อมูลมี deleted_at แต่ไม่หาย
- [ ] **ไม่เห็น**ปุ่ม "Add Staff" (admin only)
- [ ] **ไม่เข้าถึง** Settings

#### **Staff User:**
- [ ] **ไม่เห็น**ปุ่ม delete/cancel ใดๆ
- [ ] **ไม่เห็น**หน้า admin/manager pages
- [ ] เห็นเฉพาะ assigned data

---

## 📊 Progress Tracking

| Page | Permission Check | Soft Delete | Testing | Status |
|------|-----------------|-------------|---------|--------|
| **Bookings** | ✅ Done | ✅ Done | ⏳ Pending | 🟢 Complete |
| **Customers** | ✅ Done | ✅ Done | ⏳ Pending | 🟢 Complete |
| **Staff** | ✅ Done | N/A | ⏳ Pending | 🟢 Complete |
| **Teams** | ✅ Done | ✅ Done | ⏳ Pending | 🟢 Complete |
| **Service Packages** | ⏳ Todo | ⏳ Todo | ⏳ Pending | 🟡 Admin only |
| **Settings** | ⏳ Todo | N/A | ⏳ Pending | 🟡 Admin only |

---

## 🚀 Quick Start - Copy & Paste Template

### **สำหรับ Any Page:**

```typescript
// 1. Import
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { usePermissions } from '@/hooks/use-permissions'

// 2. In Component
function YourPage() {
  const { hasFeature } = usePermissions()

  // 3. Soft Delete Handler
  const handleArchive = async (id: string) => {
    const { error } = await supabase
      .rpc('soft_delete_record', {
        table_name: 'your_table',  // ← แก้ตรงนี้
        record_id: id
      })

    if (error) throw error

    toast({ title: 'Success', description: 'Item archived' })
    fetchData()
  }

  // 4. Hard Delete Handler
  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('your_table')  // ← แก้ตรงนี้
      .delete()
      .eq('id', id)

    if (error) throw error

    toast({ title: 'Success', description: 'Item deleted' })
    fetchData()
  }

  return (
    <>
      {/* 5. Create Button (if applicable) */}
      {hasFeature('create_staff') && (
        <Button onClick={openCreateModal}>Add Item</Button>
      )}

      {/* 6. Delete Button */}
      <PermissionAwareDeleteButton
        resource="your_resource"  // ← แก้ตรงนี้
        itemName="Item Name"
        onDelete={() => handleDelete(id)}
        onCancel={() => handleArchive(id)}
        cancelText="Archive"
      />
    </>
  )
}
```

---

## 💡 Tips & Best Practices

### **1. Resource Names ต้องตรงกับ PermissionResource type:**
```typescript
// ถูก ✅
resource="bookings"
resource="customers"
resource="staff"
resource="teams"

// ผิด ❌
resource="booking"     // เอกพจน์
resource="Customers"   // ตัวใหญ่
resource="users"       // ใช้ "staff" แทน
```

### **2. Soft Delete ควรใช้กับ:**
- ✅ Transactional data: bookings, orders
- ✅ Customer data: customers, contacts
- ✅ Organizational data: teams, departments
- ❌ User accounts: staff (use hard delete, admin only)
- ❌ Configuration: settings, system config

### **3. Error Handling:**
```typescript
try {
  // Delete operation
} catch (error) {
  console.error('Delete failed:', error)

  // Show user-friendly message
  toast({
    title: 'Error',
    description: error instanceof Error
      ? error.message
      : 'Failed to delete item',
    variant: 'destructive'
  })
}
```

### **4. Optimistic Updates (Optional):**
```typescript
// แสดงผลทันทีก่อนรอ API
setItems(items.filter(item => item.id !== deletedId))

try {
  await deleteItem(deletedId)
  toast({ title: 'Deleted successfully' })
} catch (error) {
  // Rollback on error
  setItems(originalItems)
  toast({ title: 'Failed to delete', variant: 'destructive' })
}
```

---

## 📞 Need Help?

1. ดูตัวอย่างที่ **BookingList.tsx** และ **RecurringBookingCard.tsx**
2. ตรวจสอบ **PermissionAwareDeleteButton.tsx** documentation
3. ทดสอบด้วย admin และ manager accounts
4. ตรวจสอบ RLS policies ใน database

---

**Last Updated:** 2025-01-16
**Status:** 🟢 Bookings Complete | 🟡 3 Pages Remaining
