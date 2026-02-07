import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, User, Trash2, Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import type { Conversation } from '@/types/chat'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/EmptyState'
import { formatRole } from '@/lib/role-utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface UserListProps {
  conversations: Conversation[]
  selectedUserId: string | null
  onSelectUser: (userId: string) => void
  onDeleteConversation: (userId: string) => void
  onNewChat: () => void
  isLoading: boolean
  /** Hide the new chat button (when it's in header instead) */
  hideNewChatButton?: boolean
}

export function UserList({
  conversations,
  selectedUserId,
  onSelectUser,
  onDeleteConversation,
  onNewChat,
  isLoading,
  hideNewChatButton = false,
}: UserListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)

  const filteredConversations = conversations.filter((conv) =>
    conv.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDeleteClick = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setUserToDelete(userId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (userToDelete) {
      onDeleteConversation(userToDelete)
    }
    setDeleteDialogOpen(false)
    setUserToDelete(null)
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="border-b">
          <Skeleton className="h-10 w-full" />
        </CardHeader>
        <CardContent className="p-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="h-full flex flex-col lg:rounded-lg rounded-none lg:border border-0 border-b">
        <CardHeader className="border-b pb-4 space-y-3">
          {/* New Chat Button - can be hidden when it's in page header */}
          {!hideNewChatButton && (
            <Button
              onClick={onNewChat}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
      <CardContent className="p-0 max-h-[calc(100vh-280px)] overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <EmptyState
            icon={User}
            title={searchQuery ? 'No users found' : 'No conversations yet'}
            className="p-8"
          />
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.user.id}
                onClick={() => onSelectUser(conversation.user.id)}
                className={cn(
                  'group w-full p-4 text-left hover:bg-accent/50 transition-colors cursor-pointer',
                  selectedUserId === conversation.user.id && 'bg-accent'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <AvatarWithFallback
                      src={conversation.user.avatar_url}
                      alt={conversation.user.full_name}
                      size="md"
                    />
                    {/* Unread Count Badge */}
                    {conversation.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                        <span className="text-xs text-white font-semibold">
                          {conversation.unreadCount > 10 ? '10+' : conversation.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={cn(
                        'font-medium text-sm truncate',
                        conversation.unreadCount > 0 && 'font-semibold'
                      )}>
                        {conversation.user.full_name}
                      </p>
                      <div className="flex items-center gap-2">
                        {conversation.lastMessage && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDistanceToNow(new Date(conversation.lastMessage.created_at), {
                              addSuffix: false,
                            })}
                          </span>
                        )}
                        {/* Delete Button */}
                        <SimpleTooltip content="Delete chat">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(conversation.user.id, e)}
                            className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-1"
                            aria-label="Delete chat"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </SimpleTooltip>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {formatRole(conversation.user.role)}
                      </Badge>
                      {conversation.lastMessage && (
                        <p className={cn(
                          'text-xs text-muted-foreground truncate',
                          conversation.unreadCount > 0 && 'font-medium text-foreground'
                        )}>
                          {conversation.lastMessage.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
