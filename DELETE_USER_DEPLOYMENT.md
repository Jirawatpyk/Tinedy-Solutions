# Delete User Properly - Deployment Guide

## ปัญหา

เมื่อลบ Staff ออกจากระบบ:
- ❌ ลบแค่ `profiles` table
- ❌ ยังมีข้อมูลใน `auth.users` (Supabase Authentication)
- ❌ User ยัง login ได้
- ❌ สร้าง email เดิมใหม่ไม่ได้

## วิธีแก้

ใช้ **Supabase Edge Function** เรียก `auth.admin.deleteUser()` เพื่อลบทั้ง:
1. `auth.users` (Authentication)
2. `profiles` (cascade delete จาก foreign key)

---

## ขั้นตอนการ Deploy

### Step 1: Deploy Edge Function

```bash
cd "C:\Users\Jiraw\OneDrive\Desktop\CRM tinedy\tinedy-crm"
supabase functions deploy delete-user
```

### Step 2: Test Edge Function

```bash
curl -X POST https://homtefwwsrrwfzmxdnrk.supabase.co/functions/v1/delete-user \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id-here"}'
```

### Step 3: Verify Foreign Key Constraint

ตรวจสอบว่า `profiles` table มี foreign key constraint ที่ cascade delete:

```sql
-- Check existing constraint
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'profiles'
  AND tc.constraint_type = 'FOREIGN KEY';
```

ถ้ายังไม่มี `ON DELETE CASCADE` ให้รัน:

```sql
-- Drop old constraint (if exists)
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Add new constraint with CASCADE
ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;
```

---

## การใช้งาน

### ใน Code (Staff Page)

```typescript
const deleteStaff = async (staffId: string) => {
  try {
    // Call Edge Function to delete user
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { userId: staffId },
    })

    if (error) throw error
    if (!data?.success) throw new Error(data?.error || 'Failed to delete user')

    toast({
      title: 'Success',
      description: 'Staff member deleted successfully',
    })
    fetchStaff()
  } catch (error) {
    console.error('Delete staff error:', error)
    toast({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to delete staff member',
      variant: 'destructive',
    })
  }
}
```

---

## ทดสอบ

1. **สร้าง Staff ใหม่:**
   - Email: test@example.com
   - Password: Test1234

2. **ลบ Staff:**
   - กดปุ่ม Delete
   - Confirm ใน dialog

3. **ตรวจสอบ:**
   - ✅ ไม่มีใน `profiles` table
   - ✅ ไม่มีใน `auth.users`
   - ✅ Login ด้วย email เดิมไม่ได้
   - ✅ สร้าง email เดิมใหม่ได้

4. **สร้างใหม่ด้วย email เดิม:**
   - Email: test@example.com (เดิม)
   - Password: NewPass1234
   - ✅ สร้างสำเร็จ

---

## Troubleshooting

### Error: "Failed to delete user"

**สาเหตุ:**
- Service Role Key ไม่ถูกต้อง
- User ID ไม่ถูกต้อง

**แก้ไข:**
```bash
# Check Edge Function logs
supabase functions logs delete-user

# Verify Service Role Key in Supabase Dashboard
# Settings > API > service_role key
```

### Error: "Foreign key violation"

**สาเหตุ:**
- มี booking หรือข้อมูลอื่นที่ reference ถึง staff

**แก้ไข:**
```sql
-- Set staff_id to NULL in bookings before delete
UPDATE bookings
SET staff_id = NULL
WHERE staff_id = 'user-id-to-delete';

-- Then delete user
```

หรือเพิ่ม cascade constraint:

```sql
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_staff_id_fkey;

ALTER TABLE bookings
ADD CONSTRAINT bookings_staff_id_fkey
FOREIGN KEY (staff_id)
REFERENCES profiles(id)
ON DELETE SET NULL;
```

---

## สรุป

### Before (ผิด):
```typescript
// ❌ ลบแค่ profiles - ยังมีใน auth.users
await supabase.from('profiles').delete().eq('id', staffId)
```

### After (ถูกต้อง):
```typescript
// ✅ ลบทั้ง auth.users และ profiles (cascade)
await supabase.functions.invoke('delete-user', {
  body: { userId: staffId }
})
```

### ผลลัพธ์:
- ✅ ลบทั้ง `auth.users` และ `profiles`
- ✅ ไม่สามารถ login ได้อีกต่อไป
- ✅ สร้าง email เดิมใหม่ได้
- ✅ ข้อมูลถูกลบสมบูรณ์
