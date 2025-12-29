-- Migration: Add Hidden Conversations for Per-User Chat Deletion (Soft Delete)
-- Date: 2025-12-12
-- Purpose: Allow users to "delete" conversations without affecting other user's messages
--
-- Problem: When User A deletes conversation with User B, both users lose messages
-- Solution: Instead of deleting messages, record which conversations are hidden for each user

-- =================================================================
-- 1. Create hidden_conversations table
-- =================================================================
CREATE TABLE IF NOT EXISTS hidden_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  other_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Messages created BEFORE OR AT this timestamp will be hidden for this user
  -- If other user sends new message AFTER this, conversation will reappear
  -- Using timestamp instead of message_id for reliable comparison
  hidden_before_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each user can only hide a conversation with another user once (upsert on conflict)
  UNIQUE(user_id, other_user_id)
);

-- Add comment
COMMENT ON TABLE hidden_conversations IS 'Tracks which conversations are hidden (soft deleted) for each user';
COMMENT ON COLUMN hidden_conversations.hidden_before_timestamp IS 'Messages created at or before this timestamp are hidden. New messages after this will make conversation reappear';

-- =================================================================
-- 2. Create indexes for performance
-- =================================================================
CREATE INDEX IF NOT EXISTS idx_hidden_conversations_user_id
  ON hidden_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_hidden_conversations_lookup
  ON hidden_conversations(user_id, other_user_id);

-- =================================================================
-- 3. Enable Row Level Security
-- =================================================================
ALTER TABLE hidden_conversations ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- 4. RLS Policies
-- =================================================================

-- Users can only view their own hidden conversations
CREATE POLICY "Users can view own hidden conversations"
  ON hidden_conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can hide their own conversations
CREATE POLICY "Users can hide conversations"
  ON hidden_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own hidden conversations (for re-hiding with new message_id)
CREATE POLICY "Users can update own hidden conversations"
  ON hidden_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can unhide (delete the record to show conversation again)
CREATE POLICY "Users can unhide conversations"
  ON hidden_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- =================================================================
-- 5. Enable Realtime for hidden_conversations (optional)
-- =================================================================
-- This allows the UI to react when a conversation is hidden/unhidden
ALTER PUBLICATION supabase_realtime ADD TABLE hidden_conversations;

-- =================================================================
-- Verification query (run after migration)
-- =================================================================
-- SELECT
--   table_name,
--   (SELECT count(*) FROM pg_policies WHERE tablename = 'hidden_conversations') as policy_count
-- FROM information_schema.tables
-- WHERE table_name = 'hidden_conversations';
