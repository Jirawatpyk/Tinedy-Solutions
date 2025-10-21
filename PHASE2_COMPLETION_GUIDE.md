# Phase 2: File Attachments - Final Completion Guide

**Current Progress**: 90% Complete
**Remaining**: Update MessageInput + Update Chat Page + Migrations + Testing
**Estimated Time**: 30-45 minutes

---

## ✅ Completed (90%)

1. ✅ Database schema SQL
2. ✅ Storage bucket SQL
3. ✅ TypeScript types
4. ✅ File upload utilities (`chat-storage.ts`)
5. ✅ useChat hook with file support
6. ✅ FileAttachment component
7. ✅ ImageLightbox component
8. ✅ MessageBubble updated (displays attachments)
9. ✅ ChatArea updated (lightbox integration)

---

## ⏳ Remaining Tasks (10%)

### Task 1: Update MessageInput Component (10 min)

**File**: `src/components/chat/message-input.tsx`

**Add file picker**:

```typescript
import { useState, type KeyboardEvent, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Paperclip, X } from 'lucide-react'

interface MessageInputProps {
  onSendMessage: (message: string, file?: File) => void
  disabled?: boolean
}

export function MessageInput({ onSendMessage, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if ((message.trim() || selectedFile) && !disabled) {
      onSendMessage(message, selectedFile || undefined)
      setMessage('')
      setSelectedFile(null)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  return (
    <div className="border-t p-4 bg-white">
      {/* File preview */}
      {selectedFile && (
        <div className="mb-2 flex items-center gap-2 p-2 bg-gray-100 rounded">
          <Paperclip className="h-4 w-4" />
          <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setSelectedFile(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex gap-2 items-end">
        {/* File input (hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />

        {/* Attach button */}
        <Button
          size="icon"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="h-[60px] w-[60px]"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Shift+Enter for new line)"
          disabled={disabled}
          className="min-h-[60px] max-h-[120px] resize-none"
          rows={2}
        />

        <Button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && !selectedFile)}
          size="icon"
          className="h-[60px] w-[60px] bg-tinedy-blue hover:bg-tinedy-blue/90"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  )
}
```

---

### Task 2: Update Chat Page (5 min)

**File**: `src/pages/admin/chat.tsx`

**Update handleSendMessage**:

```typescript
const handleSendMessage = async (message: string, file?: File) => {
  if (!selectedUser || !user) return

  try {
    if (file) {
      await sendMessageWithFile(selectedUser.id, message, file)
    } else {
      await sendMessage(selectedUser.id, message)
    }
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to send message. Please try again.',
      variant: 'destructive',
    })
  }
}
```

---

### Task 3: Run Database Migrations (5 min)

**In Supabase Dashboard** (https://supabase.com):

1. Go to SQL Editor
2. Run `add_attachments_to_messages.sql`:
   ```sql
   ALTER TABLE messages
   ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

   CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN (attachments);
   ```

3. Run `setup_chat_storage.sql`:
   ```sql
   -- Create storage bucket
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('chat-attachments', 'chat-attachments', false)
   ON CONFLICT (id) DO NOTHING;

   -- RLS policies...
   (copy from file)
   ```

---

### Task 4: Build & Test (10 min)

```bash
npm run build
# Should succeed with no errors

npm run dev
# Test in browser:
# 1. Send text message
# 2. Send image (click paperclip)
# 3. View image in lightbox
# 4. Send PDF file
# 5. Download file
```

---

## 🎉 When Complete

Phase 2 will be 100% done! Users can:
- ✅ Send text messages
- ✅ Upload and send images (JPEG, PNG, GIF, WebP)
- ✅ Upload and send files (PDF, TXT)
- ✅ View images inline
- ✅ Click images to view full-screen
- ✅ Download files
- ✅ Real-time delivery of attachments

---

## Next: Phase 2.2 - Toast Notifications (Optional)

Simple enhancement to add in-app notifications when receiving messages.

**Estimated Time**: 30 minutes

---

**Last Updated**: October 21, 2025
