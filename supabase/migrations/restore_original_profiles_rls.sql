-- ============================================================================
-- Migration: Restore Original Profiles RLS Policies
-- Description: Rollback ไปใช้ policies เดิมที่ใช้ get_user_role() function
-- Date: 2025-01-18
-- ============================================================================

-- ลบ policies ปัจจุบันทั้งหมด
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Recreate Helper Functions (ถ้ายังไม่มี)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================================
-- Restore Original Profiles RLS Policies
-- ============================================================================

-- SELECT policy - Admin/Manager can view all, users can view own
CREATE POLICY "Admins and managers can view all profiles, users own"
ON profiles FOR SELECT
TO authenticated
USING (
  get_user_role() IN ('admin', 'manager') OR id = auth.uid()
);

-- INSERT policy - Only admins can create profiles
CREATE POLICY "Only admins can create profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() = 'admin'
);

-- UPDATE policy - Admins can update all, users can update own
CREATE POLICY "Admins can update all profiles, users can update own"
ON profiles FOR UPDATE
TO authenticated
USING (
  get_user_role() = 'admin' OR id = auth.uid()
);

-- DELETE policy - Only admins can delete
CREATE POLICY "Only admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- ============================================================================
-- Verify Policies
-- ============================================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION public.get_user_role() IS 'Get current authenticated user role (SECURITY DEFINER to bypass RLS)';
COMMENT ON FUNCTION public.is_admin() IS 'Check if current user is admin';
COMMENT ON TABLE profiles IS 'User profiles with original RLS policies restored';
COMMENT ON POLICY "Admins and managers can view all profiles, users own" ON profiles IS 'Admin/Manager see all, staff see own profile';
COMMENT ON POLICY "Only admins can create profiles" ON profiles IS 'Only admin can create new user accounts';
COMMENT ON POLICY "Admins can update all profiles, users can update own" ON profiles IS 'Admin updates all, users update own';
COMMENT ON POLICY "Only admins can delete profiles" ON profiles IS 'Only admin can delete user accounts';
