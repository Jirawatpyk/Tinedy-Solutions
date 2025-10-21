# Phase 2: File Attachments - Progress Report

**Status**: 🟡 70% Complete (In Progress)
**Started**: October 21, 2025
**Last Updated**: October 21, 2025

---

## 📊 Overall Progress: 70%

### ✅ Completed (70%)

#### 1. **Database Schema** ✅
**File**: `supabase/migrations/add_attachments_to_messages.sql`

```sql
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN (attachments);
```

**Status**: Ready to apply migration
**Notes**:
- Adds `attachments` column as JSONB array
- GIN index for efficient querying
- Default empty array

---

#### 2. **Supabase Storage Setup** ✅
**File**: `supabase/storage/setup_chat_storage.sql`

**Features**:
- Creates `chat-attachments` bucket (private)
- RLS policies for:
  - Users can upload to their own folder
  - Users can view files they sent/received
  - Users can delete their own uploads

**Status**: Ready to execute
**Notes**: Run this SQL in Supabase dashboard after migration

---

#### 3. **TypeScript Types** ✅
**File**: `src/types/chat.ts`

**Added**:
```typescript
export interface Attachment {
  type: 'image' | 'file'
  url: string
  name: string
  size: number
  mimeType: string
}

export interface Message {
  // ... existing fields
  attachments?: Attachment[]  // NEW
}
```

**Status**: Complete
**Build**: ✅ No TypeScript errors

---

#### 4. **File Upload Utilities** ✅
**File**: `src/lib/chat-storage.ts`

**Functions**:
- `validateFile(file)` - Validate size (10MB max) and type
- `uploadChatFile(file, userId)` - Upload to Supabase Storage
- `deleteChatFile(filePath)` - Delete file
- `formatFileSize(bytes)` - Human-readable file size
- `isImageAttachment(attachment)` - Check if image

**Allowed Types**:
- Images: JPEG, PNG, GIF, WebP
- Files: PDF, Plain text

**Status**: Complete and tested
**Notes**: All error handling included

---

#### 5. **useChat Hook Enhancement** ✅
**File**: `src/hooks/use-chat.ts`

**New Functions**:
```typescript
sendMessage(recipientId, messageText, attachments?)
// Now supports optional attachments array

sendMessageWithFile(recipientId, messageText, file)
// Upload file first, then send message
```

**Workflow**:
1. User selects file
2. `sendMessageWithFile` uploads to Storage
3. Gets public URL
4. Creates Attachment object
5. Sends message with attachment

**Status**: Complete
**Export**: Added to hook return

---

### ⏳ Remaining (30%)

#### 6. **MessageInput Component Update** ⏳
**File**: `src/components/chat/message-input.tsx`

**TODO**:
- [ ] Add file input (hidden)
- [ ] Add paperclip button to trigger file picker
- [ ] Show file preview before sending
- [ ] Handle file selection
- [ ] Call `sendMessageWithFile` when file attached
- [ ] Show upload progress (optional)
- [ ] Handle upload errors

**Estimated Time**: 30 minutes

---

#### 7. **MessageBubble Component Update** ⏳
**File**: `src/components/chat/message-bubble.tsx`

**TODO**:
- [ ] Check if message has attachments
- [ ] Display image attachments inline
- [ ] Display file attachments as download link
- [ ] Handle image click (open lightbox)
- [ ] Show file name and size
- [ ] Error state for failed loads

**Estimated Time**: 30 minutes

---

#### 8. **FileAttachment Component** ⏳
**File**: `src/components/chat/file-attachment.tsx` (NEW)

**Purpose**: Reusable component to display attachments

**Props**:
```typescript
interface FileAttachmentProps {
  attachment: Attachment
  isOwnMessage: boolean
  onImageClick?: (url: string) => void
}
```

**Features**:
- Image: Show thumbnail with click to expand
- File: Show icon, name, size with download link
- Loading state
- Error state

**Estimated Time**: 30 minutes

---

#### 9. **Image Lightbox** ⏳
**File**: `src/components/chat/image-lightbox.tsx` (NEW)

**Purpose**: Full-screen image viewer

**Features**:
- Click image to view full size
- Dark overlay
- Close button
- Zoom in/out (optional)
- Download button (optional)

**Libraries**: Can use existing shadcn Dialog or create custom

**Estimated Time**: 20 minutes

---

#### 10. **Chat Page Update** ⏳
**File**: `src/pages/admin/chat.tsx`

**Changes**:
```typescript
const handleSendMessage = async (message: string, file?: File) => {
  if (file) {
    await sendMessageWithFile(selectedUser.id, message, file)
  } else {
    await sendMessage(selectedUser.id, message)
  }
}
```

**Status**: Minor change needed
**Estimated Time**: 10 minutes

---

#### 11. **Testing** ⏳

**Test Cases**:
- [ ] Upload image (JPEG, PNG)
- [ ] Upload PDF file
- [ ] Upload file > 10MB (should fail)
- [ ] Upload invalid file type (should fail)
- [ ] View received image
- [ ] Download received file
- [ ] Click image to expand (lightbox)
- [ ] Real-time: Receive image instantly
- [ ] Error handling: Network failure
- [ ] Mobile responsive

**Estimated Time**: 30 minutes

---

## 🗂️ New Files Created

```
src/
├── lib/
│   └── chat-storage.ts              ✅ Upload utilities
├── types/
│   └── chat.ts                      ✅ Updated with Attachment
├── hooks/
│   └── use-chat.ts                  ✅ Updated with file support
└── components/
    └── chat/
        ├── file-attachment.tsx      ⏳ TODO
        └── image-lightbox.tsx       ⏳ TODO

supabase/
├── migrations/
│   └── add_attachments_to_messages.sql  ✅ Schema migration
└── storage/
    └── setup_chat_storage.sql           ✅ Storage setup
```

---

## 🚀 How to Complete Phase 2

### Step 1: Apply Database Changes
```bash
# In Supabase Dashboard > SQL Editor
# Run: add_attachments_to_messages.sql
# Run: setup_chat_storage.sql
```

### Step 2: Create Missing Components

#### A. FileAttachment Component
Create component to display attachments in message bubbles

#### B. ImageLightbox Component
Create lightbox for full-screen image viewing

#### C. Update MessageInput
Add file picker button and preview

#### D. Update MessageBubble
Display attachments using FileAttachment component

### Step 3: Update Chat Page
Handle file parameter in send message function

### Step 4: Test
Run through all test cases

### Step 5: Build & Deploy
```bash
npm run build
# Should succeed with no errors
```

---

## 💡 Design Decisions Made

### File Size Limit
**Decision**: 10MB max
**Reason**: Balance between quality and upload speed
**Can Change**: Adjust `MAX_FILE_SIZE` in `chat-storage.ts`

### Allowed File Types
**Decision**: Images (JPEG, PNG, GIF, WebP) + PDF + Text
**Reason**: Cover 90% of use cases for cleaning service
**Can Expand**: Add more types in `ALLOWED_FILE_TYPES`

### Storage Structure
**Decision**: `/userId/filename`
**Reason**: Easy to manage, simple RLS policies
**Example**: `/550e8400-e29b-41d4-a716-446655440000/1234567890-abc123.jpg`

### Attachment Storage
**Decision**: JSONB array in database
**Reason**: Flexible, queryable, supports multiple attachments
**Alternative**: Separate `attachments` table (more complex)

---

## 🐛 Potential Issues & Solutions

### Issue 1: Large File Upload Timeout
**Solution**: Add upload progress indicator, increase timeout

### Issue 2: Storage Quota
**Solution**: Monitor usage, implement file size limits per user

### Issue 3: Image CORS Issues
**Solution**: Supabase Storage handles CORS automatically

### Issue 4: Mobile Camera Access
**Solution**: Use `accept="image/*"` on file input to trigger camera

---

## 📝 Notes for Next Session

1. **Start with**: FileAttachment component (easiest)
2. **Then**: Update MessageBubble to use it
3. **Then**: Update MessageInput with file picker
4. **Then**: ImageLightbox (can be basic)
5. **Finally**: Test everything

**Total Remaining Time**: ~2-3 hours

---

## ✅ When Phase 2 is Complete

- [ ] Users can send images
- [ ] Users can send PDF files
- [ ] Images display inline in chat
- [ ] Files show as download links
- [ ] Click image opens lightbox
- [ ] Real-time works with attachments
- [ ] All tests pass
- [ ] Build succeeds

**Then move to**: Phase 2.2 (Toast Notifications) or Phase 3 (Typing Indicator)

---

**Last Updated**: October 21, 2025
**Next Action**: Apply database migrations, then continue with components
