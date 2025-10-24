import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import type { Message, Profile, Conversation, Attachment } from '@/types/chat'
import { RealtimeChannel } from '@supabase/supabase-js'
import { uploadChatFile } from '@/lib/chat-storage'
import { getSupabaseErrorMessage } from '@/lib/error-utils'

export function useChat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all users for conversation list
  const fetchUsers = useCallback(async () => {
    if (!user) return []

    try {
      const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url')
        .neq('id', user.id)
        .order('full_name')

      if (fetchError) {
        const errorMsg = getSupabaseErrorMessage(fetchError)
        console.error('Error fetching users:', fetchError)
        setError(errorMsg)
        return []
      }

      setError(null) // Clear error on success
      return (profiles as Profile[]) || []
    } catch (err) {
      const errorMsg = getSupabaseErrorMessage(err)
      console.error('Unexpected error fetching users:', err)
      setError(errorMsg)
      return []
    }
  }, [user])

  // Fetch messages for selected user
  const fetchMessages = useCallback(async (otherUserId: string) => {
    if (!user) return []

    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          message,
          is_read,
          created_at,
          sender:profiles!sender_id(id, full_name, email, role, avatar_url),
          recipient:profiles!recipient_id(id, full_name, email, role, avatar_url)
        `)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

      if (fetchError) {
        const errorMsg = getSupabaseErrorMessage(fetchError)
        console.error('Error fetching messages:', fetchError)
        setError(errorMsg)
        return []
      }

      // Handle array response from Supabase join query
      const fetchedMessages = (data || []).map((msg: { sender: Profile | Profile[]; recipient: Profile | Profile[]; [key: string]: unknown }) => ({
        ...msg,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
        recipient: Array.isArray(msg.recipient) ? msg.recipient[0] : msg.recipient,
      })) as Message[]

      setMessages(fetchedMessages)
      setError(null) // Clear error on success
      return fetchedMessages
    } catch (err) {
      const errorMsg = getSupabaseErrorMessage(err)
      console.error('Unexpected error fetching messages:', err)
      setError(errorMsg)
      return []
    }
  }, [user])

  // Send message (with optional attachments)
  const sendMessage = useCallback(async (
    recipientId: string,
    messageText: string,
    attachments?: Attachment[]
  ) => {
    if (!user || (!messageText.trim() && (!attachments || attachments.length === 0))) return

    setIsSending(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          message: messageText.trim() || '',
          attachments: attachments || [],
          is_read: false,
        })
        .select()
        .single()

      if (error) throw error

      // Add message to local state immediately
      setMessages((prev) => [...prev, data as Message])
      return data
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    } finally {
      setIsSending(false)
    }
  }, [user])

  // Upload file and send as attachment
  const sendMessageWithFile = useCallback(async (
    recipientId: string,
    messageText: string,
    file: File
  ) => {
    if (!user) return

    setIsSending(true)
    try {
      // Upload file first
      const uploadResult = await uploadChatFile(file, user.id)

      if (!uploadResult.success || !uploadResult.attachment) {
        throw new Error(uploadResult.error || 'Failed to upload file')
      }

      // Send message with attachment
      return await sendMessage(recipientId, messageText, [uploadResult.attachment])
    } catch (error) {
      console.error('Error sending message with file:', error)
      throw error
    } finally {
      setIsSending(false)
    }
  }, [user, sendMessage])

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', messageIds)

    if (error) {
      console.error('Error marking messages as read:', error)
    }
  }, [])

  // Get unread count for a specific user
  const getUnreadCount = useCallback(async (otherUserId: string) => {
    if (!user) return 0

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', otherUserId)
      .eq('recipient_id', user.id)
      .eq('is_read', false)

    return count || 0
  }, [user])

  // Get total unread count (for sidebar badge)
  const getTotalUnreadCount = useCallback(async () => {
    if (!user) return 0

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)

    return count || 0
  }, [user])

  // Load conversations with last message and unread counts
  const loadConversations = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const users = await fetchUsers()

      const conversationsWithData = await Promise.all(
        users.map(async (otherUser) => {
          // Get last message
          const { data: lastMessages } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUser.id}),and(sender_id.eq.${otherUser.id},recipient_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
            .limit(1)

          // Get unread count
          const unreadCount = await getUnreadCount(otherUser.id)

          return {
            user: otherUser,
            lastMessage: lastMessages && lastMessages.length > 0 ? (lastMessages[0] as Message) : null,
            unreadCount,
          }
        })
      )

      // Filter to show only conversations with messages
      const activeConversations = conversationsWithData.filter(conv => conv.lastMessage !== null)

      // Sort by last message time
      activeConversations.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0
        if (!a.lastMessage) return 1
        if (!b.lastMessage) return -1
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
      })

      setConversations(activeConversations)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, fetchUsers, getUnreadCount])

  // Delete conversation (all messages with a specific user)
  const deleteConversation = useCallback(async (otherUserId: string) => {
    if (!user) return

    try {
      // Delete all messages between current user and other user
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)

      if (error) throw error

      // If currently viewing deleted conversation, clear selection
      if (selectedUser?.id === otherUserId) {
        setSelectedUser(null)
        setMessages([])
      }

      // Reload conversations
      await loadConversations()
    } catch (error) {
      console.error('Error deleting conversation:', error)
      throw error
    }
  }, [user, selectedUser, loadConversations])

  // Start new chat with a user
  const startNewChat = useCallback(async (otherUser: Profile) => {
    setSelectedUser(otherUser)
    setMessages([])
  }, [])

  // Setup real-time subscription
  useEffect(() => {
    if (!user) return

    let channel: RealtimeChannel

    const setupRealtimeSubscription = async () => {
      channel = supabase
        .channel('messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            const newMessage = payload.new as Message

            // If message is for currently selected user, add to messages
            if (selectedUser && newMessage.sender_id === selectedUser.id) {
              setMessages((prev) => [...prev, newMessage])
              // Auto mark as read
              markAsRead([newMessage.id])
            }

            // Reload conversations to update last message and unread count
            loadConversations()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
          },
          () => {
            // Reload conversations when messages are marked as read
            loadConversations()
          }
        )
        .subscribe()
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [user, selectedUser, markAsRead, loadConversations])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // When selecting a user, fetch messages and mark as read
  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id).then(async (fetchedMessages) => {
        // Mark unread messages from this user as read
        const unreadMessages = fetchedMessages
          .filter((m: Message) => m.sender_id === selectedUser.id && !m.is_read)
          .map((m: Message) => m.id)

        if (unreadMessages.length > 0) {
          await markAsRead(unreadMessages)
          // Force reload conversations to update unread counts immediately
          loadConversations()
        }
      })
    }
  }, [selectedUser, fetchMessages, markAsRead, loadConversations])

  return {
    messages,
    conversations,
    selectedUser,
    setSelectedUser,
    isLoading,
    isSending,
    error,
    sendMessage,
    sendMessageWithFile,
    getTotalUnreadCount,
    loadConversations,
    deleteConversation,
    startNewChat,
    fetchUsers,
  }
}
