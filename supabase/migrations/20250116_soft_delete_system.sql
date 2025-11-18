-- ============================================================================
-- Migration: Soft Delete System
-- Description: Add soft delete functionality to critical tables
-- Date: 2025-01-16
-- ============================================================================

-- ============================================================================
-- Step 1: Add soft delete columns to tables
-- ============================================================================

-- Bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- Customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- Teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- Service Packages table (use is_active instead, but add for consistency)
ALTER TABLE service_packages
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- ============================================================================
-- Step 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON bookings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_teams_deleted_at ON teams(deleted_at);
CREATE INDEX IF NOT EXISTS idx_service_packages_deleted_at ON service_packages(deleted_at);

-- ============================================================================
-- Step 3: Create soft delete function
-- ============================================================================

CREATE OR REPLACE FUNCTION soft_delete_record(
  table_name TEXT,
  record_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  sql TEXT;
  user_role TEXT;
BEGIN
  -- Get current user role
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  -- Validate table name (prevent SQL injection)
  IF table_name NOT IN ('bookings', 'customers', 'teams', 'service_packages') THEN
    RAISE EXCEPTION 'Invalid table name: %', table_name;
  END IF;

  -- Managers and Admins can soft delete
  IF user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Permission denied. Only admin and manager can delete records.';
  END IF;

  -- Build and execute soft delete query
  sql := format(
    'UPDATE %I SET deleted_at = NOW(), deleted_by = %L WHERE id = %L AND deleted_at IS NULL',
    table_name,
    auth.uid(),
    record_id
  );

  EXECUTE sql;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to soft delete: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Step 4: Create restore function (undo soft delete)
-- ============================================================================

CREATE OR REPLACE FUNCTION restore_record(
  table_name TEXT,
  record_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  sql TEXT;
  user_role TEXT;
BEGIN
  -- Get current user role
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  -- Validate table name
  IF table_name NOT IN ('bookings', 'customers', 'teams', 'service_packages') THEN
    RAISE EXCEPTION 'Invalid table name: %', table_name;
  END IF;

  -- Only Admins and Managers can restore
  IF user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Permission denied. Only admin and manager can restore records.';
  END IF;

  -- Build and execute restore query
  sql := format(
    'UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = %L',
    table_name,
    record_id
  );

  EXECUTE sql;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to restore: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Step 5: Create permanent delete function (admin only)
-- ============================================================================

CREATE OR REPLACE FUNCTION permanent_delete_record(
  table_name TEXT,
  record_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  sql TEXT;
  user_role TEXT;
BEGIN
  -- Get current user role
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  -- Validate table name
  IF table_name NOT IN ('bookings', 'customers', 'teams', 'service_packages') THEN
    RAISE EXCEPTION 'Invalid table name: %', table_name;
  END IF;

  -- Only Admins can permanently delete
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Permission denied. Only admin can permanently delete records.';
  END IF;

  -- Build and execute permanent delete query
  sql := format('DELETE FROM %I WHERE id = %L', table_name, record_id);

  EXECUTE sql;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to permanently delete: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Step 6: Create view for active (non-deleted) records
-- ============================================================================

-- Active bookings view
CREATE OR REPLACE VIEW active_bookings AS
SELECT * FROM bookings
WHERE deleted_at IS NULL;

-- Active customers view
CREATE OR REPLACE VIEW active_customers AS
SELECT * FROM customers
WHERE deleted_at IS NULL;

-- Active teams view
CREATE OR REPLACE VIEW active_teams AS
SELECT * FROM teams
WHERE deleted_at IS NULL;

-- Active service packages view
CREATE OR REPLACE VIEW active_service_packages AS
SELECT * FROM service_packages
WHERE deleted_at IS NULL AND is_active = true;

-- ============================================================================
-- Step 7: Create deleted items view (for admin recovery)
-- ============================================================================

CREATE OR REPLACE VIEW deleted_items AS
SELECT
  'bookings' as table_name,
  id,
  deleted_at,
  deleted_by,
  (SELECT full_name FROM profiles WHERE id = bookings.deleted_by) as deleted_by_name
FROM bookings
WHERE deleted_at IS NOT NULL

UNION ALL

SELECT
  'customers' as table_name,
  id,
  deleted_at,
  deleted_by,
  (SELECT full_name FROM profiles WHERE id = customers.deleted_by) as deleted_by_name
FROM customers
WHERE deleted_at IS NOT NULL

UNION ALL

SELECT
  'teams' as table_name,
  id,
  deleted_at,
  deleted_by,
  (SELECT full_name FROM profiles WHERE id = teams.deleted_by) as deleted_by_name
FROM teams
WHERE deleted_at IS NOT NULL

ORDER BY deleted_at DESC;

-- ============================================================================
-- Step 8: Create automatic cleanup function (optional - for old deleted records)
-- ============================================================================

-- Function to permanently delete records older than specified days
CREATE OR REPLACE FUNCTION cleanup_old_deleted_records(
  days_old INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Only admin can run cleanup
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied. Only admin can cleanup old records.';
  END IF;

  -- Delete bookings older than specified days
  DELETE FROM bookings
  WHERE deleted_at < NOW() - (days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;

  -- Delete customers older than specified days
  DELETE FROM customers
  WHERE deleted_at < NOW() - (days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;

  -- Delete teams older than specified days
  DELETE FROM teams
  WHERE deleted_at < NOW() - (days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Step 9: Update existing policies to filter deleted records
-- ============================================================================

-- Note: The existing RLS policies will automatically filter deleted records
-- if we add the deleted_at IS NULL condition to views.
-- For direct table access, we'll need to update application queries.

-- ============================================================================
-- Step 10: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION soft_delete_record TO authenticated;
GRANT EXECUTE ON FUNCTION restore_record TO authenticated;
GRANT EXECUTE ON FUNCTION permanent_delete_record TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_deleted_records TO authenticated;

GRANT SELECT ON active_bookings TO authenticated;
GRANT SELECT ON active_customers TO authenticated;
GRANT SELECT ON active_teams TO authenticated;
GRANT SELECT ON active_service_packages TO authenticated;

-- Only admin can view deleted items
GRANT SELECT ON deleted_items TO authenticated;

-- ============================================================================
-- Step 11: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN bookings.deleted_at IS 'Timestamp when record was soft deleted. NULL means active.';
COMMENT ON COLUMN bookings.deleted_by IS 'User who performed the soft delete.';

COMMENT ON FUNCTION soft_delete_record IS 'Soft delete a record (marks as deleted without removing from database). Admin and Manager only.';
COMMENT ON FUNCTION restore_record IS 'Restore a soft deleted record. Admin and Manager only.';
COMMENT ON FUNCTION permanent_delete_record IS 'Permanently delete a record from database. Admin only.';
COMMENT ON FUNCTION cleanup_old_deleted_records IS 'Permanently delete soft-deleted records older than specified days. Admin only.';

COMMENT ON VIEW active_bookings IS 'View showing only active (non-deleted) bookings';
COMMENT ON VIEW active_customers IS 'View showing only active (non-deleted) customers';
COMMENT ON VIEW active_teams IS 'View showing only active (non-deleted) teams';
COMMENT ON VIEW deleted_items IS 'View showing all soft-deleted items across tables for admin recovery';

-- ============================================================================
-- Step 12: Create audit trigger for soft deletes (optional - for tracking)
-- ============================================================================

CREATE OR REPLACE FUNCTION log_soft_delete() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Log to audit_logs table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
      VALUES (
        auth.uid(),
        'SOFT_DELETE',
        TG_TABLE_NAME,
        NEW.id,
        row_to_json(OLD),
        row_to_json(NEW)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to tables with soft delete
DROP TRIGGER IF EXISTS trigger_bookings_soft_delete ON bookings;
CREATE TRIGGER trigger_bookings_soft_delete
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION log_soft_delete();

DROP TRIGGER IF EXISTS trigger_customers_soft_delete ON customers;
CREATE TRIGGER trigger_customers_soft_delete
  AFTER UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION log_soft_delete();

DROP TRIGGER IF EXISTS trigger_teams_soft_delete ON teams;
CREATE TRIGGER trigger_teams_soft_delete
  AFTER UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION log_soft_delete();
