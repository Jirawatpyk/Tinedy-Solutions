-- Final Fix: Enable Realtime for Bookings Table
-- This migration ensures realtime works properly

-- Step 1: Set replica identity to FULL (CRITICAL for realtime)
ALTER TABLE bookings REPLICA IDENTITY FULL;

-- Step 2: Ensure publication exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Step 3: Add bookings table to publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
END $$;

-- Verification
DO $$
DECLARE
  replica_id TEXT;
  in_pub BOOLEAN;
BEGIN
  -- Check replica identity
  SELECT CASE c.relreplident
    WHEN 'f' THEN 'full'
    ELSE 'not_full'
  END INTO replica_id
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'bookings';

  -- Check publication
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) INTO in_pub;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Realtime Setup Status';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Replica Identity: %', replica_id;
  RAISE NOTICE 'In Publication: %', in_pub;

  IF replica_id = 'full' AND in_pub THEN
    RAISE NOTICE '✅ SUCCESS - Realtime should work now!';
  ELSE
    RAISE WARNING '❌ FAILED - Check the settings above';
  END IF;

  RAISE NOTICE '========================================';
END $$;
