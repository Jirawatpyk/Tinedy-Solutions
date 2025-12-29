import { useState, type KeyboardEvent, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { Send, Paperclip, X } from 'lucide-react'

interface MessageInputProps {
  onSendMessage: (message: string, file?: File) => void
  disabled?: boolean
}

export interface MessageInputHandle {
  focus: () => void
}

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  ({ onSendMessage, disabled = false }, ref) => {
  const [message, setMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Expose focus method to parent component
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus()
    },
  }))

  const handleSend = () => {
    if ((message.trim() || selectedFile) && !disabled) {
      onSendMessage(message, selectedFile || undefined)
      setMessage('')
      setSelectedFile(null)
      // Auto focus back to textarea after sending
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    }
  }

  // Auto focus on mount and when disabled changes
  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus()
    }
  }, [disabled])

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
          <span className="text-xs text-muted-foreground">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setSelectedFile(null)}
            disabled={disabled}
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
          aria-label="Attach file"
        />

        {/* Attach button */}
        <SimpleTooltip content="Attach file" side="top">
          <Button
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="h-[60px] w-[60px]"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        </SimpleTooltip>

        <Textarea
          ref={textareaRef}
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
})

MessageInput.displayName = 'MessageInput'
