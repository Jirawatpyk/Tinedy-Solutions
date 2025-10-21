import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, User } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Conversation } from '@/types/chat'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface UserListProps {
  conversations: Conversation[]
  selectedUserId: string | null
  onSelectUser: (userId: string) => void
  isLoading: boolean
}

export function UserList({ conversations, selectedUserId, onSelectUser, isLoading }: UserListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredConversations = conversations.filter((conv) =>
    conv.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b pb-4">
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
      <CardContent className="p-0 flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <User className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No users found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.user.id}
                onClick={() => onSelectUser(conversation.user.id)}
                className={cn(
                  'w-full p-4 text-left hover:bg-accent/50 transition-colors',
                  selectedUserId === conversation.user.id && 'bg-accent'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-tinedy-blue/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-tinedy-blue" />
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                        <span className="text-xs text-white font-semibold">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
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
                      {conversation.lastMessage && (
                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                          {formatDistanceToNow(new Date(conversation.lastMessage.created_at), {
                            addSuffix: false,
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {conversation.user.role === 'admin' ? 'Admin' : 'Staff'}
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
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
