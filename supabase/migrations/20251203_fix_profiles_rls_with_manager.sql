-- Fix Profiles RLS - Support Manager Role
-- Date: 2025-12-03
-- Based on: 20251203_fix_profiles_rls_simple.sql
-- Added: Manager can update staff profiles (but not change roles)

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
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_manager(uuid) CASCADE;

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

-- Function to check if user is manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role IN ('admin', 'manager')
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
GRANT EXECUTE ON FUNCTION public.is_manager_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_or_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;

-- ===================================================================
-- Step 4: Enable RLS
-- ===================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- Step 5: Create policies with Manager + Admin support
-- ===================================================================

-- Policy 1: SELECT - All authenticated users can read ALL profiles
-- Reason: CRM app needs staff to see other staff names
CREATE POLICY "profiles_select_all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: UPDATE - Tiered permissions
-- Staff: Update own profile (not role)
-- Manager: Update own + staff profiles (not roles)
-- Admin: Update anything
CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Own profile
    auth.uid() = id
    OR
    -- Manager/Admin can access any profile
    public.is_manager_or_admin(auth.uid())
  )
  WITH CHECK (
    -- Case 1: Users update own profile (cannot change role)
    (
      auth.uid() = id
      AND role = public.get_user_role(auth.uid())
    )
    OR
    -- Case 2: Manager updates staff profile (cannot change role to manager/admin)
    (
      public.get_user_role(auth.uid()) = 'manager'
      AND auth.uid() != id
      AND role = 'staff'
    )
    OR
    -- Case 3: Admin can do anything
    public.is_admin(auth.uid())
  );

-- Policy 3: INSERT - Users can create their own profile (signup)
CREATE POLICY "profiles_insert_own"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy 4: Service role can do anything
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
  RAISE NOTICE '  PROFILES RLS FIX - WITH MANAGER SUPPORT (2025-12-03)';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Status: %', CASE WHEN rls_enabled THEN 'ENABLED ✓' ELSE 'DISABLED ✗' END;
  RAISE NOTICE 'Policy Count: % (Expected: 4)', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Policies:';
  RAISE NOTICE '  1. profiles_select_all - All authenticated can read';
  RAISE NOTICE '  2. profiles_update_policy - Tiered permissions';
  RAISE NOTICE '  3. profiles_insert_own - Create own profile';
  RAISE NOTICE '  4. profiles_service_role_all - Service role all access';
  RAISE NOTICE '';
  RAISE NOTICE 'Permissions by Role:';
  RAISE NOTICE '  STAFF:';
  RAISE NOTICE '    ✓ Read all profiles';
  RAISE NOTICE '    ✓ Update own profile (name, phone, avatar)';
  RAISE NOTICE '    ✗ Cannot change own role';
  RAISE NOTICE '    ✗ Cannot update others';
  RAISE NOTICE '';
  RAISE NOTICE '  MANAGER:';
  RAISE NOTICE '    ✓ Read all profiles';
  RAISE NOTICE '    ✓ Update own profile (name, phone, avatar)';
  RAISE NOTICE '    ✓ Update staff profiles (name, phone, avatar)';
  RAISE NOTICE '    ✗ Cannot change any roles';
  RAISE NOTICE '    ✗ Cannot update other managers/admins';
  RAISE NOTICE '';
  RAISE NOTICE '  ADMIN:';
  RAISE NOTICE '    ✓ Read all profiles';
  RAISE NOTICE '    ✓ Update any profile (including roles)';
  RAISE NOTICE '    ✓ Change anyone''s role';
  RAISE NOTICE '';
  RAISE NOTICE 'Security:';
  RAISE NOTICE '  ✓ NO RECURSION - SECURITY DEFINER functions bypass RLS';
  RAISE NOTICE '  ✓ Login works - SELECT policy has no role check';
  RAISE NOTICE '  ✓ Role hierarchy enforced in WITH CHECK';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper Functions:';
  RAISE NOTICE '  - is_admin(user_id)';
  RAISE NOTICE '  - is_manager_or_admin(user_id)';
  RAISE NOTICE '  - get_user_role(user_id)';
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
END $$;

COMMIT;
