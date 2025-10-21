import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, User } from 'lucide-react'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { ImageLightbox } from './image-lightbox'
import type { Message, Profile } from '@/types/chat'

interface ChatAreaProps {
  selectedUser: Profile | null
  messages: Message[]
  currentUserId: string
  onSendMessage: (message: string, file?: File) => void
  isSending: boolean
}

export function ChatArea({
  selectedUser,
  messages,
  currentUserId,
  onSendMessage,
  isSending,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!selectedUser) {
    return (
      <Card className="h-full flex flex-col items-center justify-center">
        <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-tinedy-dark mb-2">
          No conversation selected
        </h3>
        <p className="text-muted-foreground text-center max-w-md">
          Select a user from the list to start chatting
        </p>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Chat Header */}
      <CardHeader className="border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-tinedy-blue/10 flex items-center justify-center">
            <User className="h-5 w-5 text-tinedy-blue" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-tinedy-dark">{selectedUser.full_name}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {selectedUser.role === 'admin' ? 'Admin' : 'Staff'}
              </Badge>
              <span className="text-xs text-muted-foreground">{selectedUser.email}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">Send a message to start the conversation</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.sender_id === currentUserId}
                onImageClick={setLightboxImage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>

      {/* Message Input */}
      <MessageInput onSendMessage={onSendMessage} disabled={isSending} />

      {/* Image Lightbox */}
      <ImageLightbox
        imageUrl={lightboxImage || ''}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </Card>
  )
}
