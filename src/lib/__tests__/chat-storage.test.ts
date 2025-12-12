import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractStoragePathFromUrl,
  deleteChatFiles,
  validateFile,
  formatFileSize,
  isImageAttachment,
} from '../chat-storage'
import { supabase } from '../supabase'
import type { Attachment } from '@/types/chat'

// Mock Supabase client
vi.mock('../supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
  },
}))

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('chat-storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extractStoragePathFromUrl', () => {
    const VALID_BASE_URL = 'https://xxx.supabase.co/storage/v1/object/public/chat-attachments/'

    describe('Valid URLs', () => {
      it('should extract storage path from valid Supabase URL', () => {
        const url = `${VALID_BASE_URL}user123/file.jpg`
        const result = extractStoragePathFromUrl(url)
        expect(result).toBe('user123/file.jpg')
      })

      it('should extract storage path with nested folders', () => {
        const url = `${VALID_BASE_URL}user123/folder1/folder2/file.pdf`
        const result = extractStoragePathFromUrl(url)
        expect(result).toBe('user123/folder1/folder2/file.pdf')
      })

      it('should handle special characters in filename', () => {
        const url = `${VALID_BASE_URL}user123/my-file_2024.01.01.jpg`
        const result = extractStoragePathFromUrl(url)
        expect(result).toBe('user123/my-file_2024.01.01.jpg')
      })
    })

    describe('Invalid URLs', () => {
      it('should return null for URL without bucket path', () => {
        const url = 'https://example.com/some/other/path.jpg'
        const result = extractStoragePathFromUrl(url)
        expect(result).toBeNull()
      })

      it('should return null for empty string', () => {
        const result = extractStoragePathFromUrl('')
        expect(result).toBeNull()
      })

      it('should return null for wrong bucket name', () => {
        const url = 'https://xxx.supabase.co/storage/v1/object/public/wrong-bucket/file.jpg'
        const result = extractStoragePathFromUrl(url)
        expect(result).toBeNull()
      })
    })
  })

  describe('deleteChatFiles', () => {
    const mockRemove = vi.fn()

    beforeEach(() => {
      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove,
      } as unknown as ReturnType<typeof supabase.storage.from>)
    })

    it('should successfully delete multiple files', async () => {
      mockRemove.mockResolvedValue({ data: {}, error: null })

      const result = await deleteChatFiles(['path1.jpg', 'path2.jpg'])

      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(2)
      expect(mockRemove).toHaveBeenCalledWith(['path1.jpg', 'path2.jpg'])
    })

    it('should return success with 0 count for empty array', async () => {
      const result = await deleteChatFiles([])

      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(0)
      expect(mockRemove).not.toHaveBeenCalled()
    })

    it('should return failure when Supabase returns error', async () => {
      mockRemove.mockResolvedValue({ data: null, error: { message: 'Error' } })

      const result = await deleteChatFiles(['path1.jpg'])

      expect(result.success).toBe(false)
      expect(result.deletedCount).toBe(0)
    })

    it('should handle exceptions gracefully', async () => {
      mockRemove.mockRejectedValue(new Error('Network error'))

      const result = await deleteChatFiles(['path1.jpg'])

      expect(result.success).toBe(false)
      expect(result.deletedCount).toBe(0)
    })
  })

  describe('validateFile', () => {
    it('should accept valid image file within size limit', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB

      const result = validateFile(file)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should accept valid PDF file', () => {
      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })
      Object.defineProperty(file, 'size', { value: 1024 * 1024 })

      const result = validateFile(file)

      expect(result.valid).toBe(true)
    })

    it('should reject file exceeding size limit', () => {
      const file = new File(['content'], 'large.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }) // 15MB

      const result = validateFile(file)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('less than')
    })

    it('should reject unsupported file type', () => {
      const file = new File(['content'], 'app.exe', { type: 'application/x-executable' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const result = validateFile(file)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
    })

    it('should accept PNG image', () => {
      const file = new File(['content'], 'image.png', { type: 'image/png' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const result = validateFile(file)

      expect(result.valid).toBe(true)
    })

    it('should accept GIF image', () => {
      const file = new File(['content'], 'image.gif', { type: 'image/gif' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const result = validateFile(file)

      expect(result.valid).toBe(true)
    })

    it('should accept WebP image', () => {
      const file = new File(['content'], 'image.webp', { type: 'image/webp' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const result = validateFile(file)

      expect(result.valid).toBe(true)
    })

    it('should accept text file', () => {
      const file = new File(['content'], 'notes.txt', { type: 'text/plain' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const result = validateFile(file)

      expect(result.valid).toBe(true)
    })
  })

  describe('formatFileSize', () => {
    it('should format 0 bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
    })

    it('should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 Bytes')
    })

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
    })

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
    })

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })

    it('should handle decimal values', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })
  })

  describe('isImageAttachment', () => {
    it('should return true for attachment with type "image"', () => {
      const attachment: Attachment = {
        type: 'image',
        url: 'https://example.com/image.jpg',
        name: 'image.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
      }

      expect(isImageAttachment(attachment)).toBe(true)
    })

    it('should return true for attachment with image mimeType', () => {
      const attachment: Attachment = {
        type: 'file',
        url: 'https://example.com/image.png',
        name: 'image.png',
        size: 1024,
        mimeType: 'image/png',
      }

      expect(isImageAttachment(attachment)).toBe(true)
    })

    it('should return false for PDF attachment', () => {
      const attachment: Attachment = {
        type: 'file',
        url: 'https://example.com/doc.pdf',
        name: 'doc.pdf',
        size: 1024,
        mimeType: 'application/pdf',
      }

      expect(isImageAttachment(attachment)).toBe(false)
    })

    it('should return false for text attachment', () => {
      const attachment: Attachment = {
        type: 'file',
        url: 'https://example.com/notes.txt',
        name: 'notes.txt',
        size: 1024,
        mimeType: 'text/plain',
      }

      expect(isImageAttachment(attachment)).toBe(false)
    })
  })
})
