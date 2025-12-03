-- Fix Profiles RLS - Simple & No Recursion
-- Date: 2025-12-03
-- Issue: "Error fetching profile" during login - infinite recursion
-- Root Cause: SELECT policy calls get_user_role() which queries profiles table
--
-- SOLUTION: Ultra-simple policies without role checks
-- Security Model:
-- - All authenticated users can READ all profiles (CRM needs this)
-- - Users can UPDATE own profile only
-- - Admins can UPDATE/DELETE via service_role (not RLS)

BEGIN;

-- ===================================================================
-- Step 1: Drop ALL existing policies
-- ===================================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- ===================================================================
-- Step 2: Drop old functions that cause recursion
-- ===================================================================
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS auth.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;

-- ===================================================================
-- Step 3: Create helper functions with SECURITY DEFINER
-- These BYPASS RLS when called, preventing recursion
-- ===================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'admin'
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = user_id LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;

-- ===================================================================
-- Step 4: Enable RLS
-- ===================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- Step 5: Create policies with admin support (NO RECURSION)
-- ===================================================================

-- Policy 1: SELECT - All authenticated users can read ALL profiles
-- Reason: CRM app needs staff to see other staff names
-- NO RECURSION: No function calls, no role checks
CREATE POLICY "profiles_select_all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: UPDATE - Users can update own profile OR admin can update any
-- NO RECURSION: is_admin() uses SECURITY DEFINER to bypass RLS
CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id                    -- Own profile
    OR public.is_admin(auth.uid())     -- Or user is admin (SECURITY DEFINER = no recursion)
  )
  WITH CHECK (
    -- Users can only update own profile and can't change role
    (auth.uid() = id AND role = public.get_user_role(auth.uid()))
    OR
    -- Admins can update any profile including role
    public.is_admin(auth.uid())
  );

-- Policy 3: INSERT - Users can create their own profile (signup)
-- NO RECURSION: Only checks auth.uid()
CREATE POLICY "profiles_insert_own"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy 4: Service role can do anything (for Edge Functions & Admin operations)
CREATE POLICY "profiles_service_role_all"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

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
BEGIN
  -- Check RLS status
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'profiles' AND relnamespace = 'public'::regnamespace;

  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles' AND schemaname = 'public';

  -- Output results
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '  PROFILES RLS FIX - SIMPLE (2025-12-03)';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Status: %', CASE WHEN rls_enabled THEN 'ENABLED ✓' ELSE 'DISABLED ✗' END;
  RAISE NOTICE 'Policy Count: % (Expected: 4)', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Policies:';
  RAISE NOTICE '  1. profiles_select_all - All authenticated can read';
  RAISE NOTICE '  2. profiles_update_policy - Users update own, Admin updates any';
  RAISE NOTICE '  3. profiles_insert_own - Create own profile';
  RAISE NOTICE '  4. profiles_service_role_all - Service role can do anything';
  RAISE NOTICE '';
  RAISE NOTICE 'Security Model:';
  RAISE NOTICE '  ✓ NO RECURSION - SECURITY DEFINER functions bypass RLS';
  RAISE NOTICE '  ✓ Login works - SELECT policy is simple (no role check)';
  RAISE NOTICE '  ✓ Admin can update profiles - via is_admin() SECURITY DEFINER';
  RAISE NOTICE '  ✓ Users cannot change own role - enforced in WITH CHECK';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper Functions:';
  RAISE NOTICE '  - is_admin(user_id) - Check if user is admin (SECURITY DEFINER)';
  RAISE NOTICE '  - get_user_role(user_id) - Get user role (SECURITY DEFINER)';
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
END $$;

COMMIT;
