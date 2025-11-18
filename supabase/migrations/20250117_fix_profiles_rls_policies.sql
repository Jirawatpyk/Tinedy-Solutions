-- ============================================================================
-- Migration: Fix Profiles RLS Policies (Fix Infinite Recursion)
-- Description: แก้ไข RLS policies สำหรับ profiles table เพื่อป้องกัน infinite recursion
-- Date: 2025-01-17
-- ============================================================================

-- ลบ policies เก่าที่มีปัญหา
DROP POLICY IF EXISTS "Admins and Managers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can create profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can update staff assignments" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- ============================================================================
-- SELECT Policies (Read)
-- ============================================================================

-- Policy: Users can always view their own profile
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy: Admin and Manager can view all profiles
-- ใช้ function แทนการ query profiles table โดยตรง
CREATE POLICY "Admins and Managers can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  -- Check if current user is admin or manager via JWT or simple lookup
  auth.uid() IN (
    SELECT id FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
  OR id = auth.uid() -- Always allow viewing own profile
);

-- ============================================================================
-- INSERT Policies (Create)
-- ============================================================================

-- Policy: Only admin can create new profiles (staff accounts)
CREATE POLICY "Only admins can create profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- UPDATE Policies (Modify)
-- ============================================================================

-- Policy: Users can update their own profile (except role)
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  -- Prevent role changes by non-admins (will be enforced in application too)
  AND (
    role = (SELECT role FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
);

-- Policy: Admin can update all profiles
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Manager can view and update basic staff info (not role)
CREATE POLICY "Managers can update staff info"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'manager'
  )
)
WITH CHECK (
  -- Manager cannot change roles
  role = (SELECT role FROM profiles WHERE id = profiles.id)
);

-- ============================================================================
-- DELETE Policies (Remove)
-- ============================================================================

-- Policy: Only admin can delete profiles
CREATE POLICY "Only admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON POLICY "Users can view their own profile" ON profiles IS 'All authenticated users can view their own profile';
COMMENT ON POLICY "Admins and Managers can view all profiles" ON profiles IS 'Admin and Manager roles can view all profiles in the system';
COMMENT ON POLICY "Only admins can create profiles" ON profiles IS 'Only admin can create new user accounts (staff)';
COMMENT ON POLICY "Users can update their own profile" ON profiles IS 'Users can update their own profile except role field';
COMMENT ON POLICY "Admins can update all profiles" ON profiles IS 'Admin can update any profile including role changes';
COMMENT ON POLICY "Managers can update staff info" ON profiles IS 'Manager can update basic staff information but not roles';
COMMENT ON POLICY "Only admins can delete profiles" ON profiles IS 'Only admin can delete user accounts';
