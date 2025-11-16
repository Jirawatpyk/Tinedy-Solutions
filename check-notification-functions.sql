-- Get all notification-related functions
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname LIKE '%notify%'
ORDER BY proname;
