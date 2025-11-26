-- Fix Profiles UPDATE RLS - Complete Cleanup
-- Date: 2025-11-26
-- ปัญหา: Policies เก่าที่มี subquery return หลายแถวยังคงอยู่
-- Error: "more than one row returned by a subquery used as an expression"
--
-- สาเหตุ: RLS policies เก่า (เช่น "Managers can update staff assignments")
-- ใช้ subquery: WHERE id = profiles.id ซึ่ง return ทุก row

-- ===================================================================
-- Step 1: DROP ALL ทุก policies เก่าที่เกี่ยวกับ profiles
-- ===================================================================

-- Policies จาก 20250116_manager_rls_policies.sql
DROP POLICY IF EXISTS "Admins and Managers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can create profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can update staff assignments" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Policies จาก 20250117_fix_profiles_rls_policies.sql
DROP POLICY IF EXISTS "Managers can update staff info" ON profiles;

-- Policies จาก 20250125_fix_manager_update_staff.sql
DROP POLICY IF EXISTS "Managers can update staff information" ON profiles;

-- Policies จาก migrations อื่นๆ
DROP POLICY IF EXISTS "Allow users to view own profile and admins view all" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile and admins update all" ON profiles;
DROP POLICY IF EXISTS "Only service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin and manager can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin and manager can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles for chat" ON profiles;
DROP POLICY IF EXISTS "Staff can view other staff profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile reads for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Managers can update staff profiles" ON profiles;
DROP POLICY IF EXISTS "Staff can read all staff and team profiles" ON profiles;
DROP POLICY IF EXISTS "Public can read for payment page" ON profiles;

-- Policies ปัจจุบัน (จะสร้างใหม่)
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_service_role" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- ===================================================================
-- Step 2: สร้าง/อัปเดต helper function
-- ใช้ SECURITY DEFINER เพื่อหลีกเลี่ยง recursive RLS check
-- หมายเหตุ: ใช้ public schema แทน auth เพราะ Supabase ไม่อนุญาต
-- ===================================================================

-- Drop old function if exists (ทั้ง auth และ public schema)
DROP FUNCTION IF EXISTS public.get_my_role();
DROP FUNCTION IF EXISTS public.get_my_role();

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;

-- ===================================================================
-- Step 3: Enable RLS
-- ===================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- Step 4: สร้าง policies ใหม่ที่ปลอดภัย
-- ===================================================================

-- SELECT Policy: ดูโปรไฟล์ตัวเอง หรือ admin/manager ดูได้ทั้งหมด
CREATE POLICY "profiles_select_policy"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR
    public.get_my_role() IN ('admin', 'manager')
  );

-- UPDATE Policy: Admin เปลี่ยน role ได้, Manager แก้ไข Staff ได้ (ไม่เปลี่ยน role)
-- หมายเหตุ: ใน WITH CHECK, "role" คือค่าใหม่ที่จะ insert, "profiles.role" คือค่าเดิม (OLD)
CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- ใครที่สามารถ "เห็น" row นี้เพื่อจะ update
    auth.uid() = id
    OR
    public.get_my_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    -- Admin สามารถอัปเดตและเปลี่ยน role ได้ทุกคน
    public.get_my_role() = 'admin'
    OR
    -- ผู้ใช้ทั่วไปอัปเดตตัวเอง (ไม่เปลี่ยน role)
    -- role (NEW) ต้องเท่ากับ role เดิมของตัวเอง
    (
      auth.uid() = id
      AND role = public.get_my_role()
    )
    OR
    -- Manager สามารถอัปเดต Staff ได้ (ไม่เปลี่ยน role)
    -- ตรวจสอบ: target เป็น staff และ role ไม่เปลี่ยน (role NEW = role OLD ซึ่งก็คือ 'staff')
    (
      public.get_my_role() = 'manager'
      AND auth.uid() != id  -- ไม่ใช่ตัวเอง (case ตัวเองอยู่ข้างบนแล้ว)
      AND role = 'staff'    -- role ใหม่ต้องเป็น staff (ไม่เปลี่ยน role)
    )
  );

-- INSERT Policy: สร้างโปรไฟล์ตัวเอง (ตอน signup)
CREATE POLICY "profiles_insert_policy"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- INSERT Policy for service_role (Edge Functions)
CREATE POLICY "profiles_insert_service_role"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- DELETE Policy: เฉพาะ Admin ลบได้
CREATE POLICY "profiles_delete_policy"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- ===================================================================
-- Step 5: Grant permissions
-- ===================================================================
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- ===================================================================
-- Step 6: Verification
-- ===================================================================
DO $$
DECLARE
  policy_count integer;
  function_exists boolean;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles';

  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_my_role'
  ) INTO function_exists;

  -- Output results
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '✅ PROFILES RLS FIX COMPLETED (2025-11-26)';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Policy Count: % (Expected: 5)', policy_count;
  RAISE NOTICE 'Helper Function: %', CASE WHEN function_exists THEN '✅ EXISTS' ELSE '🔴 MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Policies Created:';
  RAISE NOTICE '  1. profiles_select_policy (SELECT)';
  RAISE NOTICE '  2. profiles_update_policy (UPDATE) - Admin can change role';
  RAISE NOTICE '  3. profiles_insert_policy (INSERT)';
  RAISE NOTICE '  4. profiles_insert_service_role (INSERT)';
  RAISE NOTICE '  5. profiles_delete_policy (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE 'Key Fix: Admin can now change roles, subqueries use LIMIT 1';
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
END $$;
