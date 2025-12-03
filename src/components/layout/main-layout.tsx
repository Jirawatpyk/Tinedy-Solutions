import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { usePageMetadata } from '@/hooks/use-page-metadata'
import { useMediaQuery } from '@/hooks/use-media-query'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Get initial state from localStorage
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    return saved ? JSON.parse(saved) : false
  })

  // Responsive collapse logic
  // Mobile (< 1024px): Always show text when sidebar is open
  // Desktop (≥ 1024px): Respect user's collapse preference
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const effectiveCollapsed = isMobile ? false : isCollapsed

  // Get page metadata (automatically updates document.title)
  const { breadcrumbs } = usePageMetadata()

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  const toggleCollapse = () => {
    setIsCollapsed((prev: boolean) => {
      const newValue = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(newValue))
      return newValue
    })
  }

  return (
    <div className="flex h-screen bg-tinedy-off-white">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        isCollapsed={effectiveCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${effectiveCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Header onMenuClick={toggleSidebar} />

        <main className="flex-1 overflow-x-hidden overflow-y-auto flex flex-col">
          <div className="container mx-auto px-4 py-6 lg:px-6 lg:py-8 flex-1 flex flex-col">
            {/* Breadcrumbs navigation - hide on dashboard pages */}
            {breadcrumbs.length > 1 && (
              <div className="mb-4">
                <Breadcrumbs.Responsive items={breadcrumbs} />
              </div>
            )}

            {/* Page content */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
