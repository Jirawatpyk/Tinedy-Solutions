-- Verification Query: Check Realtime Setup
-- Run this query to diagnose realtime issues

-- 1. Check if bookings table is in realtime publication
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'bookings';

-- 2. Check replica identity setting
SELECT
  c.relname AS table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'default (primary key)'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full (all columns)'
    WHEN 'i' THEN 'index'
  END AS replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'bookings';

-- 3. Check RLS policies that might block realtime
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'bookings';

-- 4. Check if realtime is enabled globally
SELECT name, setting
FROM pg_settings
WHERE name = 'wal_level';
