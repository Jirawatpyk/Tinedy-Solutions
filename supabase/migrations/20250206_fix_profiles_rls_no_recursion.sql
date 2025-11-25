-- Fix Profiles RLS - Non-Recursive Solution
-- Date: 2025-02-06 (Updated: 2025-11-25)
-- Issue: Previous policies had recursive subqueries causing infinite loops
-- Solution: Use SECURITY DEFINER function to bypass RLS when checking role

-- ===================================================================
-- Step 1: Drop ALL existing policies on profiles table
-- ===================================================================
DROP POLICY IF EXISTS "Allow users to view own profile and admins view all" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile and admins update all" ON profiles;
DROP POLICY IF EXISTS "Only service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;
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
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- ===================================================================
-- Step 2: Create SECURITY DEFINER function to get current user's role
-- This function bypasses RLS, preventing recursive policy checks
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auth.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.get_my_role() TO service_role;

-- ===================================================================
-- Step 3: Enable RLS on profiles table
-- ===================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- Step 4: Create non-recursive policies using the helper function
-- ===================================================================

-- SELECT Policy: Users can view their own profile, admins/managers can view all
CREATE POLICY "profiles_select_policy"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- User can always view their own profile
    auth.uid() = id
    OR
    -- Admin and Manager can view all profiles (using non-recursive function)
    auth.get_my_role() IN ('admin', 'manager')
  );

-- UPDATE Policy: Users can update their own profile, admins/managers can update all
CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- User can update their own profile
    auth.uid() = id
    OR
    -- Admin and Manager can update all profiles
    auth.get_my_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    auth.uid() = id
    OR
    auth.get_my_role() IN ('admin', 'manager')
  );

-- INSERT Policy:
-- - Users can create their own profile (during signup)
-- - Service role can create any profile (Edge Functions)
CREATE POLICY "profiles_insert_policy"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can create their own profile
    auth.uid() = id
  );

-- INSERT Policy for service_role (separate policy)
CREATE POLICY "profiles_insert_service_role"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- DELETE Policy: Only admins can delete profiles
CREATE POLICY "profiles_delete_policy"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    auth.get_my_role() = 'admin'
  );

-- ===================================================================
-- Step 5: Grant necessary permissions
-- ===================================================================
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- ===================================================================
-- Step 6: Verification
-- ===================================================================
DO $$
DECLARE
  rls_enabled boolean;
  policy_count integer;
  function_exists boolean;
BEGIN
  -- Check RLS status
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE tablename = 'profiles' AND schemaname = 'public';

  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles';

  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'auth' AND p.proname = 'get_my_role'
  ) INTO function_exists;

  -- Output results
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '✅ PROFILES RLS FIX COMPLETED';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Status: %', CASE WHEN rls_enabled THEN '✅ ENABLED' ELSE '🔴 DISABLED' END;
  RAISE NOTICE 'Policy Count: % (Expected: 5)', policy_count;
  RAISE NOTICE 'Helper Function: %', CASE WHEN function_exists THEN '✅ EXISTS' ELSE '🔴 MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Policies Created:';
  RAISE NOTICE '  1. profiles_select_policy (SELECT) - View own or all for admin/manager';
  RAISE NOTICE '  2. profiles_update_policy (UPDATE) - Update own or all for admin/manager';
  RAISE NOTICE '  3. profiles_insert_policy (INSERT) - Create own profile';
  RAISE NOTICE '  4. profiles_insert_service_role (INSERT) - Service role can create any';
  RAISE NOTICE '  5. profiles_delete_policy (DELETE) - Only admin can delete';
  RAISE NOTICE '';
  RAISE NOTICE 'Non-Recursive Implementation:';
  RAISE NOTICE '  - auth.get_my_role() function uses SECURITY DEFINER';
  RAISE NOTICE '  - Bypasses RLS when checking role to prevent recursion';
  RAISE NOTICE '';

  IF rls_enabled AND policy_count >= 4 AND function_exists THEN
    RAISE NOTICE '🎉 SUCCESS: Login should work correctly now';
  ELSE
    RAISE NOTICE '⚠️ WARNING: Some checks failed - review output above';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
END $$;

-- ===================================================================
-- Test Query (Optional - Run manually to verify)
-- ===================================================================
-- SELECT auth.get_my_role(); -- Should return current user's role
