import { format } from 'date-fns'
import { Check, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/chat'
import { FileAttachment } from './file-attachment'

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
  onImageClick?: (url: string) => void
}

export function MessageBubble({ message, isOwnMessage, onImageClick }: MessageBubbleProps) {
  const hasAttachments = message.attachments && message.attachments.length > 0

  return (
    <div
      className={cn(
        'flex w-full mb-4',
        isOwnMessage ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2 break-words',
          isOwnMessage
            ? 'bg-tinedy-blue text-white rounded-br-none'
            : 'bg-gray-100 text-gray-900 rounded-bl-none'
        )}
      >
        {/* Message text */}
        {message.message && (
          <p className="text-sm whitespace-pre-wrap mb-1">{message.message}</p>
        )}

        {/* File attachments */}
        {hasAttachments && (
          <div className="space-y-2">
            {message.attachments!.map((attachment, index) => (
              <FileAttachment
                key={index}
                attachment={attachment}
                isOwnMessage={isOwnMessage}
                onImageClick={onImageClick}
              />
            ))}
          </div>
        )}

        {/* Timestamp and read status */}
        <div
          className={cn(
            'flex items-center justify-end gap-1 mt-1 text-xs',
            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
          )}
        >
          <span>{format(new Date(message.created_at), 'HH:mm')}</span>
          {isOwnMessage && (
            <span className="ml-1">
              {message.is_read ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
