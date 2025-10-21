import { useState } from 'react'
import { useChat } from '@/hooks/use-chat'
import { useAuth } from '@/contexts/auth-context'
import { UserList } from '@/components/chat/user-list'
import { ChatArea } from '@/components/chat/chat-area'
import { NewChatModal } from '@/components/chat/new-chat-modal'
import { useToast } from '@/hooks/use-toast'
import type { Profile } from '@/types/chat'

export function AdminChat() {
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
    sendMessage,
    sendMessageWithFile,
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
        title: 'สำเร็จ',
        description: 'ลบการสนทนาเรียบร้อยแล้ว',
      })
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถลบการสนทนาได้ กรุณาลองใหม่อีกครั้ง',
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
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleSelectNewUser = (newUser: Profile) => {
    startNewChat(newUser)
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-tinedy-dark">Chat</h1>
        <p className="text-muted-foreground mt-1">Communicate with your team in real-time</p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* User List - Sidebar */}
        <div className="lg:col-span-4 h-full overflow-hidden">
          <UserList
            conversations={conversations}
            selectedUserId={selectedUser?.id || null}
            onSelectUser={handleSelectUser}
            onDeleteConversation={handleDeleteConversation}
            onNewChat={handleNewChat}
            isLoading={isLoading}
          />
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-8 h-full overflow-hidden">
          <ChatArea
            selectedUser={selectedUser}
            messages={messages}
            currentUserId={user?.id || ''}
            onSendMessage={handleSendMessage}
            isSending={isSending}
          />
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
