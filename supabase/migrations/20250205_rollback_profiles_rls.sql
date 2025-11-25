-- Rollback: Disable RLS ชั่วคราวถ้าเกิดปัญหา
-- Date: 2025-02-05
-- Use Case: ถ้า migration ใหม่ทำให้ login ไม่ได้
-- Author: Claude Code
--
-- WARNING: This will DISABLE Row Level Security temporarily
-- Use ONLY in emergency situations when login is broken
--
-- ===================================================================
-- How to use:
-- 1. Only run if 20250205_fix_profiles_rls_properly.sql causes issues
-- 2. Run this in Supabase SQL Editor
-- 3. Verify login works
-- 4. File incident and fix properly within 24 hours
-- ===================================================================

BEGIN;

-- ===================================================================
-- Step 1: Disable RLS (ชั่วคราว)
-- ===================================================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ===================================================================
-- Step 2: Drop ALL new policies (from 20250205 fix)
-- ===================================================================
DROP POLICY IF EXISTS "Allow users to view own profile and admins view all" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile and admins update all" ON profiles;
DROP POLICY IF EXISTS "Only service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;

-- Drop other potential policy names (in case naming differs)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin and manager can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin and manager can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- ===================================================================
-- Step 3: Verify Rollback
-- ===================================================================
DO $$
DECLARE
  rls_status boolean;
  policy_count integer;
BEGIN
  -- Check RLS status
  SELECT rowsecurity INTO rls_status
  FROM pg_tables
  WHERE tablename = 'profiles';

  -- Count remaining policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles';

  -- Log results
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '⚠️⚠️⚠️ ROLLBACK COMPLETED ⚠️⚠️⚠️';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Status: %', CASE WHEN rls_status THEN 'ENABLED' ELSE 'DISABLED' END;
  RAISE NOTICE 'Policies Count: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Login should work now';
  RAISE NOTICE '🔴 CRITICAL: RLS is DISABLED - This is TEMPORARY';
  RAISE NOTICE '🔴 SECURITY RISK: All authenticated users can read all profiles';
  RAISE NOTICE '🔴 ACTION REQUIRED: Fix properly within 24 hours';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Verify login works';
  RAISE NOTICE '2. Create incident ticket';
  RAISE NOTICE '3. Investigate why fix migration failed';
  RAISE NOTICE '4. Apply proper fix within 24 hours';
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';

  -- Ensure RLS is actually disabled
  IF rls_status THEN
    RAISE EXCEPTION 'ROLLBACK FAILED: RLS is still ENABLED';
  END IF;
END $$;

COMMIT;

-- ===================================================================
-- Verification Queries (Run these after rollback)
-- ===================================================================

-- Check RLS status and policies
SELECT
  'profiles' as table_name,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') as policy_count
FROM pg_tables
WHERE tablename = 'profiles';

-- List any remaining policies
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ===================================================================
-- Emergency Contact Information
-- ===================================================================
-- If this rollback doesn't fix login issues:
-- 1. Check Supabase status: https://status.supabase.com
-- 2. Contact backend team
-- 3. Open Supabase support ticket
--
-- Common Issues After Rollback:
-- - Network/connection issues
-- - JWT token expired (clear browser cache)
-- - Auth state corruption (clear localStorage)
-- ===================================================================
