-- ============================================================================
-- Create Database Function to Delete User (Bypass RLS)
-- Description: สร้าง function ที่ bypass RLS เพื่อลบ user ได้โดยตรง
-- ============================================================================

-- สร้าง function สำหรับลบ user (SECURITY DEFINER = bypass RLS)
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_teams TEXT[];
  bookings_count INT;
  result JSON;
BEGIN
  -- 1. ตรวจสอบว่าเป็น team lead หรือไม่
  SELECT ARRAY_AGG(name)
  INTO deleted_teams
  FROM teams
  WHERE team_lead_id = user_id;

  -- 2. ลบ team_lead_id ออกจาก teams
  IF deleted_teams IS NOT NULL THEN
    UPDATE teams
    SET team_lead_id = NULL
    WHERE team_lead_id = user_id;

    RAISE NOTICE 'Removed user as team lead from: %', deleted_teams;
  END IF;

  -- 3. นับจำนวน bookings
  SELECT COUNT(*)
  INTO bookings_count
  FROM bookings
  WHERE staff_id = user_id;

  IF bookings_count > 0 THEN
    RAISE NOTICE 'User has % bookings', bookings_count;
  END IF;

  -- 4. ลบ profile (จะ trigger cascade delete ไปยัง tables อื่นๆ ที่มี FK)
  DELETE FROM profiles WHERE id = user_id;

  RAISE NOTICE 'Deleted profile for user: %', user_id;

  -- 5. สร้าง result JSON
  result := json_build_object(
    'success', true,
    'message', 'User deleted successfully',
    'user_id', user_id,
    'removed_from_teams', COALESCE(deleted_teams, ARRAY[]::TEXT[]),
    'bookings_count', bookings_count
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting user: %', SQLERRM;
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', user_id
    );
    RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.delete_user_completely(UUID) TO authenticated;

-- Comment
COMMENT ON FUNCTION public.delete_user_completely(UUID) IS
'Delete user completely (profiles + cascade). SECURITY DEFINER bypasses RLS. Then manually delete from auth.users via Dashboard or Edge Function.';

-- ============================================================================
-- Usage Example
-- ============================================================================

-- เรียกใช้ function:
-- SELECT public.delete_user_completely('0a8c0ebb-3039-46de-a51e-d06867bdffc21');

-- หลังจากนั้นต้องลบจาก auth.users ด้วยตนเอง:
-- 1. ใช้ Supabase Dashboard → Authentication → Users → Delete
-- 2. หรือใช้ Edge Function เรียก supabase.auth.admin.deleteUser(userId)
