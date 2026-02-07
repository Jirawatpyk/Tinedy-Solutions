/**
 * Staff Layout Component
 *
 * Unified responsive layout for Staff Portal:
 * - Mobile: BottomNav visible, Sidebar hidden
 * - Desktop: Sidebar visible, BottomNav hidden
 *
 * Single layout that adapts via CSS breakpoints.
 */

import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/staff/bottom-nav'
import { StaffSidebar } from '@/components/staff/staff-sidebar'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export function StaffLayout() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-tinedy-off-white/50">
      {/* Sidebar - Desktop only */}
      <StaffSidebar className="hidden lg:flex" />

      {/* Main content area */}
      <main className="flex-1 flex flex-col pb-20 lg:pb-0 min-h-0">
        <Outlet />
      </main>

      {/* BottomNav - Mobile/Tablet only (lg:hidden is in component) */}
      <ErrorBoundary fallback={null}>
        <BottomNav />
      </ErrorBoundary>
    </div>
  )
}
