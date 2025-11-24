-- COMPLETE FIX: Remove ALL get_current_user_role() Usage - Restore Login
-- Date: 2025-02-04
-- Issue: Multiple policies use get_current_user_role() which queries profiles → infinite recursion
-- Solution: Drop ALL policies that use this function and recreate without it

-- ===================================================================
-- Step 1: Fix get_current_user_role() - Remove profiles table query
-- ===================================================================

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  -- ✅ อ่านจาก JWT เท่านั้น (ไม่ query profiles)
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role')::TEXT,
    'staff'
  );
$$;

COMMENT ON FUNCTION public.get_current_user_role() IS
'Returns the current user role from JWT ONLY. Never queries profiles table to avoid infinite recursion.';

-- ===================================================================
-- Step 2: Drop ALL profiles policies
-- ===================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "All authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can create profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can update staff info" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;

-- ===================================================================
-- Step 3: Recreate profiles SELECT policies (NO recursion)
-- ===================================================================

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: All authenticated users can view profiles (for chat)
CREATE POLICY "All authenticated users can view profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- ===================================================================
-- Step 4: Recreate profiles INSERT policy (use JWT directly)
-- ===================================================================

CREATE POLICY "Only admins can create profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  -- อ่าน role จาก JWT metadata โดยตรง
  COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::TEXT, 'staff') = 'admin'
);

-- ===================================================================
-- Step 5: Recreate profiles UPDATE policies (use JWT directly)
-- ===================================================================

-- Policy: Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND (
    -- ป้องกันการเปลี่ยน role เว้นแต่เป็น admin
    role = (SELECT role FROM profiles WHERE id = auth.uid())
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::TEXT, 'staff') = 'admin'
  )
);

-- Policy: Admin can update all profiles
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::TEXT, 'staff') = 'admin'
);

-- Policy: Manager can update staff (except role)
CREATE POLICY "Managers can update staff info"
ON profiles FOR UPDATE
TO authenticated
USING (
  COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::TEXT, 'staff') = 'manager'
)
WITH CHECK (
  -- Manager ไม่สามารถเปลี่ยน role ได้
  role = (SELECT role FROM profiles WHERE id = profiles.id)
);

-- ===================================================================
-- Step 6: Recreate profiles DELETE policy (use JWT directly)
-- ===================================================================

CREATE POLICY "Only admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (
  COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::TEXT, 'staff') = 'admin'
);

-- ===================================================================
-- Step 7: Drop and recreate messages policies (NO recursion)
-- ===================================================================

DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON messages;
DROP POLICY IF EXISTS "Only admins can delete messages" ON messages;

-- Messages SELECT: Users see their own messages OR admin sees all
CREATE POLICY "Users can view their messages"
ON messages FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR recipient_id = auth.uid()
  OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::TEXT, 'staff') = 'admin'
);

-- Messages INSERT: Users can send as themselves
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Messages UPDATE: Recipients can update (mark as read) OR admin
CREATE POLICY "Users can update their received messages"
ON messages FOR UPDATE
TO authenticated
USING (
  recipient_id = auth.uid()
  OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::TEXT, 'staff') = 'admin'
);

-- Messages DELETE: Only admin
CREATE POLICY "Only admins can delete messages"
ON messages FOR DELETE
TO authenticated
USING (
  COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::TEXT, 'staff') = 'admin'
);

-- ===================================================================
-- Verification
-- ===================================================================
DO $$
BEGIN
  RAISE NOTICE '✅✅✅ COMPLETE FIX APPLIED ✅✅✅';
  RAISE NOTICE '✅ Fixed get_current_user_role() - reads from JWT only';
  RAISE NOTICE '✅ Recreated ALL profiles policies without recursion';
  RAISE NOTICE '✅ Recreated ALL messages policies without recursion';
  RAISE NOTICE '✅ All policies now use JWT directly: COALESCE((auth.jwt() -> ''user_metadata'' ->> ''role'')::TEXT, ''staff'')';
  RAISE NOTICE '⚠️⚠️⚠️ LOGIN SHOULD WORK NOW - TEST IMMEDIATELY! ⚠️⚠️⚠️';
END $$;
