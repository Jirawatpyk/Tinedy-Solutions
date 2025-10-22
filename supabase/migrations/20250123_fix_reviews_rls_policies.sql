-- Fix RLS policies for reviews table to prevent infinite recursion
-- This happens when policies reference the same table they're protecting

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Staff can view their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can view their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can create reviews for completed bookings" ON public.reviews;
DROP POLICY IF EXISTS "Customers can update their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can delete their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admin can manage all reviews" ON public.reviews;

-- Create new non-recursive policies

-- 1. Admin full access (simplest, no recursion)
CREATE POLICY "Admin can manage all reviews"
    ON public.reviews
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 2. Staff can view their own reviews (no recursion)
CREATE POLICY "Staff can view their reviews"
    ON public.reviews
    FOR SELECT
    TO authenticated
    USING (
        -- Direct staff reviews
        staff_id = auth.uid()
        OR
        -- Team reviews where user is a member
        team_id IN (
            SELECT team_id
            FROM public.team_members
            WHERE staff_id = auth.uid()
            AND is_active = true
        )
    );

-- 3. Allow INSERT for completed bookings (admin only for now, to avoid recursion)
CREATE POLICY "Allow review creation"
    ON public.reviews
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Must be admin
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 4. Allow UPDATE (admin only for now)
CREATE POLICY "Allow review updates"
    ON public.reviews
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 5. Allow DELETE (admin only)
CREATE POLICY "Allow review deletion"
    ON public.reviews
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
