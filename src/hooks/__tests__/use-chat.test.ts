/**
 * Tests for useChat hook
 *
 * Complex hook testing covering:
 * - Message sending
 * - File uploads
 * - Error handling
 * - State management
 *
 * Note: Real-time subscription testing is limited due to Supabase channel complexity
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { Message, Profile, Attachment } from '@/types/chat'

// Mock dependencies BEFORE imports
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}))

vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/lib/chat-storage', () => ({
  uploadChatFile: vi.fn(),
}))

vi.mock('@/lib/error-utils', () => ({
  getSupabaseErrorMessage: vi.fn((error) => error?.message || 'Unknown error'),
}))

import { useChat } from '../use-chat'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { uploadChatFile } from '@/lib/chat-storage'

// Mock data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'Test User',
}

const mockOtherUser: Profile = {
  id: 'user-2',
  email: 'other@example.com',
  full_name: 'Other User',
  role: 'staff',
  avatar_url: undefined,
}

const mockMessage: Message = {
  id: 'msg-1',
  sender_id: 'user-1',
  recipient_id: 'user-2',
  message: 'Hello',
  is_read: false,
  created_at: new Date().toISOString(),
  attachments: [],
  sender: mockUser as Profile,
  recipient: mockOtherUser,
}

// Helper to create chainable query mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createQueryMock(finalResult: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
  }

  // Make all methods chainable
  Object.keys(query).forEach((key) => {
    if (key !== 'single') {
      query[key].mockReturnValue(query)
    }
  })

  return query
}

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default auth state
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as never,
      profile: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      refreshProfile: vi.fn(),
      loading: false,
    })

    // Default channel mock
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as never)

    // Default query mock
    const defaultQuery = createQueryMock({ data: [], error: null })
    vi.mocked(supabase.from).mockReturnValue(defaultQuery as never)
  })

  describe('Initial state', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useChat())

      expect(result.current.messages).toEqual([])
      expect(result.current.conversations).toEqual([])
      expect(result.current.selectedUser).toBeNull()
      expect(result.current.isSending).toBe(false)
    })

    it('should not crash when user is not authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        profile: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
        refreshProfile: vi.fn(),
        loading: false,
      })

      const { result } = renderHook(() => useChat())

      expect(result.current.messages).toEqual([])
      expect(result.current.conversations).toEqual([])
    })
  })

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const query = createQueryMock({ data: mockMessage, error: null })
      vi.mocked(supabase.from).mockReturnValue(query as never)

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('user-2', 'Hello')
      })

      expect(query.insert).toHaveBeenCalledWith({
        sender_id: 'user-1',
        recipient_id: 'user-2',
        message: 'Hello',
        attachments: [],
        is_read: false,
      })
    })

    it('should not send empty messages', async () => {
      const { result} = renderHook(() => useChat())

      // Clear any previous calls from initialization
      vi.mocked(supabase.from).mockClear()

      await act(async () => {
        await result.current.sendMessage('user-2', '   ')
      })

      // Should not have called supabase.from at all for empty message (early return)
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('should send empty text with attachments', async () => {
      const mockAttachment: Attachment = {
        name: 'file.txt',
        size: 1024,
        type: 'file' as const,
        url: 'https://example.com/file.txt',
        mimeType: 'text/plain',
      }

      const query = createQueryMock({ data: mockMessage, error: null })
      vi.mocked(supabase.from).mockReturnValue(query as never)

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('user-2', '', [mockAttachment])
      })

      expect(query.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '',
          attachments: [mockAttachment],
        })
      )
    })

    it('should handle send error', async () => {
      const query = createQueryMock({ data: null, error: new Error('Send failed') })
      vi.mocked(supabase.from).mockReturnValue(query as never)

      const { result } = renderHook(() => useChat())

      await expect(
        act(async () => {
          await result.current.sendMessage('user-2', 'Hello')
        })
      ).rejects.toThrow('Send failed')
    })
  })

  describe('sendMessageWithFile', () => {
    it('should upload file and send message', async () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      const mockAttachment: Attachment = {
        name: 'test.txt',
        size: 1024,
        type: 'file' as const,
        url: 'https://example.com/test.txt',
        mimeType: 'text/plain',
      }

      vi.mocked(uploadChatFile).mockResolvedValue({
        success: true,
        attachment: mockAttachment,
      })

      const query = createQueryMock({ data: mockMessage, error: null })
      vi.mocked(supabase.from).mockReturnValue(query as never)

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessageWithFile('user-2', 'Check this file', mockFile)
      })

      expect(uploadChatFile).toHaveBeenCalledWith(mockFile, 'user-1')
      expect(query.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Check this file',
          attachments: [mockAttachment],
        })
      )
    })

    it('should handle upload error', async () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })

      vi.mocked(uploadChatFile).mockResolvedValue({
        success: false,
        error: 'Upload failed',
      })

      const { result } = renderHook(() => useChat())

      await expect(
        act(async () => {
          await result.current.sendMessageWithFile('user-2', 'Check this file', mockFile)
        })
      ).rejects.toThrow('Upload failed')
    })

    it('should not send if user is not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        profile: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
        refreshProfile: vi.fn(),
        loading: false,
      })

      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessageWithFile('user-2', 'Check this file', mockFile)
      })

      expect(uploadChatFile).not.toHaveBeenCalled()
    })
  })

  describe('startNewChat', () => {
    it('should set selected user and clear messages', async () => {
      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.startNewChat(mockOtherUser)
      })

      expect(result.current.selectedUser).toEqual(mockOtherUser)
      expect(result.current.messages).toEqual([])
    })
  })

  describe('deleteConversation', () => {
    it('should delete messages', async () => {
      const query = createQueryMock({ error: null })
      vi.mocked(supabase.from).mockReturnValue(query as never)

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.deleteConversation('user-2')
      })

      expect(query.delete).toHaveBeenCalled()
      expect(query.or).toHaveBeenCalled()
    })

    it('should clear selection if deleting current conversation', async () => {
      const query = createQueryMock({ error: null })
      vi.mocked(supabase.from).mockReturnValue(query as never)

      const { result } = renderHook(() => useChat())

      // Set selected user first
      act(() => {
        result.current.setSelectedUser(mockOtherUser)
      })

      expect(result.current.selectedUser).toEqual(mockOtherUser)

      // Delete the conversation
      await act(async () => {
        await result.current.deleteConversation('user-2')
      })

      expect(result.current.selectedUser).toBeNull()
      expect(result.current.messages).toEqual([])
    })

    it('should throw on delete error', async () => {
      const query = createQueryMock({ error: { message: 'Delete failed' } })
      query.delete = vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Delete failed' }
        })
      })
      vi.mocked(supabase.from).mockReturnValue(query as never)

      const { result } = renderHook(() => useChat())

      await expect(
        act(async () => {
          await result.current.deleteConversation('user-2')
        })
      ).rejects.toThrow()
    })
  })

  describe('Real-time setup', () => {
    it('should setup channel on mount', () => {
      renderHook(() => useChat())

      expect(supabase.channel).toHaveBeenCalledWith('messages-channel')
    })

    it('should cleanup channel on unmount', () => {
      const { unmount } = renderHook(() => useChat())

      unmount()

      expect(supabase.removeChannel).toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should set error when fetchUsers fails', async () => {
      const query = createQueryMock({ data: null, error: { message: 'Fetch error' } })
      // Override order to return error properly
      query.order.mockReturnValue({ data: null, error: { message: 'Fetch error' } })
      vi.mocked(supabase.from).mockReturnValue(query as never)

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.fetchUsers()
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })

    it('should clear error on successful operation', async () => {
      // First set error
      const errorQuery = createQueryMock({ data: null, error: { message: 'Error' } })
      errorQuery.order.mockReturnValue({ data: null, error: { message: 'Error' } })
      vi.mocked(supabase.from).mockReturnValue(errorQuery as never)

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.fetchUsers()
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // Then success
      const successQuery = createQueryMock({ data: [mockOtherUser], error: null })
      successQuery.order.mockResolvedValue({ data: [mockOtherUser], error: null })
      vi.mocked(supabase.from).mockReturnValue(successQuery as never)

      await act(async () => {
        await result.current.fetchUsers()
      })

      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })
  })

  describe('fetchUsers', () => {
    it('should return empty array when not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        profile: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
        refreshProfile: vi.fn(),
        loading: false,
      })

      const { result } = renderHook(() => useChat())

      const users = await result.current.fetchUsers()

      expect(users).toEqual([])
    })

    it('should fetch users successfully', async () => {
      const query = createQueryMock({ data: [mockOtherUser], error: null })
      // Override order to return data properly
      query.order.mockResolvedValue({ data: [mockOtherUser], error: null })
      vi.mocked(supabase.from).mockReturnValue(query as never)

      const { result } = renderHook(() => useChat())

      let users: Profile[] = []
      await act(async () => {
        users = await result.current.fetchUsers()
      })

      expect(users).toEqual([mockOtherUser])
      expect(query.neq).toHaveBeenCalledWith('id', 'user-1')
    })
  })
})
