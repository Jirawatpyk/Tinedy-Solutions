-- Add team_lead_id column to teams table
ALTER TABLE teams
ADD COLUMN team_lead_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_teams_team_lead_id ON teams(team_lead_id);

-- Add comment to explain the column
COMMENT ON COLUMN teams.team_lead_id IS 'The staff member who leads this team';
