import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Upload, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ProfileAvatarProps {
  avatarUrl: string | null
  userName: string
  onUpload: (file: File) => Promise<string | undefined>
  size?: 'sm' | 'md' | 'lg'
}

export function ProfileAvatar({ avatarUrl, userName, onUpload, size = 'lg' }: ProfileAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  }

  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      await onUpload(file)
      toast({
        title: 'Upload Successful',
        description: 'Your profile picture has been updated',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not upload image',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        {/* Avatar Circle */}
        <div
          className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center border-4 border-white shadow-lg`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white">
              <User className={iconSizes[size]} />
              <span className="text-lg font-bold mt-1">{getInitials(userName)}</span>
            </div>
          )}
        </div>

        {/* Upload Overlay */}
        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
          <Camera className="h-8 w-8 text-white" />
        </div>

        {/* Camera Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-white rounded-full p-2 shadow-lg transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="h-4 w-4" />
        </button>
      </div>

      {/* Upload Button */}
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        {uploading ? 'Uploading...' : 'Change Profile Picture'}
      </Button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File Requirements */}
      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG or WEBP (max 2MB)
      </p>
    </div>
  )
}
