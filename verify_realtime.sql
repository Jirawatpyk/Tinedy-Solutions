-- Verification Query: Check Realtime Setup
-- Copy and run this in Supabase SQL Editor

-- 1. Check replica identity
SELECT
  c.relname AS table_name,
  CASE c.relreplident
    WHEN 'd' THEN '❌ default (primary key only) - NOT WORKING'
    WHEN 'n' THEN '❌ nothing - NOT WORKING'
    WHEN 'f' THEN '✅ full (all columns) - WORKING'
    WHEN 'i' THEN '⚠️  index - MAY WORK'
  END AS replica_identity_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'bookings';

-- 2. Check if in publication
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
    ) THEN '✅ bookings is in supabase_realtime publication'
    ELSE '❌ bookings is NOT in publication - RUN MIGRATION!'
  END as publication_status;

-- 3. If the above shows NOT WORKING, run this fix:
-- ALTER TABLE bookings REPLICA IDENTITY FULL;
-- ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
