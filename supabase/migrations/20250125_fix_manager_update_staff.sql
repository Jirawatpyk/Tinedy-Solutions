-- Fix Manager UPDATE staff RLS policy
-- Date: 2025-01-25
-- Description: แก้ไข RLS policy ให้ Manager สามารถแก้ไขข้อมูล Staff ได้ (ยกเว้น role)

-- ===================================================================
-- ลบ policy เก่าที่มีปัญหา
-- ===================================================================

DROP POLICY IF EXISTS "Managers can update staff assignments" ON profiles;
DROP POLICY IF EXISTS "Managers can update staff info" ON profiles;

-- ===================================================================
-- สร้าง policy ใหม่ที่ชัดเจนและทำงานได้ถูกต้อง
-- ===================================================================

-- Policy: Manager can update staff information (except role)
-- USING clause: ตรวจสอบว่า user ที่ login เป็น manager และสามารถแก้ไขได้เฉพาะ:
--   1. ตัวเอง (own profile)
--   2. Staff role เท่านั้น (ไม่ใช่ Manager หรือ Admin คนอื่น)
-- WITH CHECK clause: ตรวจสอบว่า role ไม่ถูกเปลี่ยนแปลง
CREATE POLICY "Managers can update staff information"
ON profiles FOR UPDATE
TO authenticated
USING (
  -- User ที่ login ต้องเป็น manager
  EXISTS (
    SELECT 1 FROM profiles AS current_user
    WHERE current_user.id = auth.uid()
    AND current_user.role = 'manager'
  )
  AND (
    -- เงื่อนไข 1: แก้ไขตัวเองได้ (own profile)
    profiles.id = auth.uid()
    OR
    -- เงื่อนไข 2: แก้ไขได้เฉพาะ Staff role (ไม่ใช่ Manager/Admin คนอื่น)
    profiles.role = 'staff'
  )
)
WITH CHECK (
  -- ห้ามเปลี่ยน role (ต้องเท่ากับ role เดิมของ record ที่กำลังจะ update)
  role = (
    SELECT p.role
    FROM profiles AS p
    WHERE p.id = profiles.id
  )
);

-- ===================================================================
-- Comments for documentation
-- ===================================================================

COMMENT ON POLICY "Managers can update staff information" ON profiles IS
  'Allows managers to update: (1) their own profile, (2) staff role users only. Cannot update other managers or admins. Role field must remain unchanged from original value.';
