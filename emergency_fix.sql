-- EMERGENCY FIX: Restore Login Functionality
-- Copy and paste this ENTIRE script into Supabase SQL Editor and run it

-- ===================================================================
-- Step 1: Check current triggers on profiles table
-- ===================================================================
SELECT
  t.tgname AS trigger_name,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'profiles'::regclass;

-- ===================================================================
-- Step 2: Drop problematic function from bookings (should not affect profiles)
-- ===================================================================
DROP FUNCTION IF EXISTS public.notify_admins_new_booking() CASCADE;

-- ===================================================================
-- Step 3: Check if profiles table is accessible
-- ===================================================================
SELECT COUNT(*) FROM profiles;

-- ===================================================================
-- Step 4: Check RLS policies on profiles
-- ===================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles';

-- ===================================================================
-- If the above queries work, the issue should be resolved
-- If not, run the following emergency commands:
-- ===================================================================

-- Emergency: Temporarily disable RLS on profiles (ONLY IF NECESSARY)
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Emergency: Re-enable RLS on profiles (after testing)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
