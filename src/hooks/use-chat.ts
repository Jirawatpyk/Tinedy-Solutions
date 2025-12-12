import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import type { Message, Profile, Conversation, Attachment } from '@/types/chat'
import { RealtimeChannel } from '@supabase/supabase-js'
import { uploadChatFile, deleteChatFiles, extractStoragePathFromUrl } from '@/lib/chat-storage'
import { getSupabaseErrorMessage } from '@/lib/error-utils'
import { logger } from '@/lib/logger'

const MESSAGES_PER_PAGE = 50

export function useChat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const selectedUserRef = useRef<Profile | null>(null)
  const isLoadingConversationsRef = useRef(false)
  const prevMessagesLengthRef = useRef(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    selectedUserRef.current = selectedUser
  }, [selectedUser])

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
        logger.error('Error fetching users:', fetchError, { context: 'Chat' })
        setError(errorMsg)
        return []
      }

      setError(null) // Clear error on success
      return (profiles as Profile[]) || []
    } catch (err) {
      const errorMsg = getSupabaseErrorMessage(err)
      logger.error('Unexpected error fetching users:', err, { context: 'Chat' })
      setError(errorMsg)
      return []
    }
  }, [user])

  // Fetch messages for selected user (initial load - last N messages)
  const fetchMessages = useCallback(async (otherUserId: string, limit = MESSAGES_PER_PAGE) => {
    if (!user) return []

    // Clear messages and show loading immediately
    setIsLoadingMessages(true)
    setMessages([])

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
          attachments,
          sender:profiles!sender_id(id, full_name, email, role, avatar_url),
          recipient:profiles!recipient_id(id, full_name, email, role, avatar_url)
        `)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: false }) // Get latest first
        .limit(limit)

      if (fetchError) {
        const errorMsg = getSupabaseErrorMessage(fetchError)
        logger.error('Error fetching messages:', fetchError, { context: 'Chat' })
        setError(errorMsg)
        setIsLoadingMessages(false)
        return []
      }

      // Handle array response from Supabase join query
      const fetchedMessages = (data || []).map((msg: { sender: Profile | Profile[]; recipient: Profile | Profile[]; [key: string]: unknown }) => ({
        ...msg,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
        recipient: Array.isArray(msg.recipient) ? msg.recipient[0] : msg.recipient,
      })) as Message[]

      // Reverse to show oldest to newest (prepare all data before setting state)
      const messagesInOrder = fetchedMessages.reverse()

      // Set all states together AFTER processing is complete
      setMessages(messagesInOrder)
      setHasMoreMessages(fetchedMessages.length === limit)
      setError(null)
      setIsLoadingMessages(false)

      return messagesInOrder
    } catch (err) {
      const errorMsg = getSupabaseErrorMessage(err)
      logger.error('Unexpected error fetching messages:', err, { context: 'Chat' })
      setError(errorMsg)
      setIsLoadingMessages(false)
      return []
    }
  }, [user])

  // Load more older messages (for pagination)
  const loadMoreMessages = useCallback(async (otherUserId: string) => {
    if (!user || !hasMoreMessages || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      // Get the oldest message's timestamp
      const oldestMessage = messages[0]
      if (!oldestMessage) return

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          message,
          is_read,
          created_at,
          attachments,
          sender:profiles!sender_id(id, full_name, email, role, avatar_url),
          recipient:profiles!recipient_id(id, full_name, email, role, avatar_url)
        `)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE)

      if (fetchError) {
        logger.error('Error loading more messages:', fetchError, { context: 'Chat' })
        return
      }

      // Handle array response
      const olderMessages = (data || []).map((msg: { sender: Profile | Profile[]; recipient: Profile | Profile[]; [key: string]: unknown }) => ({
        ...msg,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
        recipient: Array.isArray(msg.recipient) ? msg.recipient[0] : msg.recipient,
      })) as Message[]

      // Reverse and prepend to existing messages
      const olderMessagesInOrder = olderMessages.reverse()

      setMessages((prev) => [...olderMessagesInOrder, ...prev])
      setHasMoreMessages(olderMessages.length === MESSAGES_PER_PAGE)
    } catch (err) {
      logger.error('Unexpected error loading more messages:', err, { context: 'Chat' })
    } finally {
      setIsLoadingMore(false)
    }
  }, [user, messages, hasMoreMessages, isLoadingMore])

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

      // Don't add to local state - let realtime subscription handle it
      // This ensures the message has proper profile data
      return data
    } catch (error) {
      logger.error('Error sending message:', error, { context: 'Chat' })
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
      logger.error('Error sending message with file:', error, { context: 'Chat' })
      throw error
    } finally {
      setIsSending(false)
    }
  }, [user, sendMessage])

  // Mark messages as read (Optimized for large batches)
  const markAsRead = useCallback(async (senderId: string, count: number) => {
    if (count === 0 || !user) return

    // OPTIMIZED: Use WHERE conditions instead of IN clause (much faster for 50+ messages)
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('sender_id', senderId)
      .eq('is_read', false)

    if (error) {
      logger.error('Error marking messages as read:', { error, count, senderId }, { context: 'Chat' })
    }
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
  const loadConversations = useCallback(async (showLoading = true) => {
    if (!user) return

    // Prevent concurrent loads
    if (isLoadingConversationsRef.current) {
      return
    }

    isLoadingConversationsRef.current = true

    // Only show loading indicator on initial load (use ref to check, not state)
    if (showLoading && prevMessagesLengthRef.current === 0) {
      setIsLoading(true)
    }

    try {
      // OPTIMIZATION: Get all messages with user info in ONE query instead of N queries
      const { data: allMessages, error: messagesError } = await supabase
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
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(500) // Limit to recent 500 messages for conversation list performance

      if (messagesError) {
        logger.error('Error fetching messages:', messagesError, { context: 'Chat' })
        return
      }

      // Group messages by conversation partner and calculate stats
      const conversationsMap = new Map<string, {
        user: Profile
        lastMessage: Message | null
        unreadCount: number
      }>()

      allMessages?.forEach((msg) => {
        // Handle array response from Supabase join query
        const message = {
          ...msg,
          sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
          recipient: Array.isArray(msg.recipient) ? msg.recipient[0] : msg.recipient,
        } as Message

        // Determine the other user (conversation partner)
        const isOutgoing = message.sender_id === user.id
        const otherUser = isOutgoing ? message.recipient : message.sender

        // Skip if otherUser is undefined (shouldn't happen with proper data)
        if (!otherUser) {
          return
        }

        const otherUserId = otherUser.id

        // Get or create conversation entry
        let conv = conversationsMap.get(otherUserId)
        if (!conv) {
          conv = {
            user: otherUser,
            lastMessage: null,
            unreadCount: 0,
          }
          conversationsMap.set(otherUserId, conv)
        }

        // Update last message (messages are already sorted by created_at desc)
        if (!conv.lastMessage) {
          conv.lastMessage = message
        }

        // Count unread messages (incoming only)
        if (message.recipient_id === user.id && !message.is_read) {
          conv.unreadCount++
        }
      })

      // Convert map to array and sort by last message time
      const activeConversations = Array.from(conversationsMap.values())
        .filter(conv => conv.lastMessage !== null)
        .sort((a, b) => {
          if (!a.lastMessage || !b.lastMessage) return 0
          return new Date(b.lastMessage.created_at).getTime() -
                 new Date(a.lastMessage.created_at).getTime()
        })

      // BEST PRACTICE: Merge with existing state to preserve optimistic updates
      // If a conversation's unreadCount is already 0 in state (user just opened it),
      // don't overwrite with database value (might be stale due to race condition)
      setConversations((prevConversations) => {
        const currentSelectedUser = selectedUserRef.current

        return activeConversations.map((newConv) => {
          const existingConv = prevConversations.find(
            (prev) => prev.user.id === newConv.user.id
          )

          // If this is the currently selected user and their unreadCount is 0,
          // keep it as 0 (optimistic update from opening conversation)
          if (currentSelectedUser &&
              newConv.user.id === currentSelectedUser.id &&
              existingConv?.unreadCount === 0) {
            return {
              ...newConv,
              unreadCount: 0
            }
          }

          return newConv
        })
      })
      prevMessagesLengthRef.current = activeConversations.length
    } catch (error) {
      logger.error('Error loading conversations:', error, { context: 'Chat' })
    } finally {
      setIsLoading(false)
      isLoadingConversationsRef.current = false
    }
  }, [user])

  // Delete conversation (all messages with a specific user)
  const deleteConversation = useCallback(async (otherUserId: string) => {
    if (!user) return

    // Store previous state for rollback on error (optimistic update pattern)
    const previousConversations = conversations
    const wasSelectedUser = selectedUser?.id === otherUserId

    try {
      // Optimistic update: Remove from UI immediately for better UX
      setConversations(prev => prev.filter(conv => conv.user.id !== otherUserId))

      // Clear selection if viewing deleted conversation
      if (wasSelectedUser) {
        setSelectedUser(null)
        setMessages([])
      }

      // Step 1: Fetch all messages with attachments before deleting
      const { data: messagesWithAttachments } = await supabase
        .from('messages')
        .select('attachments')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
        .not('attachments', 'is', null)

      // Step 2: Extract file paths from attachments and delete from storage
      if (messagesWithAttachments && messagesWithAttachments.length > 0) {
        const filePaths: string[] = []

        for (const msg of messagesWithAttachments) {
          const attachments = msg.attachments as Attachment[] | null
          if (attachments && Array.isArray(attachments)) {
            for (const attachment of attachments) {
              const path = extractStoragePathFromUrl(attachment.url)
              if (path) {
                filePaths.push(path)
              }
            }
          }
        }

        // Delete files from storage (best effort - don't fail if storage delete fails)
        if (filePaths.length > 0) {
          const deleteResult = await deleteChatFiles(filePaths)
          logger.info('Deleted chat attachments:', {
            deletedCount: deleteResult.deletedCount,
            totalFiles: filePaths.length
          }, { context: 'Chat' })
        }
      }

      // Step 3: Delete messages sent BY current user TO other user
      const { error: error1 } = await supabase
        .from('messages')
        .delete()
        .eq('sender_id', user.id)
        .eq('recipient_id', otherUserId)

      if (error1) throw error1

      // Step 4: Delete messages sent BY other user TO current user
      const { error: error2 } = await supabase
        .from('messages')
        .delete()
        .eq('sender_id', otherUserId)
        .eq('recipient_id', user.id)

      if (error2) throw error2

    } catch (error) {
      // Rollback on error: Restore previous state
      logger.error('Error deleting conversation:', { error, otherUserId }, { context: 'Chat' })
      setConversations(previousConversations)
      throw error
    }
  }, [user, selectedUser, conversations])

  // Start new chat with a user
  const startNewChat = useCallback(async (otherUser: Profile) => {
    setSelectedUser(otherUser)
    setMessages([])
  }, [])

  // Update conversation list locally without full reload
  const updateConversationLocally = useCallback(async (newMessage: Message) => {
    const otherUserId = newMessage.sender_id === user?.id
      ? newMessage.recipient_id
      : newMessage.sender_id

    setConversations((prevConversations) => {
      // Find existing conversation
      const existingConvIndex = prevConversations.findIndex(
        (conv) => conv.user.id === otherUserId
      )

      if (existingConvIndex >= 0) {
        // Update existing conversation
        const updatedConversations = [...prevConversations]
        const existingConv = updatedConversations[existingConvIndex]

        // Update last message and timestamp
        updatedConversations[existingConvIndex] = {
          ...existingConv,
          lastMessage: newMessage,
          // Update unread count only if it's an incoming message and not from selected user
          unreadCount: newMessage.recipient_id === user?.id &&
                       selectedUserRef.current?.id !== newMessage.sender_id
            ? existingConv.unreadCount + 1
            : existingConv.unreadCount
        }

        // Sort by last message time
        updatedConversations.sort((a, b) => {
          if (!a.lastMessage && !b.lastMessage) return 0
          if (!a.lastMessage) return 1
          if (!b.lastMessage) return -1
          return new Date(b.lastMessage.created_at).getTime() -
                 new Date(a.lastMessage.created_at).getTime()
        })

        return updatedConversations
      }

      // If conversation doesn't exist, it's a new conversation
      // We'll reload in the background but return current state immediately
      return prevConversations
    })

    // Check if conversation exists, if not reload (but don't block UI)
    setConversations((prevConversations) => {
      const exists = prevConversations.some((conv) => conv.user.id === otherUserId)
      if (!exists) {
        // IMPORTANT: Use showLoading=false to prevent overwriting current state
        setTimeout(() => loadConversations(false), 100)
      }
      return prevConversations
    })
  }, [user, loadConversations])

  // Setup real-time subscription
  useEffect(() => {
    if (!user) return

    let channel: RealtimeChannel

    const setupRealtimeSubscription = async () => {
      channel = supabase
        .channel('messages-channel')
        // Listen for ALL new messages (both incoming and outgoing)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            const newMessage = payload.new as Message
            const currentSelectedUser = selectedUserRef.current

            // Check if this message is relevant to me
            const isIncoming = newMessage.recipient_id === user.id
            const isOutgoing = newMessage.sender_id === user.id

            if (!isIncoming && !isOutgoing) {
              return
            }

            // Fetch full message data first
            let messageWithProfiles: Message | null = null
            try {
              const { data: fullMessage, error } = await supabase
                .from('messages')
                .select(`
                  id,
                  sender_id,
                  recipient_id,
                  message,
                  is_read,
                  created_at,
                  attachments,
                  sender:profiles!sender_id(id, full_name, email, role, avatar_url),
                  recipient:profiles!recipient_id(id, full_name, email, role, avatar_url)
                `)
                .eq('id', newMessage.id)
                .single()

              if (error) {
                logger.error('Error fetching full message:', error, { context: 'Chat' })
                return
              }

              // Handle array response from Supabase join query
              messageWithProfiles = {
                ...fullMessage,
                sender: Array.isArray(fullMessage.sender) ? fullMessage.sender[0] : fullMessage.sender,
                recipient: Array.isArray(fullMessage.recipient) ? fullMessage.recipient[0] : fullMessage.recipient,
              } as Message
            } catch (error) {
              logger.error('Error processing new message:', error, { context: 'Chat' })
              return
            }

            // Update conversation list locally (without full reload)
            updateConversationLocally(messageWithProfiles)

            // Determine if message should be added to current conversation
            let shouldAddToCurrentConversation = false
            let shouldMarkAsRead = false

            if (currentSelectedUser) {
              if (isIncoming && newMessage.sender_id === currentSelectedUser.id) {
                // Incoming message from currently selected user
                shouldAddToCurrentConversation = true
                shouldMarkAsRead = true
              } else if (isOutgoing && newMessage.recipient_id === currentSelectedUser.id) {
                // Outgoing message to currently selected user
                shouldAddToCurrentConversation = true
              }
            }

            if (shouldAddToCurrentConversation && messageWithProfiles) {
              setMessages((prev) => {
                // Check if message already exists
                const exists = prev.some(msg => msg.id === newMessage.id)
                if (exists) {
                  return prev
                }
                return [...prev, messageWithProfiles!]
              })

              // Auto mark as read if it's an incoming message
              if (shouldMarkAsRead) {
                await markAsRead(newMessage.sender_id, 1)
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const updatedMessage = payload.new as Message
            const oldMessage = payload.old as Message

            // If message was JUST marked as read (changed from false to true), update conversation's unread count
            // BUT: Only if this update is NOT from the currently selected user
            // (because we already optimistically updated it when opening the conversation)
            if (updatedMessage.is_read === true && oldMessage.is_read === false) {
              const currentSelectedUser = selectedUserRef.current
              const otherUserId = updatedMessage.sender_id === user.id
                ? updatedMessage.recipient_id
                : updatedMessage.sender_id

              // Skip if this is the currently selected user (already updated optimistically)
              if (currentSelectedUser && otherUserId === currentSelectedUser.id) {
                // Already updated optimistically
              } else {
                setConversations((prevConversations) => {
                  return prevConversations.map((conv) => {
                    if (conv.user.id === otherUserId && conv.unreadCount > 0) {
                      return {
                        ...conv,
                        unreadCount: Math.max(0, conv.unreadCount - 1)
                      }
                    }
                    return conv
                  })
                })
              }
            }

            // Update message in current conversation (for checkmarks)
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === updatedMessage.id
                  ? { ...msg, is_read: updatedMessage.is_read }
                  : msg
              )
            )
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
  }, [user, markAsRead, updateConversationLocally])

  // Load conversations on mount (run once)
  useEffect(() => {
    loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When selecting a user, fetch messages and mark as read
  useEffect(() => {
    if (selectedUser) {
      // BEST PRACTICE: Use startTransition for smooth UI
      // Show loading immediately and clear old messages
      setIsLoadingMessages(true)
      setHasMoreMessages(true)
      prevMessagesLengthRef.current = 0

      // Clear messages in next tick to ensure loading state is rendered first
      Promise.resolve().then(() => {
        setMessages([])

        // Fetch messages after clearing
        return fetchMessages(selectedUser.id)
      }).then(async () => {
        // Query unread count from database (not from fetchedMessages to avoid pagination issues)
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', user!.id)
          .eq('sender_id', selectedUser.id)
          .eq('is_read', false)

        if (unreadCount && unreadCount > 0) {
          // IMPORTANT: Update state FIRST (optimistic update)
          setConversations((prevConversations) => {
            return prevConversations.map((conv) => {
              if (conv.user.id === selectedUser.id) {
                return {
                  ...conv,
                  unreadCount: 0
                }
              }
              return conv
            })
          })

          // Then mark as read in database
          await markAsRead(selectedUser.id, unreadCount)

          // Dispatch event for sidebar to update badge immediately (optimistic)
          window.dispatchEvent(new CustomEvent('chat:messages-read', {
            detail: {
              senderId: selectedUser.id,
              count: unreadCount
            }
          }))

          // Also update messages state to show checkmarks
          setMessages((prev) =>
            prev.map((msg) =>
              msg.sender_id === selectedUser.id && !msg.is_read
                ? { ...msg, is_read: true }
                : msg
            )
          )
        }
      })
    } else {
      // Clear messages when no user selected
      setMessages([])
      setHasMoreMessages(true)
      setIsLoadingMessages(false)
    }
  }, [selectedUser, fetchMessages, markAsRead, user])

  return {
    messages,
    conversations,
    selectedUser,
    setSelectedUser,
    isLoading,
    isSending,
    isLoadingMessages,
    isLoadingMore,
    hasMoreMessages,
    error,
    sendMessage,
    sendMessageWithFile,
    loadMoreMessages,
    getTotalUnreadCount,
    loadConversations,
    deleteConversation,
    startNewChat,
    fetchUsers,
  }
}
