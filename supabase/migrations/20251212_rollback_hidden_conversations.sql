-- Rollback Migration: Remove Hidden Conversations Table
-- Date: 2025-12-12
-- Purpose: Rollback the soft delete feature for chat conversations
-- Use this script if you need to revert the hidden_conversations feature
--
-- WARNING: This will permanently delete all hidden conversation records
-- Messages will NOT be affected (they were never deleted in soft delete)

-- =================================================================
-- 1. Remove from Realtime publication
-- =================================================================
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS hidden_conversations;

-- =================================================================
-- 2. Drop RLS Policies
-- =================================================================
DROP POLICY IF EXISTS "Users can view own hidden conversations" ON hidden_conversations;
DROP POLICY IF EXISTS "Users can hide conversations" ON hidden_conversations;
DROP POLICY IF EXISTS "Users can update own hidden conversations" ON hidden_conversations;
DROP POLICY IF EXISTS "Users can unhide conversations" ON hidden_conversations;

-- =================================================================
-- 3. Drop Indexes
-- =================================================================
DROP INDEX IF EXISTS idx_hidden_conversations_user_id;
DROP INDEX IF EXISTS idx_hidden_conversations_lookup;

-- =================================================================
-- 4. Drop Table
-- =================================================================
DROP TABLE IF EXISTS hidden_conversations;

-- =================================================================
-- Verification query (run after rollback)
-- =================================================================
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables
--   WHERE table_name = 'hidden_conversations'
-- ) as table_exists;
-- Expected result: false
