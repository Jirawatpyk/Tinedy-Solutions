/**
 * Staff Layout Component
 *
 * Mobile-first layout for Staff Portal:
 * - Bottom navigation on mobile/tablet
 * - MainLayout (Sidebar + Header) on desktop for consistency with Admin
 */

import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/staff/bottom-nav'
import { MainLayout } from '@/components/layout/main-layout'
import { useMediaQuery } from '@/hooks/use-media-query'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export function StaffLayout() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  // Desktop: Use MainLayout (Sidebar + Header with notifications)
  if (isDesktop) {
    return <MainLayout />
  }

  // Mobile/Tablet: Use mobile-first layout with BottomNav
  // Use flex layout to ensure background fills viewport even with short content
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 flex flex-col pb-20">
        <Outlet />
      </main>

      {/* F8 fix: Wrap BottomNav in ErrorBoundary */}
      <ErrorBoundary fallback={null}>
        <BottomNav />
      </ErrorBoundary>
    </div>
  )
}
