# แก้ไข Package Selection หายเมื่อกลับจาก Modal

## ปัญหา

เมื่อผู้ใช้:
1. เลือก Package ใน Create/Edit Booking Modal
2. กด **Check Staff Availability** → Modal ปิด
3. เลือก Team/Staff ใน Staff Availability Modal
4. กลับมาที่ Create/Edit Booking Modal

**ผลลัพธ์:** ข้อมูล Package ที่เลือกหายไป ทำให้ไม่เห็นราคาและข้อมูล Package

## สาเหตุ

`packageSelection` state เป็น **local state** ใน Modal component:

```typescript
// BookingCreateModal.tsx (เดิม)
const [packageSelection, setPackageSelection] = useState<PackageSelectionData | null>(null)
```

เมื่อ Modal ปิด (onClose) แล้วเปิดใหม่ → state ถูก re-initialize เป็น `null` ใหม่

## การแก้ไข

**วิธีแก้:** ย้าย `packageSelection` state ไปอยู่ที่ **parent component (bookings.tsx)** และส่งผ่าน props ไปยัง Modal

### Lifting State Up Pattern

```
bookings.tsx (Parent)
├─ createPackageSelection ← State อยู่ที่นี่
├─ editPackageSelection
│
├─ BookingCreateModal (Child)
│   └─ รับ packageSelection + setPackageSelection เป็น props
│
└─ BookingEditModal (Child)
    └─ รับ packageSelection + setPackageSelection เป็น props
```

---

## ไฟล์ที่แก้ไข

### 1. [bookings.tsx](src/pages/admin/bookings.tsx)

#### เพิ่ม Import:
```typescript
import type { PackageSelectionData } from '@/components/service-packages'
```

#### เพิ่ม State ใน Parent:
```typescript
// Package Selection State - Lifted to parent to persist across modal open/close
const [createPackageSelection, setCreatePackageSelection] = useState<PackageSelectionData | null>(null)
const [editPackageSelection, setEditPackageSelection] = useState<PackageSelectionData | null>(null)
```

#### ส่ง Props ไปยัง BookingCreateModal:
```typescript
<BookingCreateModal
  isOpen={isDialogOpen}
  onClose={() => setIsDialogOpen(false)}
  onSuccess={() => {
    // Realtime subscription will update the list automatically
    setIsDialogOpen(false)
    setCreatePackageSelection(null) // Clear selection after success
  }}
  servicePackages={servicePackages}
  staffMembers={staffMembers}
  teams={teams}
  onOpenAvailabilityModal={() => {
    setIsDialogOpen(false)
    setIsAvailabilityModalOpen(true)
  }}
  createForm={createForm}
  assignmentType={createAssignmentType}
  setAssignmentType={setCreateAssignmentType}
  calculateEndTime={calculateEndTime}
  packageSelection={createPackageSelection}  // ✨ ใหม่
  setPackageSelection={setCreatePackageSelection}  // ✨ ใหม่
/>
```

#### ส่ง Props ไปยัง BookingEditModal:
```typescript
<BookingEditModal
  isOpen={isEditOpen}
  onClose={() => setIsEditOpen(false)}
  booking={selectedBooking}
  onSuccess={fetchBookings}
  servicePackages={servicePackages}
  staffMembers={staffMembers}
  teams={teams}
  onOpenAvailabilityModal={() => {
    setIsEditOpen(false)
    setIsEditAvailabilityModalOpen(true)
  }}
  editForm={editForm}
  assignmentType={editAssignmentType}
  onAssignmentTypeChange={setEditAssignmentType}
  calculateEndTime={calculateEndTime}
  packageSelection={editPackageSelection}  // ✨ ใหม่
  setPackageSelection={setEditPackageSelection}  // ✨ ใหม่
/>
```

---

### 2. [BookingCreateModal.tsx](src/components/booking/BookingCreateModal.tsx)

#### เปลี่ยน Interface:
```typescript
interface BookingCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  servicePackages: ServicePackage[]
  staffMembers: StaffMember[]
  teams: Team[]
  onOpenAvailabilityModal: () => void
  createForm: BookingForm
  assignmentType: 'staff' | 'team' | 'none'
  setAssignmentType: (type: 'staff' | 'team' | 'none') => void
  calculateEndTime: (startTime: string, durationMinutes: number) => string
  packageSelection: PackageSelectionData | null  // ✨ ใหม่
  setPackageSelection: (selection: PackageSelectionData | null) => void  // ✨ ใหม่
}
```

#### รับ Props แทน Local State:
```typescript
export function BookingCreateModal({
  isOpen,
  onClose,
  onSuccess,
  servicePackages,
  staffMembers,
  teams,
  onOpenAvailabilityModal,
  createForm,
  assignmentType,
  setAssignmentType,
  calculateEndTime,
  packageSelection,  // ✨ รับจาก parent
  setPackageSelection,  // ✨ รับจาก parent
}: BookingCreateModalProps) {
  const { toast } = useToast()
  const [existingCustomer, setExistingCustomer] = useState<CustomerRecord | null>(null)
  const [checkingCustomer, setCheckingCustomer] = useState(false)
  // ❌ ลบ local state
  // const [packageSelection, setPackageSelection] = useState<PackageSelectionData | null>(null)
```

---

### 3. [BookingEditModal.tsx](src/components/booking/BookingEditModal.tsx)

#### เปลี่ยน Interface:
```typescript
interface BookingEditModalProps {
  isOpen: boolean
  onClose: () => void
  booking: Booking | null
  onSuccess: () => void
  servicePackages: ServicePackage[]
  staffMembers: StaffMember[]
  teams: Team[]
  onOpenAvailabilityModal: () => void
  editForm: BookingForm
  assignmentType: 'staff' | 'team' | 'none'
  onAssignmentTypeChange: (type: 'staff' | 'team' | 'none') => void
  calculateEndTime: (startTime: string, duration: number) => string
  packageSelection: PackageSelectionData | null  // ✨ ใหม่
  setPackageSelection: (selection: PackageSelectionData | null) => void  // ✨ ใหม่
}
```

#### รับ Props แทน Local State:
```typescript
export function BookingEditModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
  servicePackages,
  staffMembers,
  teams,
  onOpenAvailabilityModal,
  editForm,
  assignmentType,
  onAssignmentTypeChange,
  calculateEndTime,
  packageSelection,  // ✨ รับจาก parent
  setPackageSelection,  // ✨ รับจาก parent
}: BookingEditModalProps) {
  const { toast } = useToast()
  const {
    checkConflicts,
    clearConflicts,
  } = useConflictDetection()

  const [conflictOverride, setConflictOverride] = useState(false)
  // ❌ ลบ local state
  // const [packageSelection, setPackageSelection] = useState<PackageSelectionData | null>(null)
```

---

## การทำงาน

### ก่อนแก้ไข:
```
1. เลือก Package → packageSelection (local state) = { price: 3900, ... }
2. กด Check Staff Availability → Modal ปิด → ส่ง onClose()
3. Modal ถูก unmount → local state หายไป
4. กลับมาจาก Staff Modal → Modal mount ใหม่
5. packageSelection = null (re-initialized) ❌
```

### หลังแก้ไข:
```
1. เลือก Package → createPackageSelection (parent state) = { price: 3900, ... }
2. กด Check Staff Availability → Modal ปิด → ส่ง onClose()
3. Modal ถูก unmount แต่ parent state ยังอยู่ ✅
4. กลับมาจาก Staff Modal → Modal mount ใหม่
5. รับ packageSelection จาก parent = { price: 3900, ... } ✅
```

---

## Benefits

✅ **State Persistence** - ข้อมูล Package ที่เลือกไม่หายเมื่อเปิด-ปิด Modal
✅ **Proper React Pattern** - ใช้ Lifting State Up pattern อย่างถูกต้อง
✅ **Better UX** - ผู้ใช้ไม่ต้องเลือก Package ใหม่หลังกลับจาก Staff Modal
✅ **Consistent Behavior** - ทั้ง Create และ Edit Modal ทำงานเหมือนกัน

---

## Testing Checklist

- [x] เลือก Package → กด Check Staff Availability → เลือก Team → กลับมา → Package ยังอยู่
- [x] เลือก Package → กด Check Staff Availability → เลือก Staff → กลับมา → Package ยังอยู่
- [x] เลือก Package → กด Check Staff Availability → กด Back → Package ยังอยู่
- [x] สร้าง Booking สำเร็จ → เปิด Create Modal ใหม่ → Package ไม่มี (ถูก clear)
- [ ] Edit Booking → เลือก Package ใหม่ → กด Check Staff → กลับมา → Package ยังอยู่

---

## React Pattern: Lifting State Up

การแก้ไขนี้ใช้หลักการ **Lifting State Up** ของ React:

> When several components need to reflect the same changing data, we recommend lifting the shared state up to their closest common ancestor.

**เมื่อใช้:**
- หลาย components ต้องการ share state เดียวกัน
- Child component ต้องการ persist state แม้ว่า component จะ unmount

**ข้อดี:**
- Single source of truth
- State ไม่หายเมื่อ component unmount
- ง่ายต่อการ debug และ maintain

---

**Date:** 2025-01-11
**Author:** Claude Code
**Version:** 1.2
**Pattern:** Lifting State Up
