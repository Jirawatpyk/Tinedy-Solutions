-- Rollback: 20251126_fix_profiles_update_rls_complete.sql
-- Date: 2025-11-26
-- ใช้ไฟล์นี้เพื่อ rollback กลับไปใช้ policies จาก 20250206_fix_profiles_rls_no_recursion.sql
--
-- วิธีใช้: รันไฟล์นี้ใน Supabase SQL Editor ถ้าต้องการย้อนกลับ

-- ===================================================================
-- Step 1: DROP policies ที่สร้างใหม่
-- ===================================================================
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_service_role" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- ===================================================================
-- Step 2: Restore helper function (เหมือนเดิม แต่ไม่มี LIMIT 1)
-- ===================================================================
CREATE OR REPLACE FUNCTION auth.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION auth.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.get_my_role() TO service_role;

-- ===================================================================
-- Step 3: Restore original policies (from 20250206_fix_profiles_rls_no_recursion.sql)
-- ===================================================================

-- SELECT Policy
CREATE POLICY "profiles_select_policy"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR
    auth.get_my_role() IN ('admin', 'manager')
  );

-- UPDATE Policy (original - no role change allowed for anyone except through RLS bypass)
CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR
    auth.get_my_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    auth.uid() = id
    OR
    auth.get_my_role() IN ('admin', 'manager')
  );

-- INSERT Policy
CREATE POLICY "profiles_insert_policy"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- INSERT Policy for service_role
CREATE POLICY "profiles_insert_service_role"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- DELETE Policy
CREATE POLICY "profiles_delete_policy"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.get_my_role() = 'admin');

-- ===================================================================
-- Step 4: Verification
-- ===================================================================
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles';

  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '🔄 ROLLBACK COMPLETED - Restored to 20250206 version';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Policy Count: % (Expected: 5)', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: Admin may NOT be able to change roles with this version';
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
END $$;
