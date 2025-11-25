-- ============================================================================
-- ADD DELETE POLICY FOR MESSAGES TABLE
-- ============================================================================
-- วันที่: 2025-01-25
-- วัตถุประสงค์: อนุญาตให้ผู้ใช้สามารถลบข้อความของตัวเองได้
-- ============================================================================

-- Policy: Users can delete their own messages (sent or received)
-- ผู้ใช้สามารถลบข้อความที่ตัวเองส่งหรือได้รับ
CREATE POLICY "Users can delete their messages"
ON messages FOR DELETE
TO authenticated
USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);
