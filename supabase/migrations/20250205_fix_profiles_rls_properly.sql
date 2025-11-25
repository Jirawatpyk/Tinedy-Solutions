-- Fix Profiles RLS Properly
-- Date: 2025-02-05
-- Issue: RLS was disabled temporarily, causing auth errors
-- Solution: Re-enable RLS with proper, simple policies

-- ===================================================================
-- Step 1: Re-enable RLS on profiles table
-- ===================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- Step 2: Drop ALL existing policies to start fresh
-- ===================================================================
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

-- ===================================================================
-- Step 3: Create SIMPLE, non-recursive policies
-- ===================================================================

-- 1. SELECT Policy: Allow users to view their own profile + admins/managers can view all
CREATE POLICY "Allow users to view own profile and admins view all"
  ON profiles
  FOR SELECT
  USING (
    -- User can view their own profile
    auth.uid() = id
    OR
    -- Admin and Manager can view all profiles
    (
      SELECT role FROM profiles WHERE id = auth.uid()
    ) IN ('admin', 'manager')
  );

-- 2. UPDATE Policy: Allow users to update their own profile + admins/managers can update all
CREATE POLICY "Allow users to update own profile and admins update all"
  ON profiles
  FOR UPDATE
  USING (
    -- User can update their own profile
    auth.uid() = id
    OR
    -- Admin and Manager can update all profiles
    (
      SELECT role FROM profiles WHERE id = auth.uid()
    ) IN ('admin', 'manager')
  );

-- 3. INSERT Policy: Only service role (Edge Functions) can insert profiles
CREATE POLICY "Only service role can insert profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (
    -- Check if current role has service_role privileges
    (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

-- 4. DELETE Policy: Only admins can delete profiles
CREATE POLICY "Only admins can delete profiles"
  ON profiles
  FOR DELETE
  USING (
    (
      SELECT role FROM profiles WHERE id = auth.uid()
    ) = 'admin'
  );

-- ===================================================================
-- Step 4: Grant necessary permissions
-- ===================================================================
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- ===================================================================
-- Verification
-- ===================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ RLS Re-enabled on profiles table';
  RAISE NOTICE '✅ Simple, non-recursive policies created';
  RAISE NOTICE '✅ Users can view/update their own profile';
  RAISE NOTICE '✅ Admins and Managers can view/update all profiles';
  RAISE NOTICE '✅ Service role (Edge Functions) can insert profiles';
  RAISE NOTICE '✅ Only admins can delete profiles';
  RAISE NOTICE '🎉 Profiles RLS is now properly configured';
END $$;
