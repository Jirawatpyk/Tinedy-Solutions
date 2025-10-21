import { useChat } from '@/hooks/use-chat'
import { useAuth } from '@/contexts/auth-context'
import { UserList } from '@/components/chat/user-list'
import { ChatArea } from '@/components/chat/chat-area'
import { useToast } from '@/hooks/use-toast'

export function AdminChat() {
  const { user } = useAuth()
  const { toast } = useToast()
  const {
    messages,
    conversations,
    selectedUser,
    setSelectedUser,
    isLoading,
    isSending,
    sendMessage,
    sendMessageWithFile,
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
    </div>
  )
}
