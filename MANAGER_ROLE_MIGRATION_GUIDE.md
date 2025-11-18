# 🔄 Manager Role Migration Guide

## 📋 ภาพรวม

คู่มือนี้จะแนะนำคุณผ่านกระบวนการเพิ่ม Manager role เข้าสู่ระบบ Tinedy CRM ที่มีอยู่แล้ว การ migrate นี้จะเพิ่มระดับการจัดการใหม่ระหว่าง Admin และ Staff พร้อมระบบ permission-based access control

**⚠️ สำคัญ**: โปรดอ่านคู่มือทั้งหมดก่อนเริ่ม migration และทำการ backup ข้อมูลก่อนเสมอ

---

## 🎯 สิ่งที่จะได้รับ

หลังจาก migrate เสร็จสิ้น ระบบจะมี:

- ✅ **Manager Role**: ระดับการจัดการใหม่ที่มีสิทธิ์มากกว่า Staff แต่น้อยกว่า Admin
- ✅ **Permission System**: ระบบตรวจสอบสิทธิ์แบบ granular สำหรับทุก role
- ✅ **Soft Delete**: Manager สามารถ archive/restore ข้อมูลแทนการลบถาวร
- ✅ **Route Protection**: การป้องกันเส้นทางตาม role
- ✅ **Test Coverage**: 157 tests ใหม่สำหรับ permission system

---

## ⚙️ ข้อกำหนดเบื้องต้น

### ซอฟต์แวร์ที่ต้องมี
- Node.js v18+
- npm v9+
- Supabase CLI (ถ้าจะทำ database migrations)
- Git (สำหรับ version control)

### สิทธิ์การเข้าถึง
- Admin access ใน Supabase project
- Database admin privileges
- Access to production environment (ถ้า deploy ไป production)

---

## 📦 Pre-Migration Checklist

ก่อนเริ่ม migration ให้ทำตามขั้นตอนเหล่านี้:

### 1. ✅ Backup ข้อมูล

**Database Backup (Supabase)**
```bash
# ใช้ Supabase dashboard หรือ CLI
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# หรือผ่าน pg_dump โดยตรง
pg_dump -h [your-project].supabase.co -U postgres -d postgres > backup.sql
```

**Code Backup**
```bash
# สร้าง branch ใหม่สำหรับ migration
git checkout -b feature/manager-role-migration
git push -u origin feature/manager-role-migration

# หรือ tag commit ปัจจุบัน
git tag pre-manager-role-migration
git push origin pre-manager-role-migration
```

### 2. ✅ ตรวจสอบสภาพแวดล้อม

```bash
# ตรวจสอบ Node.js version
node --version  # ควรเป็น v18 ขึ้นไป

# ตรวจสอบ npm version
npm --version   # ควรเป็น v9 ขึ้นไป

# ตรวจสอบ dependencies ล่าสุด
npm install

# รัน tests ทั้งหมดเพื่อให้แน่ใจว่าทุกอย่างทำงาน
npm run test:run
```

### 3. ✅ แจ้งเตือนทีมและผู้ใช้

- แจ้งทีมพัฒนาเกี่ยวกับการ migrate
- แจ้ง downtime (ถ้ามี) ให้ผู้ใช้งานทราบ
- เตรียม rollback plan

---

## 🚀 Migration Steps

### Step 1: อัพเดทโค้ดจาก Repository

```bash
# Pull latest code with Manager role implementation
git fetch origin
git checkout feature/manager-role-migration

# Install dependencies
npm install

# Verify build works
npm run build
```

### Step 2: Database Migration (ถ้ามี)

**ตอนนี้ Manager role ใช้ enum ที่มีอยู่แล้วใน database** ไม่ต้อง migrate database

แต่ถ้าคุณต้องการเพิ่ม soft delete columns หรือ RLS policies:

```sql
-- เพิ่ม deleted_at column ให้กับ tables ที่ต้องการ soft delete
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- เพิ่ม deleted_by column สำหรับ audit trail
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- สร้าง index สำหรับ performance
CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON bookings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_teams_deleted_at ON teams(deleted_at);
```

### Step 3: สร้าง Manager Users

มี 2 วิธีในการสร้าง Manager users:

**วิธีที่ 1: ผ่าน Supabase SQL Editor**
```sql
-- อัพเดท existing user เป็น manager
UPDATE profiles
SET role = 'manager'
WHERE id = 'user-uuid-here';

-- หรือสร้าง user ใหม่ (ต้องสร้าง auth user ก่อน)
INSERT INTO profiles (id, full_name, role, email)
VALUES (
  'new-user-uuid',
  'Manager Name',
  'manager',
  'manager@example.com'
);
```

**วิธีที่ 2: ผ่าน Admin UI** (แนะนำ)
1. Login ด้วย Admin account
2. ไปที่ Staff Management page
3. สร้าง user ใหม่หรือแก้ไข existing user
4. เลือก role เป็น "Manager"

### Step 4: รัน Tests

```bash
# รัน permission tests
npm run test:run -- src/hooks/__tests__/use-permissions.test.ts
npm run test:run -- src/lib/__tests__/permissions.test.ts
npm run test:run -- src/__tests__/manager-role-integration.test.tsx

# รัน all tests
npm run test:run

# ตรวจสอบว่า build สำเร็จ
npm run build
```

### Step 5: Deploy

**Development Environment**
```bash
# Start dev server
npm run dev

# ทดสอบการ login ด้วย Manager account
# ตรวจสอบว่า permissions ทำงานถูกต้อง
```

**Production Environment**
```bash
# Build for production
npm run build

# Deploy ตามวิธีการ deploy ปกติของโปรเจค
# (Vercel, Netlify, etc.)

# ตรวจสอบ production หลัง deploy
```

---

## ✅ Post-Migration Verification

หลังจาก migrate เสร็จ ให้ทดสอบสิ่งต่อไปนี้:

### 1. Manager Login & Navigation
- [ ] Manager สามารถ login ได้
- [ ] Redirect ไปที่ `/manager` หลัง login
- [ ] Sidebar แสดง menu items ที่ถูกต้องสำหรับ Manager
- [ ] Manager เข้าถึง `/manager/*` routes ได้
- [ ] Manager ถูกบล็อกจาก `/admin/*` routes

### 2. Permission Checks
- [ ] Manager สามารถ create bookings ได้
- [ ] Manager สามารถ update bookings ได้
- [ ] Manager **ไม่สามารถ** hard delete bookings
- [ ] Manager สามารถ archive (soft delete) bookings ได้
- [ ] Manager สามารถ restore archived bookings ได้
- [ ] Manager สามารถ view reports ได้
- [ ] Manager สามารถ export data ได้

### 3. CRUD Operations
**Bookings**
- [ ] Create ✅
- [ ] Read ✅
- [ ] Update ✅
- [ ] Delete ❌ (Hard)
- [ ] Archive ✅ (Soft)

**Customers**
- [ ] Create ✅
- [ ] Read ✅
- [ ] Update ✅
- [ ] Delete ❌

**Staff**
- [ ] Create ❌
- [ ] Read ✅
- [ ] Update ✅ (Assignments)
- [ ] Delete ❌

**Teams**
- [ ] Create ✅
- [ ] Read ✅
- [ ] Update ✅
- [ ] Delete ❌

**Service Packages**
- [ ] Create ❌
- [ ] Read ✅
- [ ] Update ❌
- [ ] Delete ❌

### 4. UI Checks
- [ ] Delete buttons ซ่อนสำหรับ Manager
- [ ] Archive buttons แสดงสำหรับ Manager
- [ ] Settings menu item ซ่อนสำหรับ Manager
- [ ] Role badge แสดงถูกต้องในหน้า Profile

### 5. Admin Access
- [ ] Admin ยังเข้าถึงทุก features ได้
- [ ] Admin สามารถ hard delete ได้
- [ ] Admin สามารถเข้า Settings ได้
- [ ] Admin สามารถสร้าง Manager users ได้

### 6. Staff Access
- [ ] Staff ไม่ได้รับผลกระทบจาก migration
- [ ] Staff ยังเข้าถึงเฉพาะ own data ได้
- [ ] Staff ถูกบล็อกจาก Manager routes

---

## 🔙 Rollback Procedures

ถ้าพบปัญหาร้ายแรงระหว่างหรือหลัง migration:

### 1. Code Rollback

```bash
# กลับไปยัง commit ก่อน migration
git checkout pre-manager-role-migration

# หรือ revert specific commits
git revert [commit-hash]

# Push rollback
git push origin main --force  # ⚠️ ระวัง! ใช้เฉพาะกรณีฉุกเฉิน
```

### 2. Database Rollback (ถ้าทำ migration)

```sql
-- Restore จาก backup
psql -h [your-project].supabase.co -U postgres -d postgres < backup.sql

-- หรือ revert columns
ALTER TABLE bookings DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE bookings DROP COLUMN IF EXISTS deleted_by;
-- ทำซ้ำสำหรับ tables อื่นๆ
```

### 3. User Role Rollback

```sql
-- เปลี่ยน Manager users กลับเป็น Staff หรือ Admin
UPDATE profiles
SET role = 'staff'  -- หรือ 'admin'
WHERE role = 'manager';
```

### 4. Redeploy

```bash
# Build และ deploy version เก่า
npm run build
# Deploy ตามปกติ
```

---

## 🐛 Troubleshooting

### ปัญหาที่พบบ่อย

#### 1. Manager ไม่สามารถ login ได้
**สาเหตุ**: Profile record ไม่มี role='manager'

**วิธีแก้**:
```sql
-- ตรวจสอบ role ใน database
SELECT id, email, role FROM profiles WHERE email = 'manager@example.com';

-- อัพเดท role
UPDATE profiles SET role = 'manager' WHERE id = 'user-uuid';
```

#### 2. Manager redirect ไปที่ unauthorized page
**สาเหตุ**: Routes ไม่ถูก protect ถูกต้อง

**วิธีแก้**:
- ตรวจสอบ `ROUTE_PERMISSIONS` ใน [src/lib/permissions.ts](src/lib/permissions.ts)
- ตรวจสอบ `ProtectedRoute` component ใน routes

#### 3. Manager เห็น features ที่ไม่ควรเห็น
**สาเหตุ**: Permission checks ไม่ถูกใช้ในส่วนของ UI

**วิธีแก้**:
```tsx
// ใช้ usePermissions hook
const { can, canDelete, isManagerOrAdmin } = usePermissions()

// Wrap conditional rendering
{can('delete', 'bookings') && <DeleteButton />}
{canDelete('bookings') ? <DeleteButton /> : <ArchiveButton />}
```

#### 4. Tests fail หลัง migration
**สาเหตุ**: Mock data ไม่ตรงกับ types ใหม่

**วิธีแก้**:
```bash
# อัพเดท test factories
# ตรวจสอบ src/test/factories.ts
# เพิ่ม deleted_at: null ใน mock data

# รัน tests อีกครั้ง
npm run test:run
```

#### 5. Soft delete ไม่ทำงาน
**สาเหตุ**: Database columns ยังไม่ถูกเพิ่ม

**วิธีแก้**:
```sql
-- เพิ่ม columns
ALTER TABLE bookings ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN deleted_by UUID REFERENCES profiles(id);
```

---

## 📊 Performance Considerations

### Permission Checks
- Permission checks ถูก memoize ด้วย `useMemo` ใน `PermissionProvider`
- ไม่กระทบ performance เพราะคำนวณครั้งเดียวต่อ role change

### Database Queries
- Soft delete queries ใช้ `WHERE deleted_at IS NULL`
- ควรมี index บน `deleted_at` column:
```sql
CREATE INDEX idx_bookings_deleted_at ON bookings(deleted_at);
```

### Route Protection
- Route checks ทำงานแบบ synchronous จาก `ROUTE_PERMISSIONS` constant
- ไม่มี additional API calls

---

## 🔒 Security Considerations

### 1. RLS Policies (Row Level Security)
**สำคัญ**: ตรวจสอบว่า RLS policies ใน Supabase ตรงกับ permission matrix

```sql
-- ตัวอย่าง RLS policy สำหรับ Manager
CREATE POLICY "Managers can view all bookings"
ON bookings FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('admin', 'manager')
);

CREATE POLICY "Managers cannot hard delete bookings"
ON bookings FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'  -- เฉพาะ admin
);
```

### 2. API Endpoints
- ตรวจสอบว่า backend/API endpoints ตรวจสอบ permissions
- ไม่พึ่งพา frontend permission checks อย่างเดียว

### 3. Manager Role Escalation
- Manager **ไม่สามารถ** เปลี่ยน role ของตัวเองเป็น Admin
- เฉพาะ Admin เท่านั้นที่สามารถ assign/change roles

---

## 📞 Support & Help

### ติดปัญหา?
1. ตรวจสอบ [Troubleshooting](#-troubleshooting) section
2. ดู [User Guide](USER_GUIDE_MANAGER_ROLE.md) สำหรับการใช้งาน
3. ดู [Admin Guide](ADMIN_GUIDE_USER_MANAGEMENT.md) สำหรับการจัดการ users

### Resources
- [Permission Matrix](USER_GUIDE_MANAGER_ROLE.md#-permission-matrix)
- [Test Coverage Report](src/__tests__/)
- [Implementation Plan](MANAGER_ROLE_IMPLEMENTATION_PLAN.md)

---

## ✅ Migration Completion Checklist

เมื่อ migration เสร็จสมบูรณ์:

- [ ] Code deployed successfully
- [ ] All tests passing
- [ ] Manager users created and tested
- [ ] Post-migration verification completed
- [ ] Documentation updated
- [ ] Team notified of changes
- [ ] Rollback plan documented and tested
- [ ] Performance metrics verified
- [ ] Security checks completed
- [ ] User training completed (ถ้าจำเป็น)

---

**🎉 ยินดีด้วย!** ระบบของคุณมี Manager role แล้ว!

สำหรับข้อมูลเพิ่มเติมเกี่ยวกับการใช้งาน กรุณาดู:
- [User Guide สำหรับ Manager](USER_GUIDE_MANAGER_ROLE.md)
- [Admin Guide สำหรับการจัดการ Users](ADMIN_GUIDE_USER_MANAGEMENT.md)

---

**Last Updated**: 2025-01-18
**Version**: 1.0
**Status**: ✅ Production Ready
