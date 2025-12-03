-- Quick check: Verify realtime setup status
-- Run this in Supabase SQL Editor to see current state

-- 1. Check replica identity
SELECT
  c.relname AS table_name,
  CASE c.relreplident
    WHEN 'd' THEN '❌ default (primary key only)'
    WHEN 'n' THEN '❌ nothing'
    WHEN 'f' THEN '✅ full (all columns)'
    WHEN 'i' THEN '⚠️  index'
  END AS replica_identity,
  CASE
    WHEN c.relreplident = 'f' THEN 'READY FOR REALTIME'
    ELSE 'NOT READY - Need to set FULL'
  END as status
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
    ELSE '❌ bookings is NOT in publication'
  END as publication_status;

-- 3. Check RLS policies
SELECT
  policyname,
  cmd,
  CASE
    WHEN roles::text = '{authenticated}' THEN 'authenticated users'
    WHEN roles::text = '{anon}' THEN 'anonymous users'
    ELSE roles::text
  END as applies_to
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'bookings'
ORDER BY cmd, policyname;
