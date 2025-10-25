# Type Safety Migration Guide

## ภาพรวม

เอกสารนี้อธิบายการเปลี่ยนแปลง Type Safety ที่เกิดขึ้นในโปรเจค Tinedy CRM โดยมีเป้าหมายเพื่อ:
- ลด duplicate type definitions
- เพิ่ม type safety และลด `any` usage
- Centralize types ใน `src/types/` directory
- สร้าง runtime type guards สำหรับ validation

## การเปลี่ยนแปลงหลัก

### Phase 1: เพิ่ม Core Types และ Type Guards

#### ไฟล์ใหม่ที่สร้าง

**1. `src/types/team.ts`** - Team-related types (10 interfaces)
- `TeamRecord` - ข้อมูล team พื้นฐาน
- `TeamMemberRecord` - ข้อมูลสมาชิกใน team
- `TeamWithMembers` - Team พร้อม members
- `TeamWithRelations` - Team พร้อม member profiles
- `TeamMemberWithProfile` - Member พร้อม profile data
- `TeamStats` - สถิติการทำงานของ team
- `TeamFormData` - ข้อมูลสำหรับ form
- `TeamSelectOption` - สำหรับ dropdown selection
- `TeamAvailabilitySlot` - ช่วงเวลาที่ team ว่าง
- `TeamPerformanceMetrics` - metrics การทำงาน

**2. `src/types/staff.ts`** - Staff-related types (11 interfaces)
- `StaffRecord` - ข้อมูล staff พื้นฐาน (extends UserProfile)
- `StaffWithTeams` - Staff พร้อม team memberships
- `StaffTeamMembership` - ข้อมูล membership
- `StaffPerformanceMetrics` - metrics การทำงาน
- `StaffAvailabilitySlot` - ช่วงเวลาที่ staff ว่าง
- `StaffScheduleEntry` - รายการ schedule
- `StaffFormData` - ข้อมูลสำหรับ form
- `StaffSelectOption` - สำหรับ dropdown selection
- `StaffBookingHistory` - ประวัติการจอง
- `StaffRatingStats` - สถิติ rating
- `StaffWorkloadStats` - สถิติ workload

**3. `src/lib/type-guards.ts`** - Runtime type validation (20+ functions)

Type Guards หลัก:
```typescript
// Basic type guards
isCustomer(obj: unknown): obj is Customer
isBooking(obj: unknown): obj is Booking
isTeam(obj: unknown): obj is TeamRecord
isStaff(obj: unknown): obj is StaffRecord
isServicePackage(obj: unknown): obj is ServicePackage

// Array type guards
isArrayOf<T>(arr: unknown, guard: (item: unknown) => item is T): arr is T[]

// Utility functions
ensureArray<T>(data: T[] | null | undefined): T[]
assertType<T>(obj: unknown, guard: (obj: unknown) => obj is T, errorMessage?: string): asserts obj is T
```

### Phase 2: Supabase Relation Types

**4. `src/types/supabase-relations.ts`** - Types สำหรับ Supabase nested queries

ปัญหา: Supabase returns relations ได้หลายรูปแบบ (Array | Object | null)

```typescript
// ❌ ก่อนแก้ไข
const customer = booking.customers  // type: Customer[] | Customer | null ???

// ✅ หลังแก้ไข
import { extractSingle } from '@/types'
const customer = extractSingle(booking.customers)  // type: Customer | null
```

Types ที่เพิ่ม:
- `BookingWithRelations` - Booking พร้อม nested relations
- `TeamWithMemberProfiles` - Team พร้อม member profiles
- `TeamMemberData` - ข้อมูล team member พร้อม profile
- `CustomerWithBookings` - Customer พร้อม bookings
- `ServicePackageWithDetails` - Service package พร้อมรายละเอียด

Utility Functions:
```typescript
// Extract single object from array or return as-is
extractSingle<T>(relation: T[] | T | null): T | null

// Safe extract array, returns empty array if null
safeExtractData<T>(data: T[] | null): T[]

// Extract array, ensure it's an array
extractArray<T>(relation: T[] | T | null): T[]

// Check if relation is array
isRelationArray<T>(relation: T[] | T | null): relation is T[]

// Check if relation is single object
isRelationSingle<T>(relation: T[] | T | null): relation is T
```

### Phase 3: Consolidate Duplicate Types

ลบ duplicate type definitions จาก 18 ไฟล์

#### Customer Type (8 ไฟล์)

**ไฟล์ที่ได้รับการอัปเดต:**
- `src/lib/analytics.ts`
- `src/components/reports/tabs/CustomersTab.tsx`
- `src/pages/admin/staff-performance.tsx`
- `src/pages/admin/customers.tsx`
- `src/pages/admin/customer-detail.tsx`
- `src/components/booking/BookingCreateModal.tsx`
- `src/pages/admin/weekly-schedule.tsx`
- `src/lib/export.ts`

**การเปลี่ยนแปลง:**
```typescript
// ❌ ก่อนแก้ไข - local definition
interface Customer {
  id: string
  full_name: string
  email?: string
  phone?: string
}

// ✅ หลังแก้ไข - import from @/types
import type { Customer } from '@/types'
```

#### Booking Type (8 ไฟล์)

**ไฟล์ที่ได้รับการอัปเดต:**
- `src/components/teams/team-detail/TeamRecentBookings.tsx`
- `src/lib/analytics.ts`
- `src/pages/admin/booking-detail-modal.tsx`
- `src/pages/admin/calendar.tsx`
- `src/pages/admin/staff-performance.tsx`
- `src/pages/admin/weekly-schedule.tsx`
- `src/pages/payment/payment-success.tsx`
- `src/pages/payment/payment.tsx`

**การเปลี่ยนแปลง:**
```typescript
// ❌ ก่อนแก้ไข - local definition
interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  // ...
}

// ✅ หลังแก้ไข - import from @/types
import type { Booking } from '@/types'
```

#### Profile Type (2 ไฟล์)

**ไฟล์ที่ได้รับการอัปเดต:**
- `src/pages/admin/weekly-schedule.tsx`
- `src/components/staff/profile-avatar.tsx`

**การเปลี่ยนแปลง:**
```typescript
// ❌ ก่อนแก้ไข
interface Profile {
  id: string
  full_name: string
  avatar_url?: string
}

// ✅ หลังแก้ไข - ใช้ UserProfile แทน
import type { UserProfile } from '@/types'

// แทนที่ Profile ด้วย UserProfile ในโค้ด
const user: UserProfile = { ... }
```

## คู่มือการใช้งาน Types ใหม่

### 1. การใช้ Type Guards

```typescript
import { isCustomer, isArrayOf, ensureArray, assertType } from '@/lib/type-guards'

// ตรวจสอบก่อนใช้งาน
function processCustomer(data: unknown) {
  if (isCustomer(data)) {
    // TypeScript รู้ว่า data เป็น Customer
    console.log(data.full_name)
  }
}

// ตรวจสอบ array
function processCustomers(data: unknown) {
  if (isArrayOf(data, isCustomer)) {
    // TypeScript รู้ว่า data เป็น Customer[]
    data.forEach(customer => console.log(customer.full_name))
  }
}

// แปลง null เป็น empty array
const customers = ensureArray(apiResponse.data) // Customer[] | null → Customer[]

// Assert type (throw error ถ้าไม่ตรง)
assertType(data, isCustomer, 'Expected customer data')
// หลังจากนี้ TypeScript รู้ว่า data เป็น Customer
```

### 2. การใช้ Supabase Relation Types

```typescript
import { extractSingle, safeExtractData, extractArray } from '@/types'

// Query booking พร้อม relations
const { data } = await supabase
  .from('bookings')
  .select(`
    *,
    customers(*),
    service_packages(*)
  `)
  .single()

// ดึงข้อมูล customer (single)
const customer = extractSingle(data.customers) // Customer | null

// ดึงข้อมูล service packages (array)
const packages = extractArray(data.service_packages) // ServicePackage[]

// Safe extract - ไม่ throw error ถ้า null
const bookings = safeExtractData(data) // Booking[] (empty array ถ้า null)
```

### 3. การใช้ Team Types

```typescript
import type {
  TeamRecord,
  TeamWithMembers,
  TeamWithRelations,
  TeamStats
} from '@/types'

// Basic team data
const team: TeamRecord = {
  id: 'team-123',
  name: 'Cleaning Team A',
  description: 'Expert cleaning team',
  is_active: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01'
}

// Team with member IDs
const teamWithMembers: TeamWithMembers = {
  ...team,
  team_members: [
    { id: 'tm-1', team_id: 'team-123', staff_id: 'staff-1' }
  ]
}

// Team with full member profiles
const teamWithProfiles: TeamWithRelations = {
  ...team,
  team_members: [
    {
      staff_id: 'staff-1',
      profiles: {
        id: 'staff-1',
        full_name: 'John Doe',
        skills: ['cleaning', 'deep-clean']
      }
    }
  ]
}

// Team statistics
const stats: TeamStats = {
  total_bookings: 150,
  completed_bookings: 145,
  cancelled_bookings: 5,
  pending_bookings: 10,
  total_revenue: 75000,
  member_count: 5,
  average_completion_rate: 96.67
}
```

### 4. การใช้ Staff Types

```typescript
import type {
  StaffRecord,
  StaffWithTeams,
  StaffPerformanceMetrics,
  StaffAvailabilitySlot
} from '@/types'

// Basic staff data
const staff: StaffRecord = {
  id: 'staff-123',
  full_name: 'John Doe',
  email: 'john@example.com',
  role: 'staff',
  is_active: true,
  specializations: ['cleaning', 'deep-clean'],
  hourly_rate: 500
}

// Staff with team memberships
const staffWithTeams: StaffWithTeams = {
  ...staff,
  team_members: [
    {
      id: 'tm-1',
      team_id: 'team-123',
      staff_id: 'staff-123',
      role: 'member',
      joined_at: '2024-01-01'
    }
  ]
}

// Performance metrics
const metrics: StaffPerformanceMetrics = {
  staff_id: 'staff-123',
  full_name: 'John Doe',
  total_bookings: 50,
  completed_bookings: 48,
  cancelled_bookings: 2,
  completion_rate: 96,
  total_revenue: 25000,
  average_rating: 4.8,
  total_hours_worked: 160,
  on_time_rate: 95
}

// Availability slot
const availability: StaffAvailabilitySlot = {
  staff_id: 'staff-123',
  date: '2024-01-15',
  start_time: '09:00',
  end_time: '17:00',
  is_available: true
}
```

## Migration Checklist

### สำหรับ Developers

เมื่อเจอ type errors หลังจาก merge:

- [ ] ตรวจสอบว่า import types จาก `@/types` แทนที่จะ define local
- [ ] ใช้ `UserProfile` แทน `Profile` ในโค้ดใหม่
- [ ] ใช้ `extractSingle()` และ `safeExtractData()` กับ Supabase relations
- [ ] ใช้ type guards จาก `@/lib/type-guards` แทนการใช้ `as any`
- [ ] ตรวจสอบว่าใช้ `TeamWithRelations` แทน `TeamWithMembers` เมื่อต้องการ profiles
- [ ] Run `npx tsc --noEmit` เพื่อ validate types ก่อน commit

### การเพิ่ม Types ใหม่

เมื่อต้องการเพิ่ม type ใหม่:

1. **เช็คว่า type มีอยู่แล้วหรือไม่** ใน `src/types/`
2. **เพิ่ม type ในไฟล์ที่เหมาะสม:**
   - Customer-related → `src/types/customer.ts`
   - Booking-related → `src/types/booking.ts`
   - Team-related → `src/types/team.ts`
   - Staff-related → `src/types/staff.ts`
   - Common types → `src/types/common.ts`
3. **Export จาก** `src/types/index.ts`
4. **สร้าง type guard** ใน `src/lib/type-guards.ts` (ถ้าจำเป็น)
5. **Update documentation** ในไฟล์นี้

## Rollback Procedures

หากเกิดปัญหาสามารถ rollback ได้ตาม git tags:

### Rollback ทั้งหมด
```bash
git reset --hard <commit-before-phase-1>
```

### Rollback เฉพาะ Phase
```bash
# Rollback Phase 3 เท่านั้น
git reset --hard checkpoint-phase-2.1

# Rollback Phase 2.1 เท่านั้น
git reset --hard checkpoint-phase-1

# Rollback Phase 1 เท่านั้น
git reset --hard <commit-before-phase-1>
```

### Git Tags ที่มี
- `checkpoint-phase-1` - หลังเพิ่ม Team, Staff types และ Type Guards
- `checkpoint-phase-2.1` - หลังเพิ่ม Supabase Relation Types
- `checkpoint-phase-3` - หลัง Consolidate Duplicate Types

### การ Rollback แบบปลอดภัย (สร้าง branch ใหม่)
```bash
# สร้าง branch ใหม่จาก checkpoint
git checkout -b rollback-test checkpoint-phase-2.1

# ทดสอบ
npm run build
npm run type-check

# ถ้าใช้ได้ merge กลับ
git checkout main
git merge rollback-test
```

## Breaking Changes

### API Changes ที่อาจกระทบ

**1. Profile → UserProfile**
```typescript
// ❌ เดิม
const user: Profile = { ... }

// ✅ ใหม่
const user: UserProfile = { ... }
```

**2. Supabase Relations**
```typescript
// ❌ เดิม - อาจ error
const customer = booking.customers[0]  // อาจไม่ใช่ array!

// ✅ ใหม่
const customer = extractSingle(booking.customers)
```

**3. Type Assertions**
```typescript
// ❌ เดิม
const data = apiResponse as any
const customers = data.customers

// ✅ ใหม่
if (isCustomer(apiResponse)) {
  const customers = apiResponse.customers
}
```

## ผลลัพธ์ที่ได้

### Metrics

- **Types รวมไฟล์:** 18 duplicate definitions → 3 centralized files
- **Type Guards สร้างใหม่:** 20+ functions
- **Interfaces สร้างใหม่:** 31 interfaces
- **Utility Functions:** 9 functions
- **ไฟล์ที่อัปเดต:** 18 files
- **Build Status:** ✅ ผ่าน
- **TypeScript Errors:** 0 (ใน source code, มี 9 errors ใน test files ที่ไม่เกี่ยวข้อง)

### Benefits

1. **Type Safety ดีขึ้น:**
   - ลดการใช้ `any` type
   - Runtime validation ด้วย type guards
   - Compile-time type checking แม่นยำขึ้น

2. **Maintainability:**
   - Centralized type definitions
   - Single source of truth
   - ง่ายต่อการ update types

3. **Developer Experience:**
   - Better IDE autocomplete
   - Fewer runtime errors
   - Clear type documentation

## ติดต่อ

หากมีคำถามหรือพบปัญหา:
1. ตรวจสอบ type definitions ใน `src/types/`
2. ดู type guard examples ใน `src/lib/type-guards.ts`
3. อ่านเอกสารนี้อีกครั้ง
4. สร้าง issue ใน project repository

---

**Version:** 1.0.0
**Last Updated:** 2025-10-26
**Author:** Type Safety Improvement Team
