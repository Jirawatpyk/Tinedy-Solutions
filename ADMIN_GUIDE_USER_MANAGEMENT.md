# 👨‍💼 Admin Guide - User & Role Management

## 📋 ภาพรวม

คู่มือนี้สำหรับ **Admin users** ในการจัดการ users, roles และ permissions ในระบบ Tinedy CRM หลังจากเพิ่ม Manager role เข้ามาแล้ว

ในฐานะ Admin คุณมีสิทธิ์เต็มในการจัดการระบบ รวมถึงการสร้าง ลบ และเปลี่ยน roles ของ users ทั้งหมด

---

## 🎭 Role System Overview

ระบบ Tinedy CRM มี 3 roles หลัก:

### 1. Admin (Super User) 👑
**Full Access** - สิทธิ์เต็มทุกอย่าง

**Capabilities:**
- ✅ Full CRUD บน all resources
- ✅ Hard Delete (ลบถาวร)
- ✅ Access Settings
- ✅ Manage Users & Roles
- ✅ Manage Service Packages
- ✅ View All Financial Data
- ✅ Permanently Delete Archived Items

**จำนวนที่แนะนำ:** 1-2 users (เจ้าของธุรกิจ/IT Admin)

### 2. Manager (Operations Manager) 🔧
**Operational Access** - จัดการงานประจำวัน

**Capabilities:**
- ✅ CRUD Bookings, Customers, Teams (ยกเว้น Hard Delete)
- ✅ Soft Delete (Archive/Restore)
- ✅ View & Export Reports
- ✅ Assign Staff to Bookings
- ✅ View All Data
- ❌ Cannot Hard Delete
- ❌ Cannot Access Settings
- ❌ Cannot Create/Delete Staff
- ❌ Cannot Manage Service Packages
- ❌ Cannot Manage User Roles

**จำนวนที่แนะนำ:** 2-5 users (ผู้จัดการสาขา/หัวหน้าทีม)

### 3. Staff (Employee) 👤
**Limited Access** - เข้าถึงเฉพาะข้อมูลของตัวเอง

**Capabilities:**
- ✅ View Own Bookings
- ✅ Update Own Profile
- ✅ View Assigned Customers
- ✅ Use Chat System
- ❌ Cannot Create Bookings
- ❌ Cannot View All Data
- ❌ Cannot Delete Anything
- ❌ Cannot Access Reports

**จำนวนที่แนะนำ:** ไม่จำกัด (พนักงานทั้งหมด)

---

## 👥 User Management

### การสร้าง User ใหม่

#### ขั้นตอนที่ 1: สร้าง Auth User (Supabase)

**ผ่าน Supabase Dashboard:**
1. เปิด [Supabase Dashboard](https://app.supabase.com)
2. เลือก project ของคุณ
3. ไปที่ **Authentication** > **Users**
4. กด **"Add User"**
5. กรอกข้อมูล:
   - **Email**: email ของ user
   - **Password**: password เริ่มต้น (ควรให้ user เปลี่ยนภายหลัง)
   - **Auto Confirm User**: ✅ เลือก
6. กด **"Create User"**
7. **คัดลอก User UUID** ที่ได้

**ผ่าน SQL:**
```sql
-- สร้าง auth user ด้วย SQL
-- หมายเหตุ: วิธีนี้ต้องใช้ Supabase admin functions

-- ใช้ Dashboard แทนจะง่ายกว่า
```

#### ขั้นตอนที่ 2: สร้าง Profile Record

**ผ่าน SQL:**
```sql
-- สร้าง profile record
INSERT INTO profiles (
  id,                    -- UUID จาก auth.users
  full_name,
  email,
  role,                  -- 'admin', 'manager', หรือ 'staff'
  staff_number,          -- ถ้าเป็น staff/manager
  phone,
  created_at,
  updated_at
) VALUES (
  'user-uuid-from-step-1',
  'ชื่อ-นามสกุล',
  'email@example.com',
  'manager',             -- เปลี่ยนตาม role ที่ต้องการ
  'M001',               -- staff number
  '081-234-5678',
  NOW(),
  NOW()
);
```

**ผ่าน Application UI** (แนะนำ):
1. Login ด้วย Admin account
2. ไปที่ **Staff** page
3. กด **"Add Staff"** / **"Create User"**
4. กรอกข้อมูล:
   - **Full Name**: ชื่อ-นามสกุล
   - **Email**: email address
   - **Phone**: เบอร์โทรศัพท์
   - **Staff Number**: รหัสพนักงาน (auto-generate หรือกรอกเอง)
   - **Role**: เลือก Staff, Manager, หรือ Admin
5. กด **"Create"**

### การเปลี่ยน Role

#### ผ่าน SQL:
```sql
-- เปลี่ยน Staff เป็น Manager
UPDATE profiles
SET role = 'manager', updated_at = NOW()
WHERE id = 'user-uuid';

-- เปลี่ยน Manager เป็น Admin
UPDATE profiles
SET role = 'admin', updated_at = NOW()
WHERE id = 'user-uuid';

-- เปลี่ยน Manager กลับเป็น Staff
UPDATE profiles
SET role = 'staff', updated_at = NOW()
WHERE id = 'user-uuid';
```

#### ผ่าน Application UI:
1. Login ด้วย Admin account
2. ไปที่ **Staff** page
3. หา user ที่ต้องการเปลี่ยน role
4. กด **"Edit"**
5. เปลี่ยน **Role** dropdown
6. กด **"Save"**

⚠️ **สำคัญ**: User ต้อง logout และ login ใหม่เพื่อให้ role ใหม่มีผล

### การลบ User

#### Soft Delete (แนะนำ):
```sql
-- Archive user (soft delete)
UPDATE profiles
SET deleted_at = NOW(), deleted_by = 'admin-uuid'
WHERE id = 'user-uuid-to-delete';
```

#### Hard Delete (ระวัง!):
```sql
-- ลบ profile record
DELETE FROM profiles WHERE id = 'user-uuid';

-- ลบ auth user (ทำผ่าน Supabase Dashboard)
-- Authentication > Users > เลือก user > Delete
```

⚠️ **คำเตือน**: Hard delete จะลบข้อมูลถาวร ควรใช้ soft delete แทนเสมอ

### การ Restore User

```sql
-- Restore soft-deleted user
UPDATE profiles
SET deleted_at = NULL, deleted_by = NULL, updated_at = NOW()
WHERE id = 'user-uuid';
```

---

## 🔒 Permission Management

### Permission Matrix (สำหรับ Admin เท่านั้น)

ตารางนี้แสดงสิทธิ์แบบเต็ม:

| Resource | Admin | Manager | Staff |
|----------|:-----:|:-------:|:-----:|
| **Bookings** |
| - Create | ✅ | ✅ | ❌ |
| - Read All | ✅ | ✅ | ❌ |
| - Read Assigned | ✅ | ✅ | ✅ |
| - Update | ✅ | ✅ | ⚠️ |
| - Delete (Hard) | ✅ | ❌ | ❌ |
| - Archive (Soft) | ✅ | ✅ | ❌ |
| - Restore | ✅ | ✅ | ❌ |
| - Export | ✅ | ✅ | ❌ |
| **Customers** |
| - Create | ✅ | ✅ | ❌ |
| - Read | ✅ | ✅ | ⚠️ |
| - Update | ✅ | ✅ | ❌ |
| - Delete (Hard) | ✅ | ❌ | ❌ |
| - Archive | ✅ | ✅ | ❌ |
| - Export | ✅ | ✅ | ❌ |
| **Staff** |
| - Create | ✅ | ❌ | ❌ |
| - Read | ✅ | ✅ | ⚠️ |
| - Update | ✅ | ⚠️ | ⚠️ |
| - Delete | ✅ | ❌ | ❌ |
| **Teams** |
| - Create | ✅ | ✅ | ❌ |
| - Read | ✅ | ✅ | ⚠️ |
| - Update | ✅ | ✅ | ❌ |
| - Delete | ✅ | ❌ | ❌ |
| **Service Packages** |
| - Create | ✅ | ❌ | ❌ |
| - Read | ✅ | ✅ | ✅ |
| - Update | ✅ | ❌ | ❌ |
| - Delete | ✅ | ❌ | ❌ |
| **Reports** |
| - View | ✅ | ✅ | ❌ |
| - Export | ✅ | ✅ | ❌ |
| **Settings** |
| - View | ✅ | ❌ | ❌ |
| - Update | ✅ | ❌ | ❌ |
| **Users** |
| - Create | ✅ | ❌ | ❌ |
| - Assign Roles | ✅ | ❌ | ❌ |
| - Delete | ✅ | ❌ | ❌ |

**สัญลักษณ์:**
- ✅ = Full Access
- ❌ = No Access
- ⚠️ = Limited/Conditional Access

### การตรวจสอบ Permissions

**ผ่าน Application:**
1. Login ด้วย role ที่ต้องการทดสอบ
2. พยายามเข้าถึง features ต่างๆ
3. ตรวจสอบว่า UI แสดงถูกต้อง (ปุ่ม/menu ที่ไม่มีสิทธิ์ควรถูกซ่อน)

**ผ่าน Browser Console:**
```javascript
// ตรวจสอบ current user role
const { profile } = useAuth()
console.log('Current Role:', profile.role)

// ตรวจสอบ specific permission
const { can } = usePermissions()
console.log('Can delete bookings:', can('delete', 'bookings'))
console.log('Can create staff:', can('create', 'staff'))
```

**ผ่าน Tests:**
```bash
# รัน permission tests
npm run test:run -- src/lib/__tests__/permissions.test.ts
npm run test:run -- src/hooks/__tests__/use-permissions.test.ts
```

---

## 🎯 Best Practices

### 1. Role Assignment Strategy

**Admin Role:**
- ✅ มอบให้เฉพาะผู้ที่ต้องการ full access จริงๆ
- ✅ ควรมีอย่างน้อย 2 admins (สำหรับ redundancy)
- ✅ ไม่ควรมีมากกว่า 3-5 admins
- ⚠️ Monitor admin activities regularly

**Manager Role:**
- ✅ มอบให้ผู้จัดการสาขา/หัวหน้าทีม
- ✅ คนที่รับผิดชอบ day-to-day operations
- ✅ คนที่ต้องดู reports และ analytics
- ⚠️ Review manager permissions quarterly

**Staff Role:**
- ✅ พนักงานทั่วไป
- ✅ คนที่ให้บริการลูกค้าโดยตรง
- ✅ ไม่ต้องการ administrative access
- ⚠️ Audit staff access logs

### 2. Security Best Practices

**Password Policy:**
- ✅ ใช้ password ที่แข็งแรง (8+ characters, mixed case, numbers)
- ✅ เปลี่ยน password เป็นระยะ (ทุก 3-6 เดือน)
- ✅ ไม่แชร์ accounts
- ✅ Enable 2FA (ถ้า Supabase supports)

**Access Control:**
- ✅ ให้สิทธิ์ตามหลัก "least privilege" (น้อยที่สุดที่จำเป็น)
- ✅ Review permissions regularly
- ✅ Revoke access ทันทีเมื่อ staff ลาออก
- ✅ Use soft delete instead of hard delete

**Audit Trail:**
- ✅ Monitor admin activities
- ✅ Log role changes
- ✅ Track who deleted/archived what
- ✅ Regular security audits

### 3. User Onboarding Process

**สำหรับ Manager ใหม่:**
1. ✅ สร้าง user account
2. ✅ Assign Manager role
3. ✅ ส่งอีเมลต้อนรับพร้อม credentials
4. ✅ แนะนำ [User Guide](USER_GUIDE_MANAGER_ROLE.md)
5. ✅ Training session (ถ้าจำเป็น)
6. ✅ Monitor first week activities

**สำหรับ Staff ใหม่:**
1. ✅ สร้าง user account
2. ✅ Assign Staff role
3. ✅ กำหนด staff number
4. ✅ Assign to team (ถ้ามี)
5. ✅ แนะนำระบบพื้นฐาน
6. ✅ Shadow experienced staff

### 4. User Offboarding Process

**เมื่อ Staff/Manager ลาออก:**
1. ✅ Soft delete user account (ไม่ใช่ hard delete)
2. ✅ Document reason for leaving
3. ✅ Transfer ownership of ongoing bookings
4. ✅ Archive all related data
5. ✅ Review และ revoke any special access
6. ✅ Export data ถ้าจำเป็น (for records)

---

## 📊 Monitoring & Analytics

### User Activity Monitoring

**SQL Queries for Monitoring:**

```sql
-- ดู users ทั้งหมดตาม role
SELECT
  role,
  COUNT(*) as user_count
FROM profiles
WHERE deleted_at IS NULL
GROUP BY role;

-- ดู recent logins (ต้องมี login tracking)
SELECT
  p.full_name,
  p.role,
  p.email,
  a.last_sign_in_at
FROM profiles p
JOIN auth.users a ON p.id = a.id
ORDER BY a.last_sign_in_at DESC
LIMIT 20;

-- ดู inactive users (ไม่ login มานาน)
SELECT
  p.full_name,
  p.role,
  a.last_sign_in_at,
  EXTRACT(DAY FROM (NOW() - a.last_sign_in_at)) as days_inactive
FROM profiles p
JOIN auth.users a ON p.id = a.id
WHERE a.last_sign_in_at < NOW() - INTERVAL '30 days'
AND p.deleted_at IS NULL
ORDER BY a.last_sign_in_at;
```

### Audit Log Queries

```sql
-- ดู deleted/archived records
SELECT
  'booking' as record_type,
  id,
  deleted_at,
  deleted_by
FROM bookings
WHERE deleted_at IS NOT NULL
UNION ALL
SELECT
  'customer',
  id,
  deleted_at,
  deleted_by
FROM customers
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC
LIMIT 50;

-- ดู who deleted what
SELECT
  b.id as booking_id,
  c.full_name as customer_name,
  b.deleted_at,
  p.full_name as deleted_by_name,
  p.role as deleted_by_role
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN profiles p ON b.deleted_by = p.id
WHERE b.deleted_at IS NOT NULL
ORDER BY b.deleted_at DESC;
```

---

## 🛠️ Common Admin Tasks

### Task 1: Promote Staff to Manager

```sql
-- 1. เปลี่ยน role
UPDATE profiles
SET role = 'manager', updated_at = NOW()
WHERE id = 'staff-uuid';

-- 2. แจ้ง user ให้ logout/login ใหม่
-- 3. Monitor first week as manager
```

### Task 2: Demote Manager to Staff

```sql
-- 1. เปลี่ยน role
UPDATE profiles
SET role = 'staff', updated_at = NOW()
WHERE id = 'manager-uuid';

-- 2. Transfer ongoing responsibilities
-- 3. แจ้ง user
```

### Task 3: Create Backup Admin

```sql
-- สร้าง backup admin account
-- ใช้ UI หรือ SQL

-- Verify มี admins อย่างน้อย 2 คน
SELECT COUNT(*) as admin_count
FROM profiles
WHERE role = 'admin' AND deleted_at IS NULL;
```

### Task 4: Bulk Role Assignment

```sql
-- Promote หลาย users เป็น manager
UPDATE profiles
SET role = 'manager', updated_at = NOW()
WHERE id IN (
  'uuid-1',
  'uuid-2',
  'uuid-3'
);
```

### Task 5: Audit User Permissions

```bash
# รัน permission tests
npm run test:run

# ตรวจสอบ console logs
# ตรวจสอบ browser developer tools
# Monitor error logs
```

---

## 🔧 Troubleshooting

### Problem 1: User ไม่สามารถเข้าถึง features ที่ควรเข้าถึงได้

**วิธีแก้:**
1. ตรวจสอบ role ใน database:
```sql
SELECT id, full_name, email, role
FROM profiles
WHERE email = 'user@example.com';
```

2. ตรวจสอบ RLS policies ใน Supabase
3. ให้ user logout และ login ใหม่
4. Clear browser cache

### Problem 2: Manager เห็น admin features

**วิธีแก้:**
1. ตรวจสอบ permission checks ใน code
2. ตรวจสอบว่า UI components ใช้ `usePermissions` hook ถูกต้อง
3. Review [src/lib/permissions.ts](src/lib/permissions.ts)

### Problem 3: Staff สามารถ create bookings ได้ (ไม่ควรได้)

**วิธีแก้:**
1. ตรวจสอบ RLS policies:
```sql
-- Staff ไม่ควร INSERT bookings
SELECT * FROM pg_policies
WHERE tablename = 'bookings'
AND cmd = 'INSERT';
```

2. ตรวจสอบ frontend permission checks
3. รัน tests เพื่อ verify

### Problem 4: Cannot permanently delete archived items (แม้เป็น Admin)

**วิธีแก้:**
1. ตรวจสอบว่า login ด้วย admin account จริงๆ
2. ตรวจสอบ permission function:
```javascript
const { canPermanentlyDelete } = usePermissions()
console.log('Can permanently delete:', canPermanentlyDelete())
```

3. ตรวจสอบ RLS policies

---

## 📚 Reference

### SQL Schema

```sql
-- profiles table structure
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff', 'customer')),
  staff_number TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id)
);

-- Index for performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at);
```

### Permission Constants

ดูที่ [src/lib/permissions.ts](src/lib/permissions.ts) สำหรับ:
- `PERMISSION_MATRIX` - Permission matrix เต็ม
- `ROUTE_PERMISSIONS` - Route access control
- `FEATURE_FLAGS` - Feature access flags

### Related Documentation

- 📖 [User Guide for Managers](USER_GUIDE_MANAGER_ROLE.md)
- 🔄 [Migration Guide](MANAGER_ROLE_MIGRATION_GUIDE.md)
- 📋 [Implementation Plan](MANAGER_ROLE_IMPLEMENTATION_PLAN.md)
- 🧪 [Test Files](src/__tests__/)

---

## ✅ Admin Checklist

### Daily Tasks
- [ ] Monitor system health
- [ ] Review recent logins
- [ ] Check for errors/issues
- [ ] Respond to support requests

### Weekly Tasks
- [ ] Review user activity logs
- [ ] Check for inactive users
- [ ] Monitor system performance
- [ ] Backup critical data

### Monthly Tasks
- [ ] Audit user permissions
- [ ] Review and update roles ถ้าจำเป็น
- [ ] Security review
- [ ] Update documentation ถ้ามีการเปลี่ยนแปลง

### Quarterly Tasks
- [ ] Comprehensive security audit
- [ ] Review permission matrix
- [ ] Training for new managers
- [ ] System optimization

---

**🔐 Remember**: With great power comes great responsibility!

ในฐานะ Admin คุณมีหน้าที่ดูแลความปลอดภัยและประสิทธิภาพของระบบ ใช้สิทธิ์อย่างรอบคอบและมีความรับผิดชอบ

---

**Last Updated**: 2025-01-18
**Version**: 1.0
**For**: Admin Users Only
