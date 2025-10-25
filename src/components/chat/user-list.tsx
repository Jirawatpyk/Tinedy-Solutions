import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, User, Trash2, Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback'
import type { Conversation } from '@/types/chat'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
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
}

export function UserList({
  conversations,
  selectedUserId,
  onSelectUser,
  onDeleteConversation,
  onNewChat,
  isLoading
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
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b pb-4 space-y-3">
          {/* New Chat Button */}
          <Button
            onClick={onNewChat}
            className="w-full"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            เริ่มแชทใหม่
          </Button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="ค้นหาผู้ใช้..."
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
              <div
                key={conversation.user.id}
                onClick={() => onSelectUser(conversation.user.id)}
                className={cn(
                  'group w-full p-4 text-left hover:bg-accent/50 transition-colors cursor-pointer',
                  selectedUserId === conversation.user.id && 'bg-accent'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar with Online Status */}
                  <div className="relative flex-shrink-0">
                    <AvatarWithFallback
                      src={conversation.user.avatar_url}
                      alt={conversation.user.full_name}
                      size="md"
                    />
                    {/* Online Status Indicator - green if online, gray if offline */}
                    <div className={cn(
                      "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white",
                      conversation.user.is_online ? "bg-green-500" : "bg-gray-400"
                    )} />
                    {/* Unread Count Badge */}
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
                      <div className="flex items-center gap-2">
                        {conversation.lastMessage && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDistanceToNow(new Date(conversation.lastMessage.created_at), {
                              addSuffix: false,
                            })}
                          </span>
                        )}
                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDeleteClick(conversation.user.id, e)}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-1"
                          title="ลบแชท"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
            <AlertDialogTitle>ยืนยันการลบแชท</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบการสนทนานี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              ลบแชท
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
