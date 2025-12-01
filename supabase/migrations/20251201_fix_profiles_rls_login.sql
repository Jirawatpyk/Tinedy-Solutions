-- Fix Profiles RLS for Login - No Recursion
-- Date: 2025-12-01
-- Issue: "Error fetching profile" during login
-- Root Cause: SELECT policy uses get_my_role() which queries profiles table = infinite recursion
--
-- Solution:
-- 1. SELECT policy ให้ทุก authenticated user ดูได้ทั้งหมด (ปลอดภัยเพราะมี auth แล้ว)
-- 2. UPDATE/DELETE policy ใช้ SECURITY DEFINER function เพื่อ bypass RLS

-- ===================================================================
-- Step 1: Drop ALL existing policies on profiles table
-- ===================================================================
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_service_role" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Old policies from various migrations
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
DROP POLICY IF EXISTS "Admins and Managers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can create profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can update staff assignments" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Managers can update staff info" ON profiles;
DROP POLICY IF EXISTS "Managers can update staff information" ON profiles;

-- ===================================================================
-- Step 2: Drop old helper functions
-- ===================================================================
DROP FUNCTION IF EXISTS public.get_my_role();
DROP FUNCTION IF EXISTS auth.get_my_role();

-- ===================================================================
-- Step 3: Create helper function with SECURITY DEFINER
-- This bypasses RLS when called, preventing recursion
-- IMPORTANT: Must be in 'public' schema (Supabase doesn't allow 'auth' schema)
-- ===================================================================
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = user_id LIMIT 1
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;

-- ===================================================================
-- Step 4: Enable RLS
-- ===================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- Step 5: Create NEW policies
-- ===================================================================

-- SELECT Policy: ALL authenticated users can read ALL profiles
-- Reason: This is a CRM app - staff need to see other staff names for assignments
-- Security: Only authenticated users (logged in) can see profiles
-- NO RECURSION because we don't check role here
CREATE POLICY "profiles_select_authenticated"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE Policy:
-- - Users can update their own profile (but not change role)
-- - Admin/Manager can update any profile
CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Can SEE the row if: it's their own OR they are admin/manager
    auth.uid() = id
    OR
    public.get_user_role(auth.uid()) IN ('admin', 'manager')
  )
  WITH CHECK (
    -- Can SAVE the row if:

    -- Admin can do anything
    public.get_user_role(auth.uid()) = 'admin'
    OR
    -- User updates own profile AND keeps same role
    (
      auth.uid() = id
      AND role = public.get_user_role(auth.uid())
    )
    OR
    -- Manager updates staff profile AND keeps role as 'staff'
    (
      public.get_user_role(auth.uid()) = 'manager'
      AND auth.uid() != id
      AND role = 'staff'
    )
  );

-- INSERT Policy: User can create their own profile (signup flow)
CREATE POLICY "profiles_insert_own"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- INSERT Policy: Service role can create any profile (Edge Functions)
CREATE POLICY "profiles_insert_service_role"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- DELETE Policy: Only admin can delete
CREATE POLICY "profiles_delete_admin"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ===================================================================
-- Step 6: Grant permissions
-- ===================================================================
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- ===================================================================
-- Step 7: Verification
-- ===================================================================
DO $$
DECLARE
  rls_enabled boolean;
  policy_count integer;
  function_exists boolean;
BEGIN
  -- Check RLS status
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'profiles' AND relnamespace = 'public'::regnamespace;

  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles';

  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_user_role'
  ) INTO function_exists;

  -- Output results
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '  PROFILES RLS FIX FOR LOGIN (2025-12-01)';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Status: %', CASE WHEN rls_enabled THEN 'ENABLED' ELSE 'DISABLED' END;
  RAISE NOTICE 'Policy Count: % (Expected: 5)', policy_count;
  RAISE NOTICE 'Helper Function: %', CASE WHEN function_exists THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Policies:';
  RAISE NOTICE '  1. profiles_select_authenticated - All authenticated can read';
  RAISE NOTICE '  2. profiles_update_policy - Own profile or admin/manager';
  RAISE NOTICE '  3. profiles_insert_own - Create own profile';
  RAISE NOTICE '  4. profiles_insert_service_role - Edge Functions';
  RAISE NOTICE '  5. profiles_delete_admin - Only admin delete';
  RAISE NOTICE '';
  RAISE NOTICE 'Key Changes:';
  RAISE NOTICE '  - SELECT policy NO LONGER checks role (prevents recursion)';
  RAISE NOTICE '  - get_user_role(uuid) uses SECURITY DEFINER';
  RAISE NOTICE '  - Login should work without "Error fetching profile"';
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
END $$;
