-- Copy ทั้งหมดด้านล่างนี้ไปรันใน Supabase Dashboard > SQL Editor

-- Step 1: Drop old constraint if exists
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Step 2: Add new constraint with CASCADE DELETE
ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Step 3: Verify constraint was created
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'profiles'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Expected result: delete_rule should be 'CASCADE'
