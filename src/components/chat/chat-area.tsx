import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageCircle, Loader2, ArrowLeft } from 'lucide-react'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { ImageLightbox } from './image-lightbox'
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback'
import type { Message, Profile } from '@/types/chat'

interface ChatAreaProps {
  selectedUser: Profile | null
  messages: Message[]
  currentUserId: string
  onSendMessage: (message: string, file?: File) => void
  onLoadMore?: () => void
  onBack?: () => void
  isSending: boolean
  isLoadingMessages?: boolean
  isLoadingMore?: boolean
  hasMoreMessages?: boolean
}

export function ChatArea({
  selectedUser,
  messages,
  currentUserId,
  onSendMessage,
  onLoadMore,
  onBack,
  isSending,
  isLoadingMessages = false,
  isLoadingMore = false,
  hasMoreMessages = false,
}: ChatAreaProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [inputKey, setInputKey] = useState(0)

  // Handle scroll - with flex-col-reverse, scrollTop is negative when scrolling up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    // Load more when scrolling to top (old messages)
    // With flex-col-reverse, we need to check when scrolling up
    const isNearTop = container.scrollTop < 100

    if (isNearTop && hasMoreMessages && !isLoadingMore && onLoadMore) {
      onLoadMore()
    }
  }, [hasMoreMessages, isLoadingMore, onLoadMore])

  // Re-render input when user changes to trigger auto focus
  useEffect(() => {
    setInputKey((prev) => prev + 1)
  }, [selectedUser])

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
          {/* Back Button - Show only on mobile */}
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="lg:hidden shrink-0"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Avatar - Same as in list */}
          <div className="shrink-0">
            <AvatarWithFallback
              src={selectedUser.avatar_url}
              alt={selectedUser.full_name}
              size="md"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-tinedy-dark truncate">{selectedUser.full_name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {selectedUser.role === 'admin' ? 'Admin' : 'Staff'}
              </Badge>
              <span className="text-xs text-muted-foreground truncate">{selectedUser.email}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area - flex-col-reverse keeps scroll at bottom */}
      <CardContent
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col-reverse"
      >
        {isLoadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2 className="h-12 w-12 text-muted-foreground mb-3 animate-spin" />
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">Send a message to start the conversation</p>
          </div>
        ) : (
          <div className="space-y-2 space-y-reverse">
            {/* Load More Button - In DOM first, but appears at top visually due to flex-col-reverse */}
            {hasMoreMessages && (
              <div className="flex justify-center py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load older messages'
                  )}
                </Button>
              </div>
            )}

            {/* Messages in NORMAL order - flex-col-reverse will flip them visually */}
            {/* Array: old->new, Visual: new->old (bottom->top) which is correct */}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.sender_id === currentUserId}
                onImageClick={setLightboxImage}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Message Input */}
      <MessageInput key={inputKey} onSendMessage={onSendMessage} disabled={isSending} />

      {/* Image Lightbox */}
      <ImageLightbox
        imageUrl={lightboxImage || ''}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </Card>
  )
}
