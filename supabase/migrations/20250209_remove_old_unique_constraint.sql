-- ============================================================================
-- Migration: Remove Old Unique Constraint on team_members
-- ============================================================================
-- Purpose: Allow staff to have multiple membership records for the same team
-- This supports the re-join feature where each join/leave period is a separate record
--
-- Problem: The old constraint `team_members_team_id_staff_id_key` prevents
-- creating new records when staff re-joins a team they previously left
--
-- Solution:
-- 1. Drop the old unique constraint (team_id, staff_id)
-- 2. Keep the partial unique index (left_at IS NULL) that was created earlier
--    This still prevents duplicate ACTIVE members, but allows historical records
-- ============================================================================

-- Drop the old unique constraint that blocks re-join
-- This constraint was created when the table was first made
ALTER TABLE team_members
DROP CONSTRAINT IF EXISTS team_members_team_id_staff_id_key;

-- Also try dropping as index (in case it was created differently)
DROP INDEX IF EXISTS team_members_team_id_staff_id_key;

-- Verify that our partial unique index exists (created in previous migration)
-- This allows multiple records per (team_id, staff_id) but only ONE where left_at IS NULL
-- If it doesn't exist, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_team_members_unique_active'
  ) THEN
    CREATE UNIQUE INDEX idx_team_members_unique_active
    ON team_members(team_id, staff_id)
    WHERE left_at IS NULL;

    COMMENT ON INDEX idx_team_members_unique_active IS
    'Prevents duplicate active memberships. Staff can have multiple historical records (with left_at timestamps) but only one active membership (left_at IS NULL) per team.';
  END IF;
END $$;

-- Add comment explaining the new constraint design
COMMENT ON TABLE team_members IS
'Team membership records. Staff can have multiple records for same team (one per join/leave period). Only ONE record per (team_id, staff_id) can have left_at IS NULL (active membership).';
