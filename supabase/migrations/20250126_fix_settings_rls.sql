-- Fix RLS policy for settings table to allow Edge Functions access
-- Disable RLS completely for settings table since it's business configuration

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can view settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Allow service role and admins to view settings" ON public.settings;

-- Disable RLS for settings table
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON TABLE public.settings IS 'Business settings - RLS disabled for Edge Functions access';
