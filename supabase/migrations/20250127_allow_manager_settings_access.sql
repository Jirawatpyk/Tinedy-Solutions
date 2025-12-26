-- Allow Manager to access Settings
-- Update RLS policies to include 'manager' role

-- Re-enable RLS for settings table (in case it was disabled)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Allow service role and admins to view settings" ON public.settings;

-- Policy: Admins and Managers can read settings
CREATE POLICY "Admins and managers can view settings"
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Policy: Admins and Managers can update settings
CREATE POLICY "Admins and managers can update settings"
  ON public.settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Policy: Only admins can insert settings (managers should not create new settings rows)
CREATE POLICY "Admins can insert settings"
  ON public.settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE public.settings IS 'Business settings - Accessible by admin and manager roles';
