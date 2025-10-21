-- Add attachments column to messages table
-- This will store array of attachment objects (images, files)

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance on attachments
CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN (attachments);

-- Comment on column
COMMENT ON COLUMN messages.attachments IS 'Array of attachment objects with structure: [{ type: "image" | "file", url: string, name: string, size: number, mimeType: string }]';
