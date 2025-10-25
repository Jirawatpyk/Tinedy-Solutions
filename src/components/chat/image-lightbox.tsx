import { X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'

interface ImageLightboxProps {
  imageUrl: string
  imageName?: string
  isOpen: boolean
  onClose: () => void
}

export function ImageLightbox({ imageUrl, imageName, isOpen, onClose }: ImageLightboxProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-4 right-4 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Download button */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-4 right-16 text-white hover:bg-white/20"
        asChild
      >
        <a href={imageUrl} download={imageName} target="_blank" rel="noopener noreferrer">
          <Download className="h-6 w-6" />
        </a>
      </Button>

      {/* Image */}
      <div
        className="relative max-w-7xl max-h-[90vh] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={imageName || 'Image'}
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
        />
        {imageName && (
          <p className="text-white text-center mt-4 text-sm">{imageName}</p>
        )}
      </div>
    </div>
  )
}
