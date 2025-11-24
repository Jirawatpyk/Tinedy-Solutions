-- CRITICAL FIX: Fix Infinite Recursion in get_current_user_role() - Restore Login
-- Date: 2025-02-04
-- Issue: get_current_user_role() tries to query profiles table, but profiles RLS uses this function
--        This creates infinite recursion/deadlock → login fails
-- Solution: Fix function to ONLY read from JWT, never query profiles table

-- ===================================================================
-- Step 1: Fix get_current_user_role() - Remove profiles table query
-- ===================================================================

-- ⚠️ ปัญหาเดิม: Function นี้พยายาม query จาก profiles table
-- แต่ profiles table RLS ใช้ function นี้ → infinite recursion!

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  -- ✅ อ่านจาก JWT เท่านั้น (ไม่ query profiles)
  -- ถ้าไม่มี role ใน JWT ให้เป็น 'staff' (default)
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role')::TEXT,
    'staff'
  );
$$;

COMMENT ON FUNCTION public.get_current_user_role() IS
'Returns the current user role from JWT ONLY. Never queries profiles table to avoid infinite recursion in RLS policies.';

-- ===================================================================
-- Step 2: ลบ policies ที่อาจมีปัญหา (ถ้ามี)
-- ===================================================================

-- ลบ policies ที่อาจใช้ get_current_user_role() ในการ SELECT
DROP POLICY IF EXISTS "All authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- ===================================================================
-- Step 3: สร้าง SELECT policy ใหม่ที่ไม่ใช้ helper function
-- ===================================================================

-- Policy 1: Users can always view their own profile (ไม่ใช้ function)
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: ทุกคนที่ authenticated ดู profiles ได้ (สำหรับ chat)
-- ⚠️ ไม่ใช้ get_current_user_role() เพราะจะเกิด recursion
CREATE POLICY "All authenticated users can view profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- ===================================================================
-- Verification
-- ===================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ CRITICAL FIX APPLIED: Fixed infinite recursion in get_current_user_role()';
  RAISE NOTICE '✅ Function now only reads from JWT (no profiles table query)';
  RAISE NOTICE '✅ SELECT policies recreated without recursion risk';
  RAISE NOTICE '⚠️ LOGIN SHOULD WORK NOW - Test immediately!';
END $$;
