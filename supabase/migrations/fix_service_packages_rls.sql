-- Fix service_packages RLS policies for Manager role
-- Enable RLS
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'service_packages')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON service_packages', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Allow all authenticated users to view service packages
CREATE POLICY "Authenticated users can view service packages"
  ON service_packages FOR SELECT
  TO authenticated
  USING (true);

-- Only admins and managers can modify service packages
CREATE POLICY "Admin and Manager can modify service packages"
  ON service_packages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Verify
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'service_packages'
ORDER BY cmd, policyname;

COMMENT ON TABLE service_packages IS 'Service packages with RLS supporting Admin and Manager access';
