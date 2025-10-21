// Chat System Types & Interfaces

export interface Attachment {
  type: 'image' | 'file'
  url: string
  name: string
  size: number
  mimeType: string
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  message: string
  is_read: boolean
  created_at: string
  attachments?: Attachment[]
  sender?: Profile
  recipient?: Profile
}

export interface Profile {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'staff'
  avatar_url?: string
  is_online?: boolean
}

export interface Conversation {
  user: Profile
  lastMessage: Message | null
  unreadCount: number
}

export interface ChatState {
  messages: Message[]
  conversations: Conversation[]
  selectedUser: Profile | null
  unreadCounts: Record<string, number>
  isLoading: boolean
  isSending: boolean
}
