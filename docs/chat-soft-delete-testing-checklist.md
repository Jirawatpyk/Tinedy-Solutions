# Chat Soft Delete Testing Checklist

## รายละเอียดการเปลี่ยนแปลง

**วันที่:** 2025-12-12
**Feature:** Chat Soft Delete (Per-User Deletion)

### ปัญหาเดิม
เมื่อ User A ลบ conversation กับ User B → Messages หายไปทั้งคู่

### Solution
ใช้ `hidden_conversations` table เพื่อซ่อน conversation สำหรับ user ที่ต้องการลบ โดยไม่กระทบ messages ของอีกฝ่าย

---

## Pre-Deployment Checklist

### Database Migration
- [ ] Run migration: `20251212_add_hidden_conversations.sql`
- [ ] Verify table created: `hidden_conversations`
- [ ] Verify RLS policies enabled
- [ ] Verify indexes created

```sql
-- Verification query
SELECT
  table_name,
  (SELECT count(*) FROM pg_policies WHERE tablename = 'hidden_conversations') as policy_count
FROM information_schema.tables
WHERE table_name = 'hidden_conversations';
```

---

## Testing Scenarios

### Scenario 1: Basic Soft Delete
**Steps:**
1. Login as User A (Admin)
2. Send message to User B
3. User B sends reply
4. User A clicks delete button on conversation
5. Confirm deletion

**Expected Results:**
- [ ] User A: Conversation disappears from list
- [ ] User A: Cannot see messages anymore
- [ ] User B: Still sees conversation in list
- [ ] User B: Still sees all messages
- [ ] Database: `hidden_conversations` record created for User A

### Scenario 2: New Message After Delete
**Steps:**
1. User A deletes conversation with User B (Scenario 1 completed)
2. User B sends NEW message to User A

**Expected Results:**
- [ ] User A: Conversation reappears in list
- [ ] User A: Only sees NEW message (messages before delete are hidden)
- [ ] Realtime subscription works correctly

### Scenario 3: Re-Delete After New Message
**Steps:**
1. Scenario 2 completed (User A sees new conversation)
2. User A deletes conversation again

**Expected Results:**
- [ ] User A: Conversation disappears again
- [ ] User A: Both old AND new messages are hidden
- [ ] Database: `hidden_conversations.hidden_before_timestamp` updated

### Scenario 4: Both Users Delete
**Steps:**
1. User A deletes conversation with User B
2. User B also deletes conversation with User A

**Expected Results:**
- [ ] Both users: Conversation not visible
- [ ] Both users: No messages visible
- [ ] Messages still exist in database (not deleted)
- [ ] Files in storage still exist

### Scenario 5: Load More Messages (Pagination)
**Steps:**
1. Create conversation with 100+ messages
2. User A deletes conversation
3. User B sends new message
4. User A opens conversation (sees new message)
5. User A scrolls up to load more messages

**Expected Results:**
- [ ] Only messages AFTER hidden_before_timestamp are loaded
- [ ] Old messages (before delete) are NOT loaded

### Scenario 6: Attachments
**Steps:**
1. User A sends message with image to User B
2. User A deletes conversation
3. Check storage bucket

**Expected Results:**
- [ ] Image file still exists in storage (not deleted)
- [ ] User B can still view the image

---

## Edge Cases

### Edge Case 1: Delete Empty Conversation

- [ ] No errors when deleting conversation with no messages
- [ ] Uses current timestamp (no special null handling needed)

### Edge Case 2: Multiple Quick Deletions

- [ ] Rapidly deleting multiple conversations works correctly
- [ ] No race conditions (protected by `deletingConversationsRef`)

### Edge Case 3: Concurrent Access

- [ ] User A deletes while User B is typing
- [ ] No errors, messages sent correctly

### Edge Case 4: Cross-Tab/Device Sync

- [ ] Delete in Tab 1 reflects in Tab 2 via realtime subscription
- [ ] Hidden conversations sync correctly across devices

---

## Performance Checklist

- [ ] Conversation list loads quickly (< 1 second)
- [ ] Hidden conversations are filtered client-side efficiently using Map lookup
- [ ] Timestamp comparison is reliable and performant

---

## Rollback Plan

หากมีปัญหา สามารถ rollback ได้โดย:

1. **Drop table (if needed):**
```sql
DROP TABLE IF EXISTS hidden_conversations;
```

2. **Revert code:** git revert to previous commit

3. **Messages:** ยังคงอยู่ครบ (ไม่มี data loss)

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |

---

## Files Changed

1. `supabase/migrations/20251212_add_hidden_conversations.sql` - New migration
   - Uses `hidden_before_timestamp` (TIMESTAMPTZ) instead of message_id
   - RLS policies for SELECT/INSERT/UPDATE/DELETE
   - Realtime enabled for cross-tab sync

2. `src/types/chat.ts` - Added HiddenConversation type
   - `hidden_before_timestamp: string` for reliable timestamp comparison

3. `src/hooks/use-chat.ts` - Implemented soft delete logic
   - Added `hiddenConversations` state (Map<string, string>)
   - Added `hiddenConversationsRef` for realtime access
   - Added `deletingConversationsRef` for race condition prevention
   - Modified `deleteConversation` to use soft delete with timestamp
   - Modified `loadConversations` to filter hidden by timestamp
   - Modified `fetchMessages` to filter hidden messages by timestamp
   - Modified `loadMoreMessages` to respect hidden boundary
   - Modified `updateConversationLocally` to handle unhiding
   - Added realtime subscription for hidden_conversations table
