/**
 * ChangePasswordSheet Component
 *
 * Responsive sheet for changing password:
 * - Mobile: Slides from bottom
 * - Desktop: Slides from right
 * - Uses ResponsiveSheet for consistent styling
 */

import { useState } from 'react'
import { ResponsiveSheet } from '@/components/ui/responsive-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { mapErrorToUserMessage } from '@/lib/error-messages'

interface ChangePasswordSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChangePassword: (newPassword: string) => Promise<void>
}

export function ChangePasswordSheet({
  open,
  onOpenChange,
  onChangePassword,
}: ChangePasswordSheetProps) {
  const { toast } = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'Please enter the same password in both fields',
        variant: 'destructive',
      })
      return
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive',
      })
      return
    }

    // M5 fix: Stronger password validation
    const hasUpperCase = /[A-Z]/.test(newPassword)
    const hasLowerCase = /[a-z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      toast({
        title: 'Weak Password',
        description: 'Password must contain uppercase, lowercase, and numbers',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)
      await onChangePassword(newPassword)
      toast({
        title: 'Password Changed',
        description: 'Your password has been updated successfully',
      })
      setNewPassword('')
      setConfirmPassword('')
      onOpenChange(false)
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'general')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNewPassword('')
      setConfirmPassword('')
    }
    onOpenChange(newOpen)
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Change Password"
      description="Enter your new password below"
      icon={<Lock className="h-5 w-5" />}
      mobileHeight="h-auto max-h-[85vh]"
      desktopWidth="w-[400px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Min 8 characters with uppercase, lowercase, and number
          </p>
        </div>

        <Button
          type="submit"
          disabled={!newPassword || !confirmPassword || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Changing Password...' : 'Change Password'}
        </Button>
      </form>
    </ResponsiveSheet>
  )
}
