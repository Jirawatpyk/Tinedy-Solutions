# 🔒 Row Level Security (RLS) Setup Guide

## ⚠️ ปัญหาที่พบ

ตาราง database ทั้งหมดมี label **"Unrestricted"** ซึ่งหมายความว่า:
- ❌ **Row Level Security (RLS) ยังไม่ได้เปิดใช้งาน**
- ❌ **ทุกคนสามารถเข้าถึงข้อมูลทั้งหมดได้**
- ❌ **Permission system ทำงานเฉพาะ frontend** (ไม่ปลอดภัย)

## 🚨 ความเสี่ยงด้านความปลอดภัย

### ก่อนเปิด RLS:
```
User with Staff role → Can bypass frontend permissions → Access all data directly via Supabase API
Manager → Can see Admin data
Anyone with anon key → Can read/write all tables
```

### หลังเปิด RLS:
```
User with Staff role → Blocked by database → Can only access own data
Manager → Can only perform allowed operations
Database enforces permissions → Secure even if frontend is bypassed
```

---

## ✅ วิธีแก้ไข

### ขั้นตอนที่ 1: สำรองข้อมูล

```bash
# ผ่าน Supabase Dashboard
# Settings → Database → Backups → Create backup
```

หรือ

```bash
# ผ่าน pg_dump
pg_dump -h [your-project].supabase.co -U postgres -d postgres > backup_before_rls.sql
```

### ขั้นตอนที่ 2: รัน RLS Migration

มี 2 วิธี:

#### วิธีที่ 1: ผ่าน Supabase SQL Editor (แนะนำ)

1. เปิด Supabase Dashboard
2. ไปที่ **SQL Editor**
3. สร้าง New query
4. คัดลอกเนื้อหาจากไฟล์ `supabase/migrations/enable_rls_policies.sql`
5. Paste ลงใน SQL Editor
6. กด **Run** หรือ `Ctrl+Enter`
7. ตรวจสอบ output ว่ามี "RLS enabled on table" สำหรับทุกตาราง

#### วิธีที่ 2: ผ่าน Supabase CLI

```bash
# ถ้ายังไม่ได้ติดตั้ง Supabase CLI
npm install -g supabase

# Link project
supabase link --project-ref [your-project-ref]

# Run migration
supabase db push

# หรือรันไฟล์โดยตรง
supabase db execute -f supabase/migrations/enable_rls_policies.sql
```

### ขั้นตอนที่ 3: ตรวจสอบว่า RLS ทำงาน

```sql
-- ใน Supabase SQL Editor
SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM pg_tables
LEFT JOIN pg_class ON pg_tables.tablename = pg_class.relname
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'customers', 'bookings', 'service_packages',
    'teams', 'team_members', 'messages', 'notifications', 'reviews'
  )
ORDER BY tablename;
```

ผลลัพธ์ที่ต้องการ:
```
tablename          | rls_status
-------------------+---------------
bookings          | ✅ RLS Enabled
customers         | ✅ RLS Enabled
messages          | ✅ RLS Enabled
notifications     | ✅ RLS Enabled
profiles          | ✅ RLS Enabled
reviews           | ✅ RLS Enabled
service_packages  | ✅ RLS Enabled
team_members      | ✅ RLS Enabled
teams             | ✅ RLS Enabled
```

### ขั้นตอนที่ 4: ทดสอบ Permissions

#### ทดสอบ Manager Permissions:

```sql
-- 1. สร้าง test Manager user (ถ้ายังไม่มี)
INSERT INTO profiles (id, full_name, email, role)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Test Manager',
  'manager@test.com',
  'manager'
);

-- 2. ทดสอบว่า Manager เห็น bookings ทั้งหมดได้
-- (ต้อง login ด้วย Manager account ก่อน)
SELECT * FROM bookings;  -- ✅ Should work

-- 3. ทดสอบว่า Manager ลบไม่ได้
DELETE FROM bookings WHERE id = 'some-id';  -- ❌ Should fail
```

#### ทดสอบ Staff Permissions:

```sql
-- 1. Staff ควรเห็นเฉพาะ bookings ที่ assigned ให้
-- (login ด้วย Staff account)
SELECT * FROM bookings;  -- ✅ เห็นเฉพาะของตัวเอง

-- 2. Staff ไม่ควรเห็น service packages
SELECT * FROM service_packages;  -- ❌ ตาม policy ที่ตั้งไว้
```

---

## 📋 RLS Policies ที่สร้างขึ้น

### Profiles Table

| Role    | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| Admin   | ✅ All | ✅ All | ✅ All | ✅ All |
| Manager | ✅ All | ❌     | ❌     | ❌     |
| Staff   | ✅ Own | ❌     | ❌     | ❌     |

### Customers Table

| Role    | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| Admin   | ✅ All | ✅ All | ✅ All | ✅ All |
| Manager | ✅ All | ✅ All | ✅ All | ❌     |
| Staff   | ❌     | ❌     | ❌     | ❌     |

### Bookings Table

| Role    | SELECT      | INSERT | UPDATE | DELETE |
|---------|-------------|--------|--------|--------|
| Admin   | ✅ All      | ✅ All | ✅ All | ✅ All |
| Manager | ✅ All      | ✅ All | ✅ All | ❌     |
| Staff   | ✅ Assigned | ❌     | ❌     | ❌     |

### Service Packages Table

| Role    | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| Admin   | ✅ All | ✅ All | ✅ All | ✅ All |
| Manager | ✅ All | ❌     | ❌     | ❌     |
| Staff   | ✅ All | ❌     | ❌     | ❌     |

### Teams Table

| Role    | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| Admin   | ✅ All | ✅ All | ✅ All | ✅ All |
| Manager | ✅ All | ✅ All | ✅ All | ❌     |
| Staff   | ❌     | ❌     | ❌     | ❌     |

---

## 🔧 Helper Functions ที่สร้างขึ้น

### `get_user_role()`
ดึง role ของ user ที่ login อยู่

```sql
SELECT get_user_role();  -- Returns: 'admin', 'manager', or 'staff'
```

### `is_admin()`
ตรวจสอบว่า user เป็น admin หรือไม่

```sql
SELECT is_admin();  -- Returns: true or false
```

### `is_manager_or_admin()`
ตรวจสอบว่า user เป็น manager หรือ admin

```sql
SELECT is_manager_or_admin();  -- Returns: true or false
```

---

## 🐛 Troubleshooting

### ปัญหา: "permission denied for table ..."

**สาเหตุ**: Policy ไม่ตรงกับ action ที่ทำ

**วิธีแก้**:
```sql
-- ตรวจสอบ policies ของตาราง
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'table_name_here';
```

### ปัญหา: "infinite recursion detected in policy"

**สาเหตุ**: Policy เรียก function ที่เรียก policy กลับ (recursive)

**วิธีแก้**: ใช้ `SECURITY DEFINER` ใน helper functions (มีอยู่แล้วใน migration)

### ปัญหา: Manager ไม่สามารถเห็นข้อมูลได้

**วิธีตรวจสอบ**:
```sql
-- 1. ตรวจสอบ role ของ user
SELECT role FROM profiles WHERE id = auth.uid();

-- 2. ตรวจสอบว่า helper function ทำงานถูกต้อง
SELECT get_user_role();

-- 3. ตรวจสอบว่า policy มีอยู่
SELECT * FROM pg_policies WHERE tablename = 'bookings';
```

---

## 📝 ขั้นตอนหลังเปิด RLS

### 1. ทดสอบทุก User Flows

- [ ] Admin login และทดสอบ CRUD ทุก tables
- [ ] Manager login และทดสอบตาม permission matrix
- [ ] Staff login และตรวจสอบว่าเห็นเฉพาะของตัวเอง
- [ ] ทดสอบ soft delete (Manager ควรทำได้)
- [ ] ทดสอบ hard delete (เฉพาะ Admin)

### 2. ตรวจสอบ Performance

```sql
-- ตรวจสอบ query performance
EXPLAIN ANALYZE
SELECT * FROM bookings;
```

ถ้า query ช้า ให้เพิ่ม index:

```sql
-- Index สำหรับ soft delete
CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at
ON bookings(deleted_at) WHERE deleted_at IS NOT NULL;

-- Index สำหรับ assigned staff
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_staff
ON bookings(assigned_staff_id);
```

### 3. อัพเดท Documentation

เพิ่มข้อมูลการเปิด RLS ใน:
- [ ] DEPLOYMENT.md
- [ ] README.md
- [ ] MANAGER_ROLE_MIGRATION_GUIDE.md

---

## ✅ Checklist

เมื่อทำเสร็จทุกขั้นตอน:

- [ ] สำรองข้อมูล (backup) เสร็จแล้ว
- [ ] รัน RLS migration เสร็จแล้ว
- [ ] ตรวจสอบว่าทุกตารางมี RLS enabled
- [ ] ทดสอบ Admin permissions
- [ ] ทดสอบ Manager permissions
- [ ] ทดสอบ Staff permissions
- [ ] ทดสอบ soft delete / hard delete
- [ ] ตรวจสอบ query performance
- [ ] อัพเดท documentation

---

## 🎯 Summary

**ก่อนเปิด RLS:**
```
❌ Unrestricted - ใครก็เข้าถึงข้อมูลได้
❌ Frontend-only permissions - ไม่ปลอดภัย
❌ ข้อมูลเสี่ยงรั่วไหล
```

**หลังเปิด RLS:**
```
✅ Database-level security
✅ Role-based access control
✅ ปลอดภัยแม้ถูก bypass frontend
✅ ตรงตาม permission matrix
✅ Production-ready
```

---

**Last Updated**: 2025-01-18
**Status**: �� Critical - ต้องรันทันทีก่อน production
**Migration File**: `supabase/migrations/enable_rls_policies.sql`
