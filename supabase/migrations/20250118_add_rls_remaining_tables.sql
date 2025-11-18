-- ============================================================================
-- Migration: Add RLS Policies for Remaining Tables
-- Description: เพิ่ม RLS policies สำหรับ role_permissions, settings, staff_availability
-- Date: 2025-01-18
-- ============================================================================

-- ============================================================================
-- 1. ROLE_PERMISSIONS Table
-- ============================================================================

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can view permissions (read-only)
CREATE POLICY "All users can view role permissions"
ON role_permissions FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only admins can create permissions
CREATE POLICY "Only admins can create role permissions"
ON role_permissions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- UPDATE: Only admins can update permissions
CREATE POLICY "Only admins can update role permissions"
ON role_permissions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- DELETE: Only admins can delete permissions
CREATE POLICY "Only admins can delete role permissions"
ON role_permissions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- 2. SETTINGS Table
-- ============================================================================

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can view settings
CREATE POLICY "All users can view settings"
ON settings FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only admins can create settings
CREATE POLICY "Only admins can create settings"
ON settings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- UPDATE: Only admins can update settings
CREATE POLICY "Only admins can update settings"
ON settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- DELETE: Only admins can delete settings
CREATE POLICY "Only admins can delete settings"
ON settings FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- 3. STAFF_AVAILABILITY Table
-- ============================================================================

-- Enable RLS
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin/Manager can view all, staff can view their own
CREATE POLICY "Users can view staff availability"
ON staff_availability FOR SELECT
TO authenticated
USING (
  staff_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- INSERT: Admin/Manager can create for anyone, staff can create their own
CREATE POLICY "Users can create staff availability"
ON staff_availability FOR INSERT
TO authenticated
WITH CHECK (
  staff_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- UPDATE: Admin/Manager can update all, staff can update their own
CREATE POLICY "Users can update staff availability"
ON staff_availability FOR UPDATE
TO authenticated
USING (
  staff_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- DELETE: Admin/Manager can delete all, staff can delete their own
CREATE POLICY "Users can delete staff availability"
ON staff_availability FOR DELETE
TO authenticated
USING (
  staff_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- ============================================================================
-- Note: deleted_items is a VIEW, not a table, so RLS cannot be applied
-- Views automatically inherit RLS from their base tables
-- ============================================================================

-- ============================================================================
-- Verify Policies
-- ============================================================================

-- Check role_permissions policies
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'role_permissions'
ORDER BY cmd, policyname;

-- Check settings policies
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'settings'
ORDER BY cmd, policyname;

-- Check staff_availability policies
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'staff_availability'
ORDER BY cmd, policyname;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE role_permissions IS 'Role permissions with RLS - Admin only modify, all can read';
COMMENT ON TABLE settings IS 'System settings with RLS - Admin only modify, all can read';
COMMENT ON TABLE staff_availability IS 'Staff availability with RLS - Admin/Manager manage all, staff manage own';
