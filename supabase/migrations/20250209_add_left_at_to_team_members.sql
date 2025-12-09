-- Migration: Add left_at column to team_members for soft delete
-- Purpose: Preserve historical revenue data when staff leaves a team
--
-- Problem: When staff is removed from team (hard delete), their revenue history is lost
-- Solution: Use soft delete with left_at timestamp instead of hard delete
--
-- Revenue calculation logic:
-- - Staff earns from bookings created between joined_at and left_at (or now if still active)
-- - Active members: left_at IS NULL
-- - Former members: left_at IS NOT NULL (but still included in revenue calculations)

-- Step 1: Add left_at column
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS left_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Step 2: Add index for efficient filtering
-- Most queries will filter by left_at IS NULL for active members
CREATE INDEX IF NOT EXISTS idx_team_members_left_at
ON team_members(staff_id, team_id, left_at);

-- Step 3: Create partial index for active members (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_team_members_active
ON team_members(team_id, staff_id)
WHERE left_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN team_members.left_at IS 'Timestamp when staff left the team. NULL = still active member. Used for soft delete to preserve revenue history.';
