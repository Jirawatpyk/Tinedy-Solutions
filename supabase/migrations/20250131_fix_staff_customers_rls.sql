-- ============================================================
-- Migration: Fix Staff Customers RLS Policy
-- Date: 2025-01-31
-- Description: แก้ไข RLS policy ของ customers table เพื่อให้ staff
--              สามารถเห็นข้อมูลลูกค้าจาก bookings ที่ assigned ให้ได้
-- ============================================================

-- ลบ policy เก่าที่ใช้ subquery
DROP POLICY IF EXISTS "Staff can view assigned customers" ON customers;

-- สร้าง policy ใหม่ที่ใช้ EXISTS แทน IN subquery
-- เพื่อให้ทำงานถูกต้องกับ JOIN queries
CREATE POLICY "Staff can view assigned customers"
ON customers FOR SELECT
TO authenticated
USING (
  -- Admin และ Manager เห็นทุกคน
  auth.jwt() ->> 'role' IN ('admin', 'manager')
  OR
  -- Staff เห็นเฉพาะลูกค้าที่มี booking ที่ assigned ให้ตัวเองหรือทีมของตัวเอง
  EXISTS (
    SELECT 1
    FROM bookings b
    WHERE b.customer_id = customers.id
    AND (
      -- Booking ที่ assigned ให้ staff คนนี้โดยตรง
      b.staff_id = auth.uid()
      OR
      -- Booking ที่ assigned ให้ทีมที่ staff คนนี้เป็นสมาชิก
      b.team_id IN (
        SELECT team_id
        FROM team_members
        WHERE staff_id = auth.uid()
        AND is_active = true
      )
    )
  )
);

-- Comment สำหรับอธิบาย policy
COMMENT ON POLICY "Staff can view assigned customers" ON customers IS
  'Staff สามารถดูข้อมูลลูกค้าที่มี booking assigned ให้ตัวเองหรือทีมของตัวเอง, Admin และ Manager ดูได้ทั้งหมด';
