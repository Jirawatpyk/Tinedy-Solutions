/**
 * AppSheet — Standardized responsive slide-over sheet
 *
 * Wraps ResponsiveSheet with size presets (sm/md/lg) for consistent sizing
 * across all booking forms in the app.
 *
 * Size presets:
 * - sm: 380px desktop width
 * - md: 520px desktop width (default — booking create/edit)
 * - lg: 680px desktop width
 *
 * R10 (iOS Safari): Uses `dvh` (dynamic viewport height) instead of `vh`
 * to prevent content being hidden behind keyboard on iOS.
 *
 * WARNING: Do NOT render AppSheet inside another AppSheet.
 * Nested sheets cause z-index and scroll-lock conflicts.
 * Pattern: BookingDetailSheet [✏️ แก้ไข] → close detail first → open edit with 150ms delay.
 */

import { ResponsiveSheet } from '@/components/ui/responsive-sheet'

interface AppSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Width preset: sm=380px, md=520px (default), lg=680px */
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const SIZE_TO_WIDTH: Record<NonNullable<AppSheetProps['size']>, string> = {
  sm: 'w-[380px]',
  md: 'w-[520px]',
  lg: 'w-[680px]',
}

export function AppSheet({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
}: AppSheetProps) {
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      desktopWidth={SIZE_TO_WIDTH[size]}
      // R10: dvh adapts to actual visible viewport (accounts for iOS keyboard)
      mobileHeight="h-[85dvh]"
    >
      {children}
    </ResponsiveSheet>
  )
}
