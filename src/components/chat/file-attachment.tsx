import { Download, File, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize, isImageAttachment } from '@/lib/chat-storage'
import type { Attachment } from '@/types/chat'
import { useState } from 'react'

interface FileAttachmentProps {
  attachment: Attachment
  isOwnMessage: boolean
  onImageClick?: (url: string) => void
}

export function FileAttachment({ attachment, isOwnMessage, onImageClick }: FileAttachmentProps) {
  const [imageError, setImageError] = useState(false)
  const isImage = isImageAttachment(attachment)

  // For images: display inline
  if (isImage && !imageError) {
    return (
      <div className="mt-2">
        <button
          onClick={() => onImageClick?.(attachment.url)}
          className="group relative overflow-hidden rounded-lg border border-gray-200 hover:border-tinedy-blue transition-colors"
        >
          <img
            src={attachment.url}
            alt={attachment.name}
            className="max-w-xs max-h-64 object-cover cursor-pointer group-hover:opacity-90 transition-opacity"
            onError={() => setImageError(true)}
            loading="lazy"
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-2">
              <ImageIcon className="h-5 w-5 text-tinedy-blue" />
            </div>
          </div>
        </button>
        <p className="text-xs text-muted-foreground mt-1">{attachment.name}</p>
      </div>
    )
  }

  // For files or failed images: display as download link
  return (
    <div className="mt-2">
      <a
        href={attachment.url}
        download={attachment.name}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border transition-colors',
          isOwnMessage
            ? 'border-white/20 hover:bg-white/10'
            : 'border-gray-200 hover:bg-gray-50'
        )}
      >
        {/* File icon */}
        <div
          className={cn(
            'p-2 rounded-lg',
            isOwnMessage ? 'bg-white/20' : 'bg-tinedy-blue/10'
          )}
        >
          <File className={cn('h-5 w-5', isOwnMessage ? 'text-white' : 'text-tinedy-blue')} />
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-medium truncate',
              isOwnMessage ? 'text-white' : 'text-tinedy-dark'
            )}
          >
            {attachment.name}
          </p>
          <p
            className={cn(
              'text-xs',
              isOwnMessage ? 'text-white/70' : 'text-muted-foreground'
            )}
          >
            {formatFileSize(attachment.size)}
          </p>
        </div>

        {/* Download button */}
        <div
          className={cn(
            'h-8 w-8 flex items-center justify-center rounded-md transition-colors cursor-pointer',
            isOwnMessage
              ? 'hover:bg-white/20 text-white'
              : 'hover:bg-gray-100 text-tinedy-blue'
          )}
        >
          <Download className="h-4 w-4" />
        </div>
      </a>
    </div>
  )
}
