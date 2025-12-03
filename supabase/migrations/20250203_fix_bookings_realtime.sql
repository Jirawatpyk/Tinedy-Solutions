-- Fix Bookings Realtime Subscription
-- This migration ensures realtime works properly for bookings table

DO $$
BEGIN
  -- Step 1: Ensure publication exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
    RAISE NOTICE 'Created supabase_realtime publication';
  END IF;

  -- Step 2: Add bookings table to publication (idempotent)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
    RAISE NOTICE 'Added bookings table to realtime publication';
  ELSE
    RAISE NOTICE 'Bookings table already in realtime publication';
  END IF;

  -- Step 3: Set replica identity to FULL
  -- This is CRITICAL for realtime to send row-level changes
  -- Without this, realtime subscription will fail with CHANNEL_ERROR
  ALTER TABLE bookings REPLICA IDENTITY FULL;
  RAISE NOTICE 'Set bookings table replica identity to FULL';

END $$;

-- Verification: Check the setup
DO $$
DECLARE
  pub_exists BOOLEAN;
  table_in_pub BOOLEAN;
  replica_id TEXT;
BEGIN
  -- Check publication
  SELECT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) INTO pub_exists;

  -- Check table in publication
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) INTO table_in_pub;

  -- Check replica identity
  SELECT CASE c.relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END INTO replica_id
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'bookings';

  RAISE NOTICE '=== Realtime Setup Verification ===';
  RAISE NOTICE 'Publication exists: %', pub_exists;
  RAISE NOTICE 'Bookings in publication: %', table_in_pub;
  RAISE NOTICE 'Replica identity: %', replica_id;

  IF pub_exists AND table_in_pub AND replica_id = 'full' THEN
    RAISE NOTICE '✅ All checks passed! Realtime should work now.';
  ELSE
    RAISE WARNING '❌ Setup incomplete. Check the logs above.';
  END IF;
END $$;
