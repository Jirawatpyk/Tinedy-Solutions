import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback'
import { Search, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatRole } from '@/lib/role-utils'
import type { Profile } from '@/types/chat'

interface NewChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableUsers: Profile[]
  onSelectUser: (user: Profile) => void
  isLoading: boolean
}

export function NewChatModal({
  open,
  onOpenChange,
  availableUsers,
  onSelectUser,
  isLoading,
}: NewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>(availableUsers)

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(availableUsers)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredUsers(
        availableUsers.filter(
          (user) =>
            user.full_name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, availableUsers])

  const handleSelectUser = (user: Profile) => {
    onSelectUser(user)
    onOpenChange(false)
    setSearchQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start New Chat</DialogTitle>
          <DialogDescription>
            Select a user to start a conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* User List */}
          <div className="max-h-[400px] overflow-y-auto border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <p className="text-muted-foreground">
                  {searchQuery ? 'No users found' : 'No available users to start a chat'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={cn(
                      'w-full p-4 text-left hover:bg-accent/50 transition-colors',
                      'flex items-center gap-3'
                    )}
                  >
                    <AvatarWithFallback
                      src={user.avatar_url}
                      alt={user.full_name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.full_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {formatRole(user.role)}
                        </Badge>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
