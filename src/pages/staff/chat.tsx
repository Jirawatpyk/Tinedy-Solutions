import { useState } from 'react'
import { useChat } from '@/hooks/use-chat'
import { useAuth } from '@/contexts/auth-context'
import { UserList } from '@/components/chat/user-list'
import { ChatArea } from '@/components/chat/chat-area'
import { NewChatModal } from '@/components/chat/new-chat-modal'
import { useToast } from '@/hooks/use-toast'
import type { Profile } from '@/types/chat'

export function StaffChat() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [newChatModalOpen, setNewChatModalOpen] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  const {
    messages,
    conversations,
    selectedUser,
    setSelectedUser,
    isLoading,
    isSending,
    isLoadingMessages,
    isLoadingMore,
    hasMoreMessages,
    sendMessage,
    sendMessageWithFile,
    loadMoreMessages,
    deleteConversation,
    startNewChat,
    fetchUsers,
  } = useChat()

  const handleSelectUser = (userId: string) => {
    const user = conversations.find((c) => c.user.id === userId)
    if (user) {
      setSelectedUser(user.user)
    }
  }

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

  const handleDeleteConversation = async (userId: string) => {
    try {
      await deleteConversation(userId)
      toast({
        title: 'Success',
        description: 'Conversation deleted successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not delete conversation. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleNewChat = async () => {
    setIsLoadingUsers(true)
    try {
      const users = await fetchUsers()
      // Filter out users who already have conversations
      const conversationUserIds = conversations.map((c) => c.user.id)
      const usersWithoutConversation = users.filter(
        (u) => !conversationUserIds.includes(u.id)
      )
      setAvailableUsers(usersWithoutConversation)
      setNewChatModalOpen(true)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not load user list',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleSelectNewUser = (newUser: Profile) => {
    startNewChat(newUser)
  }

  const handleBackToList = () => {
    setSelectedUser(null)
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
      {/* Header - Same style as My Profile and My Calendar */}
      <div className={`bg-white border-b flex-shrink-0 ${selectedUser ? 'hidden lg:block' : 'block'}`}>
        <div className="px-4 sm:px-6 py-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Chat</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Communicate with your team in real-time
          </p>
        </div>
      </div>

      {/* Chat Container - Mobile: Stack, Desktop: Side by side */}
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-12rem)]">
          {/* User List - Sidebar: Hide on mobile when chat is selected */}
          <div className={`lg:col-span-4 h-full overflow-hidden ${selectedUser ? 'hidden lg:block' : 'block'}`}>
            <UserList
              conversations={conversations}
              selectedUserId={selectedUser?.id || null}
              onSelectUser={handleSelectUser}
              onDeleteConversation={handleDeleteConversation}
              onNewChat={handleNewChat}
              isLoading={isLoading}
            />
          </div>

          {/* Chat Area: Show fullscreen on mobile when selected, side-by-side on desktop */}
          <div className={`lg:col-span-8 h-full overflow-hidden ${selectedUser ? 'block' : 'hidden lg:block'}`}>
            <ChatArea
              selectedUser={selectedUser}
              messages={messages}
              currentUserId={user?.id || ''}
              onSendMessage={handleSendMessage}
              onLoadMore={() => selectedUser && loadMoreMessages(selectedUser.id)}
              onBack={handleBackToList}
              isSending={isSending}
              isLoadingMessages={isLoadingMessages}
              isLoadingMore={isLoadingMore}
              hasMoreMessages={hasMoreMessages}
            />
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        open={newChatModalOpen}
        onOpenChange={setNewChatModalOpen}
        availableUsers={availableUsers}
        onSelectUser={handleSelectNewUser}
        isLoading={isLoadingUsers}
      />
    </div>
  )
}
