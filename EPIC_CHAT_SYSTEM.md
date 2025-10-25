6# Epic: Chat System Development

**Status**: 🟡 In Progress
**Priority**: High
**Start Date**: October 21, 2025
**Estimated Completion**: 7-10 hours

---

## 📋 Overview

Developing a real-time 1-to-1 chat system for Tinedy CRM that allows Admin and Staff to communicate efficiently. Using WhatsApp-style 2-column layout with real-time messaging via Supabase subscriptions.

---

## 🎯 Goals

- ✅ Enable real-time messaging between Admin and Staff
- ✅ Provide unread message notifications
- ✅ Create intuitive WhatsApp-style UI
- ✅ Support message history and search
- ⏳ (Phase 2) Add file/image attachments
- ⏳ (Phase 3) Add typing indicators and online status

---

## 📊 Progress Tracker

### Phase 1: MVP - Core Messaging (In Progress)

| Task | Status | Notes |
|------|--------|-------|
| Setup project structure | ✅ Done | Created `/components/chat`, `/hooks`, `/types` |
| Create TypeScript types | ✅ Done | `src/types/chat.ts` |
| Create useChat hook | ✅ Done | `src/hooks/use-chat.ts` with real-time |
| Create UserList component | ✅ Done | `src/components/chat/user-list.tsx` |
| Create ChatArea component | ⏳ TODO | Message display + input |
| Create MessageBubble component | ⏳ TODO | Individual message styling |
| Create Chat page (Admin) | ⏳ TODO | `src/pages/admin/chat.tsx` |
| Create Chat page (Staff) | ⏳ TODO | Can reuse admin page |
| Add routes to App.tsx | ⏳ TODO | Replace "Coming soon" |
| Implement unread badge in sidebar | ⏳ TODO | Real-time count update |
| Test with multiple users | ⏳ TODO | End-to-end testing |
| Fix bugs and polish UI | ⏳ TODO | UX refinement |

### Phase 2: Enhancements (Planned)

| Task | Status | Notes |
|------|--------|-------|
| File attachments (images) | 📝 Planned | Critical for cleaning service |
| Toast notifications | 📝 Planned | In-app alerts |
| Search messages | 📝 Planned | Find specific conversation |
| Delete messages | 📝 Planned | User control |

### Phase 3: Advanced Features (Future)

| Task | Status | Notes |
|------|--------|-------|
| Typing indicator | 📝 Planned | "User is typing..." |
| Online/Offline status | 📝 Planned | Green/gray dots |
| Browser push notifications | 📝 Planned | Desktop alerts |
| Group chat | 📝 Planned | Team channels |

---

## 🏗️ Architecture

### Database Schema

**Already exists in Supabase:**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### File Structure

```
src/
├── types/
│   └── chat.ts                    ✅ DONE - Message, Profile, Conversation types
├── hooks/
│   └── use-chat.ts                ✅ DONE - Chat logic & real-time subscriptions
├── components/
│   └── chat/
│       ├── user-list.tsx          ✅ DONE - Conversation sidebar with search
│       ├── chat-area.tsx          ⏳ TODO - Message display area
│       ├── message-bubble.tsx     ⏳ TODO - Individual message
│       └── message-input.tsx      ⏳ TODO - Send message input
├── pages/
│   ├── admin/
│   │   └── chat.tsx               ⏳ TODO - Admin chat page
│   └── staff/
│       └── chat.tsx               ⏳ TODO - Staff chat page (or shared)
└── App.tsx                        ⏳ TODO - Update routes
```

---

## 🔧 Technical Details

### Key Features Implemented

#### 1. **useChat Hook** (`src/hooks/use-chat.ts`)

**Functionality:**
- ✅ Fetch all users for conversation list
- ✅ Fetch messages between two users
- ✅ Send new messages
- ✅ Mark messages as read
- ✅ Get unread counts (per user & total)
- ✅ Real-time subscriptions for new messages
- ✅ Auto-reload conversations on message changes

**Key Functions:**
```typescript
const {
  messages,              // Current conversation messages
  conversations,         // All conversations with last message
  selectedUser,          // Currently selected user
  setSelectedUser,       // Select a user to chat with
  isLoading,            // Loading state
  isSending,            // Sending message state
  sendMessage,          // Send a new message
  getTotalUnreadCount,  // For sidebar badge
  loadConversations,    // Refresh conversation list
} = useChat()
```

**Real-time Logic:**
- Subscribes to new messages for current user
- Auto-adds to message list if sender is selected
- Auto-marks as read when viewing
- Updates conversation list on any message change

#### 2. **UserList Component** (`src/components/chat/user-list.tsx`)

**Features:**
- ✅ Search users by name or email
- ✅ Display unread count badge (red circle)
- ✅ Show last message preview
- ✅ Show timestamp (relative time)
- ✅ Highlight selected conversation
- ✅ Role badge (Admin/Staff)
- ✅ Skeleton loading state

**Props:**
```typescript
interface UserListProps {
  conversations: Conversation[]    // All conversations
  selectedUserId: string | null    // Currently selected
  onSelectUser: (userId: string) => void  // Select handler
  isLoading: boolean              // Loading state
}
```

---

## 📝 TODO: Remaining Components

### 1. ChatArea Component

**File**: `src/components/chat/chat-area.tsx`

**Responsibilities:**
- Display all messages for selected user
- Scroll to bottom on new message
- Show "No messages yet" state
- Show selected user header with name and role
- Integrate MessageBubble and MessageInput

**Layout:**
```
┌────────────────────────────────────┐
│ 👤 John Doe (Staff)            [⋮] │ <- Header
├────────────────────────────────────┤
│                                    │
│  [MessageBubbles]                  │
│                                    │
│                                    │
├────────────────────────────────────┤
│ [MessageInput]                     │ <- Input at bottom
└────────────────────────────────────┘
```

### 2. MessageBubble Component

**File**: `src/components/chat/message-bubble.tsx`

**Responsibilities:**
- Display individual message
- Different styling for sent vs received
- Show timestamp
- Show read status (✓✓)
- Support long text wrapping

**Layout:**
```
Received (left-aligned):
┌──────────────────┐
│ Hi, how are you? │
│ 10:30 AM         │
└──────────────────┘

Sent (right-aligned):
          ┌───────────────────┐
          │ Good! Thanks      │
          │ 10:32 AM    ✓✓    │
          └───────────────────┘
```

### 3. MessageInput Component

**File**: `src/components/chat/message-input.tsx`

**Responsibilities:**
- Text input field
- Send button
- Handle Enter key to send
- Disable when sending
- Clear input after send
- (Future) File attachment button

**Layout:**
```
┌─────────────────────────────────────────┐
│ 📎  Type a message...        [Send] →  │
└─────────────────────────────────────────┘
```

### 4. Admin Chat Page

**File**: `src/pages/admin/chat.tsx`

**Responsibilities:**
- 2-column layout (UserList + ChatArea)
- Use useChat hook
- Handle user selection
- Responsive (collapse to 1 column on mobile)

**Layout:**
```
┌─────────────────────────────────────────┐
│  Chat                                   │
├─────────────┬───────────────────────────┤
│             │                           │
│  UserList   │      ChatArea            │
│   (30%)     │       (70%)              │
│             │                           │
└─────────────┴───────────────────────────┘
```

### 5. Staff Chat Page

**File**: `src/pages/staff/chat.tsx`

**Option 1**: Reuse admin chat page (recommended)
**Option 2**: Separate page with same logic

### 6. Update App.tsx

**Changes needed:**
- Replace "Coming soon" placeholder for `/admin/chat`
- Replace "Coming soon" placeholder for `/staff/chat`
- Import new chat pages

```typescript
// Before:
<Route path="chat" element={<div>Coming soon...</div>} />

// After:
<Route path="chat" element={<AdminChat />} />
```

### 7. Sidebar Badge

**File**: `src/components/layout/sidebar.tsx`

**Changes needed:**
- Add useChat hook to get total unread count
- Display badge next to "Chat" menu item
- Update in real-time

```typescript
<Link to="/admin/chat">
  <MessageSquare className="h-5 w-5" />
  <span>Chat</span>
  {unreadCount > 0 && (
    <Badge className="ml-auto bg-red-500">
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  )}
</Link>
```

---

## 🎨 Design System

### Colors (from Tailwind theme)

- **Primary**: `tinedy-blue` (#2e4057)
- **Secondary**: `tinedy-green` (#a8dadc)
- **Accent**: `tinedy-yellow` (#f1c40f)
- **Message bubbles**:
  - Sent: `bg-tinedy-blue text-white`
  - Received: `bg-gray-100 text-gray-900`

### Spacing

- Sidebar width: `30-35%` (desktop), `100%` (mobile)
- Chat area width: `65-70%` (desktop), `100%` (mobile)
- Message padding: `p-3`
- User list item padding: `p-4`

### Typography

- User names: `font-medium text-sm`
- Messages: `text-sm`
- Timestamps: `text-xs text-muted-foreground`
- Unread badge: `text-xs font-semibold`

---

## 🧪 Testing Checklist

### Manual Testing

- [ ] Send message from Admin to Staff
- [ ] Receive message in real-time (no refresh)
- [ ] Send message from Staff to Admin
- [ ] Verify unread count updates
- [ ] Verify mark as read when opening conversation
- [ ] Test search functionality
- [ ] Test message history loading
- [ ] Test with multiple simultaneous conversations
- [ ] Test on mobile responsive layout
- [ ] Test with long messages
- [ ] Test with empty conversation state

### Edge Cases

- [ ] No users available
- [ ] Network disconnection
- [ ] Message send failure
- [ ] Real-time subscription reconnection
- [ ] Multiple tabs open (same user)

---

## 🐛 Known Issues

None yet (development just started)

---

## 📚 Resources & References

### Dependencies Used

- **Supabase**: Database + Real-time subscriptions
- **React**: UI framework
- **Shadcn/ui**: Component library
- **Tailwind CSS**: Styling
- **Lucide Icons**: Icons
- **date-fns**: Date formatting

### Supabase Real-time Docs

- [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Channels](https://supabase.com/docs/guides/realtime/channels)

### Similar UX References

- WhatsApp Web
- Slack
- Microsoft Teams
- Messenger

---

## 🔄 Future Enhancements

### Phase 2: File Attachments

**Why**: Staff can send before/after photos of cleaning jobs

**Implementation**:
1. Add `attachments` column to messages table (JSONB)
2. Use Supabase Storage for file uploads
3. Update MessageBubble to display images
4. Add file picker button to MessageInput

**Schema change**:
```sql
ALTER TABLE messages ADD COLUMN attachments JSONB;
```

**Attachment object**:
```typescript
{
  type: 'image' | 'file',
  url: string,
  name: string,
  size: number
}
```

### Phase 3: Typing Indicator

**Implementation**:
- Use Supabase Presence API
- Broadcast "typing" event when user types
- Show "User is typing..." in chat header
- Clear after 3 seconds of inactivity

### Phase 4: Online Status

**Implementation**:
- Use Supabase Presence API
- Track online/offline status
- Show green/gray dot next to user avatar
- Update in real-time

### Phase 5: Group Chat

**Why**: Broadcast messages to entire team

**Implementation**:
1. Create `chat_rooms` table
2. Create `room_members` table
3. Update messages to support room_id
4. Create group chat UI

**Complexity**: High - requires significant schema changes

---

## 📞 Support & Questions

If you encounter issues or have questions:

1. Check this Epic document first
2. Review Supabase docs for real-time features
3. Test in browser console for debugging
4. Check network tab for failed requests

---

## ✅ Definition of Done

Phase 1 MVP is complete when:

- [x] All components created and working
- [ ] Messages send and receive in real-time
- [ ] Unread counts update correctly
- [ ] Sidebar badge shows total unread
- [ ] UI is responsive on mobile
- [ ] No TypeScript errors
- [ ] All manual tests pass
- [ ] Code is clean and documented

---

**Last Updated**: October 21, 2025
**Next Review**: After Phase 1 completion
