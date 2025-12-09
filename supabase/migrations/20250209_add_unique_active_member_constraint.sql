-- ============================================================================
-- Migration: Add Unique Constraint for Active Team Members
-- ============================================================================
-- Purpose: Prevent duplicate active memberships (same staff in same team)
-- This is a partial unique index that only applies when left_at IS NULL
--
-- Benefits:
-- 1. Database-level protection against race conditions
-- 2. Prevents duplicate records when adding members concurrently
-- 3. Works with soft delete system (allows multiple records for re-joining)
--
-- Note: This allows the same staff to have multiple records for the same team
-- (one active with left_at = NULL, others with left_at = timestamp)
-- which supports the re-join member feature while preventing duplicates
-- ============================================================================

-- Drop existing index if it exists (for idempotency)
DROP INDEX IF EXISTS idx_team_members_unique_active;

-- Create partial unique index for active members only
-- This prevents the same staff from being active in the same team twice
CREATE UNIQUE INDEX idx_team_members_unique_active
ON team_members(team_id, staff_id)
WHERE left_at IS NULL;

-- Add comment to explain the index
COMMENT ON INDEX idx_team_members_unique_active IS
'Prevents duplicate active memberships. Staff can have multiple historical records (with left_at timestamps) but only one active membership (left_at IS NULL) per team.';
