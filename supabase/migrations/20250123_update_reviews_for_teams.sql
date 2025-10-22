-- Update reviews table to support team ratings
-- Make staff_id nullable and add team_id

-- Make staff_id nullable (allow team-only reviews)
ALTER TABLE public.reviews
ALTER COLUMN staff_id DROP NOT NULL;

-- Add team_id column
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

-- Add index for team_id
CREATE INDEX IF NOT EXISTS idx_reviews_team_id ON public.reviews(team_id);

-- Add constraint: must have either staff_id or team_id (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'reviews_staff_or_team_check'
    ) THEN
        ALTER TABLE public.reviews
        ADD CONSTRAINT reviews_staff_or_team_check
        CHECK (staff_id IS NOT NULL OR team_id IS NOT NULL);
    END IF;
END $$;

-- Update RLS policies to support team reviews

-- Drop old staff-only policy
DROP POLICY IF EXISTS "Staff can view their own reviews" ON public.reviews;

-- New policy: Staff can view their own reviews OR reviews for their teams
CREATE POLICY "Staff can view their own reviews"
    ON public.reviews
    FOR SELECT
    TO authenticated
    USING (
        staff_id = auth.uid()
        OR
        -- Staff can view reviews for teams they belong to
        team_id IN (
            SELECT team_id FROM public.team_members
            WHERE staff_id = auth.uid()
            AND is_active = true
        )
        OR
        -- Admin can view all reviews
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add comment
COMMENT ON COLUMN public.reviews.team_id IS 'Reference to team being reviewed (for team-based bookings)';
COMMENT ON CONSTRAINT reviews_staff_or_team_check ON public.reviews IS 'Ensure review is for either a staff member or a team';
