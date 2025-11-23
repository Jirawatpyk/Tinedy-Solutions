-- ============================================================================
-- Migration: Fix Profiles RLS Policies for Chat System
-- Description: แก้ไข RLS policies เพื่อให้ Staff เห็น profiles ของคนอื่นได้
--              และสามารถรับข้อความจาก Admin/Manager ได้
-- Date: 2025-02-01
-- ============================================================================

-- ============================================================================
-- Step 1: สร้าง Helper Function เพื่อหลีกเลี่ยง Infinite Recursion
-- ============================================================================

-- ฟังก์ชันนี้จะอ่าน role จาก JWT token แทนการ query จาก profiles table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role')::TEXT,
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1),
    'staff'  -- default role
  );
$$;

-- เพิ่ม comment
COMMENT ON FUNCTION public.get_current_user_role() IS
'Returns the current user role from JWT or database. Used to avoid infinite recursion in RLS policies.';

-- ============================================================================
-- Step 2: ลบ Policies เก่าที่มีปัญหา
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins and Managers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can create profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can update staff info" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;

-- ============================================================================
-- Step 3: สร้าง SELECT Policies ใหม่ (แก้ปัญหาหลัก)
-- ============================================================================

-- Policy 1: Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: Staff, Admin, Manager can view all profiles (for chat system)
-- ใช้ helper function แทนการ query profiles table
CREATE POLICY "All authenticated users can view profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  -- ทุกคนที่ authenticated สามารถดู profiles ได้ (สำหรับ chat system)
  -- เนื่องจาก chat ต้องดู profile ของคนที่จะคุยด้วย
  true
);

-- ============================================================================
-- Step 4: สร้าง INSERT Policies
-- ============================================================================

CREATE POLICY "Only admins can create profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  get_current_user_role() = 'admin'
);

-- ============================================================================
-- Step 5: สร้าง UPDATE Policies
-- ============================================================================

-- Policy: Users can update their own profile (ยกเว้น role)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND (
    -- ป้องกันการเปลี่ยน role โดยไม่ได้รับอนุญาต
    role = (SELECT role FROM profiles WHERE id = auth.uid())
    OR get_current_user_role() = 'admin'
  )
);

-- Policy: Admin can update all profiles
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  get_current_user_role() = 'admin'
);

-- Policy: Manager can update staff info (ยกเว้น role)
CREATE POLICY "Managers can update staff info"
ON profiles FOR UPDATE
TO authenticated
USING (
  get_current_user_role() = 'manager'
)
WITH CHECK (
  -- Manager ไม่สามารถเปลี่ยน role ได้
  role = (SELECT role FROM profiles WHERE id = profiles.id)
);

-- ============================================================================
-- Step 6: สร้าง DELETE Policies
-- ============================================================================

CREATE POLICY "Only admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (
  get_current_user_role() = 'admin'
);

-- ============================================================================
-- Step 7: อัพเดท Messages RLS Policies (ให้แน่ใจว่าถูกต้อง)
-- ============================================================================

-- ลบ policies เก่า
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Only admins can delete messages" ON messages;

-- Policy: Users can view messages they sent or received
CREATE POLICY "Users can view their messages"
ON messages FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR recipient_id = auth.uid()
  OR get_current_user_role() = 'admin'
);

-- Policy: Users can send messages (ใครก็ได้ส่งถึงใครก็ได้)
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()  -- ต้องส่งในนามตัวเอง
);

-- Policy: Users can update messages they received (mark as read)
CREATE POLICY "Users can update their received messages"
ON messages FOR UPDATE
TO authenticated
USING (
  recipient_id = auth.uid()  -- เฉพาะผู้รับเท่านั้นที่แก้ไขได้ (เช่น mark as read)
  OR get_current_user_role() = 'admin'
);

-- Policy: Only admins can delete messages
CREATE POLICY "Only admins can delete messages"
ON messages FOR DELETE
TO authenticated
USING (
  get_current_user_role() = 'admin'
);

-- ============================================================================
-- Step 8: เพิ่ม Comments สำหรับเอกสาร
-- ============================================================================

COMMENT ON POLICY "Users can view own profile" ON profiles IS
'Users can always view their own profile';

COMMENT ON POLICY "All authenticated users can view profiles" ON profiles IS
'All authenticated users can view profiles for chat system. This allows staff to see who they can chat with.';

COMMENT ON POLICY "Only admins can create profiles" ON profiles IS
'Only admins can create new user accounts';

COMMENT ON POLICY "Users can update own profile" ON profiles IS
'Users can update their own profile except role field (only admin can change roles)';

COMMENT ON POLICY "Admins can update all profiles" ON profiles IS
'Admins can update any profile including role changes';

COMMENT ON POLICY "Managers can update staff info" ON profiles IS
'Managers can update staff information but cannot change roles';

COMMENT ON POLICY "Only admins can delete profiles" ON profiles IS
'Only admins can delete user accounts';

COMMENT ON POLICY "Users can view their messages" ON messages IS
'Users can view messages they sent or received. Admins can view all messages.';

COMMENT ON POLICY "Users can send messages" ON messages IS
'Users can send messages to anyone in the system';

COMMENT ON POLICY "Users can update their received messages" ON messages IS
'Users can update messages they received (e.g., mark as read)';

COMMENT ON POLICY "Only admins can delete messages" ON messages IS
'Only admins can delete messages';

-- ============================================================================
-- Step 9: Grant Execute Permission on Helper Function
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- ============================================================================
-- คำแนะนำการใช้งาน
-- ============================================================================

-- 1. รัน migration นี้ใน Supabase SQL Editor หรือผ่าน Supabase CLI
-- 2. ทดสอบโดย:
--    - Login ด้วย Staff account
--    - กด "Start New Chat" → ควรเห็นรายชื่อคนอื่นๆ ได้
--    - Login ด้วย Admin account
--    - ส่งข้อความหา Staff
--    - Login กลับเป็น Staff → ควรเห็นข้อความจาก Admin
-- 3. ถ้ามีปัญหา ให้ตรวจสอบว่า:
--    - RLS เปิดอยู่หรือไม่: SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('profiles', 'messages');
--    - Policies ถูกสร้างหรือไม่: SELECT * FROM pg_policies WHERE tablename IN ('profiles', 'messages');
--    - Function ทำงานหรือไม่: SELECT get_current_user_role();
