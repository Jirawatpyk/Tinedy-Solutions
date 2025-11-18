-- ============================================================================
-- Migration: Add Manager Role
-- Description: Add 'manager' role to the profiles table and update constraints
-- Date: 2025-01-16
-- ============================================================================

-- Step 1: Drop existing role constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Add new role constraint with manager included
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'manager', 'staff'));

-- Step 3: Add index on role for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Step 4: Create role_permissions table (optional - for future extensibility)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  resource TEXT NOT NULL, -- 'bookings', 'customers', 'staff', 'teams', 'reports', 'settings'
  can_create BOOLEAN DEFAULT false,
  can_read BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, resource)
);

-- Step 5: Insert default permissions for each role
-- Admin permissions (full access)
INSERT INTO role_permissions (role, resource, can_create, can_read, can_update, can_delete, can_export)
VALUES
  ('admin', 'bookings', true, true, true, true, true),
  ('admin', 'customers', true, true, true, true, true),
  ('admin', 'staff', true, true, true, true, true),
  ('admin', 'teams', true, true, true, true, true),
  ('admin', 'reports', false, true, false, false, true),
  ('admin', 'settings', false, true, true, false, false),
  ('admin', 'users', true, true, true, true, false)
ON CONFLICT (role, resource) DO NOTHING;

-- Manager permissions (CRUD except delete)
INSERT INTO role_permissions (role, resource, can_create, can_read, can_update, can_delete, can_export)
VALUES
  ('manager', 'bookings', true, true, true, false, true),
  ('manager', 'customers', true, true, true, false, true),
  ('manager', 'staff', false, true, true, false, false), -- Can read and assign, cannot create/delete
  ('manager', 'teams', true, true, true, false, false),
  ('manager', 'reports', false, true, false, false, true),
  ('manager', 'settings', false, false, false, false, false),
  ('manager', 'users', false, false, false, false, false)
ON CONFLICT (role, resource) DO NOTHING;

-- Staff permissions (limited access)
INSERT INTO role_permissions (role, resource, can_create, can_read, can_update, can_delete, can_export)
VALUES
  ('staff', 'bookings', false, true, true, false, false), -- Can read assigned, update status
  ('staff', 'customers', false, true, false, false, false), -- Can read assigned only
  ('staff', 'staff', false, true, true, false, false), -- Can read self, update own profile
  ('staff', 'teams', false, true, false, false, false), -- Can read assigned teams
  ('staff', 'reports', false, false, false, false, false),
  ('staff', 'settings', false, false, false, false, false),
  ('staff', 'users', false, false, false, false, false)
ON CONFLICT (role, resource) DO NOTHING;

-- Step 6: Create function to check permissions
CREATE OR REPLACE FUNCTION has_permission(
  user_id UUID,
  resource_name TEXT,
  action TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  has_perm BOOLEAN;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;

  -- If no role found, deny
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check permission based on action
  SELECT
    CASE action
      WHEN 'create' THEN can_create
      WHEN 'read' THEN can_read
      WHEN 'update' THEN can_update
      WHEN 'delete' THEN can_delete
      WHEN 'export' THEN can_export
      ELSE FALSE
    END INTO has_perm
  FROM role_permissions
  WHERE role = user_role AND resource = resource_name;

  -- If no permission record found, deny
  RETURN COALESCE(has_perm, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create updated_at trigger for role_permissions
CREATE OR REPLACE FUNCTION update_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_role_permissions_updated_at();

-- Step 8: Add comment for documentation
COMMENT ON TABLE role_permissions IS 'Stores permissions for each role and resource combination';
COMMENT ON FUNCTION has_permission IS 'Checks if a user has permission to perform an action on a resource';

-- Step 9: Grant necessary permissions
GRANT SELECT ON role_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION has_permission TO authenticated;
