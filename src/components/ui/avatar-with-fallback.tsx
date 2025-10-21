import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface AvatarWithFallbackProps {
  src?: string | null
  alt: string
  fallback?: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function AvatarWithFallback({
  src,
  alt,
  fallback,
  className,
  size = 'md',
}: AvatarWithFallbackProps) {
  // Generate initials from name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  }

  const initials = fallback || getInitials(alt)

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {src && <AvatarImage src={src} alt={alt} />}
      <AvatarFallback className="bg-tinedy-blue text-white font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
