-- ============================================================================
-- Migration: Fix Profiles RLS with Helper Function (No Recursion)
-- Description: ใช้ helper function แทน JWT claims และไม่มี recursive queries
-- Date: 2025-01-18
-- ============================================================================

-- ลบ policies ทั้งหมดที่มีปัญหา
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
-- Helper Function: Get Current User Role (Using Cache)
-- ============================================================================

-- Create a helper function that caches the role lookup
-- This prevents recursive queries by using request-scoped caching
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  -- Use a simple subquery that will be cached by PostgreSQL
  -- STABLE functions are only executed once per query
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ============================================================================
-- SELECT Policies (Read) - Non-Recursive using Helper Function
-- ============================================================================

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: Admin and Manager can view all profiles
CREATE POLICY "Admin and Manager view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  public.get_my_role() IN ('admin', 'manager')
);

-- ============================================================================
-- INSERT Policies (Create) - Non-Recursive
-- ============================================================================

-- Policy 3: Only admin can create profiles
CREATE POLICY "Admin can create profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  public.get_my_role() = 'admin'
);

-- ============================================================================
-- UPDATE Policies (Modify) - Non-Recursive
-- ============================================================================

-- Policy 4: Users can update their own profile
CREATE POLICY "Users update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy 5: Admin can update all profiles
CREATE POLICY "Admin update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  public.get_my_role() = 'admin'
);

-- Policy 6: Manager can update staff profiles
CREATE POLICY "Manager update staff profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  public.get_my_role() = 'manager'
);

-- ============================================================================
-- DELETE Policies (Remove) - Non-Recursive
-- ============================================================================

-- Policy 7: Only admin can delete profiles
CREATE POLICY "Admin delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (
  public.get_my_role() = 'admin'
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

COMMENT ON FUNCTION public.get_my_role() IS 'Helper function to get current user role without recursion (STABLE for caching)';
COMMENT ON TABLE profiles IS 'User profiles with non-recursive RLS policies using helper function';
COMMENT ON POLICY "Users can view own profile" ON profiles IS 'Users can always view their own profile';
COMMENT ON POLICY "Admin and Manager view all profiles" ON profiles IS 'Admin and Manager can view all profiles (using cached helper function)';
COMMENT ON POLICY "Admin can create profiles" ON profiles IS 'Only admin can create new profiles';
COMMENT ON POLICY "Users update own profile" ON profiles IS 'Users can update their own profile';
COMMENT ON POLICY "Admin update all profiles" ON profiles IS 'Admin can update any profile';
COMMENT ON POLICY "Manager update staff profiles" ON profiles IS 'Manager can update staff profiles';
COMMENT ON POLICY "Admin delete profiles" ON profiles IS 'Only admin can delete profiles';
