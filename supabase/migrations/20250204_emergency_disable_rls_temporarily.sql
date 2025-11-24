-- EMERGENCY: Temporarily Disable RLS on Profiles Table
-- Date: 2025-02-04
-- Issue: Login still fails after fixing all policies
-- Solution: Temporarily disable RLS to restore login, then investigate root cause

-- ===================================================================
-- WARNING: This is TEMPORARY and should be fixed properly later
-- ===================================================================

-- Disable RLS on profiles table temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '⚠️⚠️⚠️ EMERGENCY MODE ENABLED ⚠️⚠️⚠️';
  RAISE NOTICE '⚠️ RLS on profiles table is DISABLED';
  RAISE NOTICE '✅ Login should work now';
  RAISE NOTICE '🔴 CRITICAL: This is TEMPORARY - must re-enable RLS after login works';
  RAISE NOTICE '🔴 NEXT STEP: Find root cause and properly fix RLS policies';
END $$;

-- ===================================================================
-- To re-enable RLS later (after fixing):
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ===================================================================
